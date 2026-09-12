// apps/api/src/modules/hr/attendance.service.ts
// Attendance with manual + bulk + device intake interface.
// Device intake (AttendanceDeviceAdapter) is INTERFACE ONLY per workflow
// v2.0 ground rule #18 - actual fingerprint/face/RFID hardware integration
// is a separately-quoted future phase.
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  MarkAttendanceInput,
  BulkAttendanceInput,
  AttendanceSummaryDto,
  DeviceEventInput,
  CreateLeaveRequestInput,
  LeaveType,
} from '@ecommarce/types';

// Device intake shape - deliberately minimal so any vendor can normalize to it.
export interface NormalizedPunchEvent {
  employeeId: string;
  eventAt: Date;
  direction: 'IN' | 'OUT';
  deviceId?: string;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Day-start UTC of a given date (strips time-of-day). */
  private utcDate(d: Date | string): Date {
    const dt = typeof d === 'string' ? new Date(d) : d;
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  }

  /** Single mark (manual). Idempotent by (employeeId, workDate). */
  async mark(input: MarkAttendanceInput, recordedById?: string) {
    const workDate = this.utcDate(input.workDate);
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_workDate: { employeeId: input.employeeId, workDate } },
    });
    const data = {
      status: input.status,
      source: 'MANUAL' as const,
      checkInAt: input.checkInAt ? new Date(input.checkInAt) : null,
      checkOutAt: input.checkOutAt ? new Date(input.checkOutAt) : null,
      workedMinutes: input.workedMinutes ?? 0,
      overtimeMins: input.overtimeMins ?? 0,
      notes: input.notes,
      recordedById,
    };
    if (existing) {
      return this.prisma.attendanceRecord.update({ where: { id: existing.id }, data });
    }
    return this.prisma.attendanceRecord.create({
      data: { employeeId: input.employeeId, workDate, ...data },
    });
  }

  /** Bulk grid entry for a single day. */
  async bulkMark(input: BulkAttendanceInput, recordedById?: string) {
    const workDate = this.utcDate(input.workDate);
    const results = [];
    for (const row of input.records) {
      const r = await this.mark(
        {
          employeeId: row.employeeId,
          workDate: workDate.toISOString(),
          status: row.status,
          workedMinutes: row.workedMinutes,
          overtimeMins: row.overtimeMins,
          notes: row.notes,
        },
        recordedById,
      );
      results.push(r);
    }
    return { marked: results.length, workDate };
  }

  /** Monthly summary (feeds payroll). */
  async monthlySummary(employeeId: string, year: number, month: number): Promise<AttendanceSummaryDto> {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));
    const rows = await this.prisma.attendanceRecord.findMany({
      where: { employeeId, workDate: { gte: from, lt: to } },
    });
    let present = 0, absent = 0, late = 0, leave = 0, ot = 0;
    for (const r of rows) {
      if (r.status === 'PRESENT') present++;
      else if (r.status === 'ABSENT') absent++;
      else if (r.status === 'LATE') { late++; present++; }   // late counts as present day + late
      else if (r.status === 'LEAVE') leave++;
      ot += r.overtimeMins;
    }
    return {
      employeeId, year, month,
      totalDays: rows.length,
      presentDays: present,
      absentDays: absent,
      lateDays: late,
      leaveDays: leave,
      overtimeMinutes: ot,
    };
  }

  /** Raw list for a date range (admin grid). */
  listRange(params: { employeeId?: string; from: string; to: string }) {
    const where: Prisma.AttendanceRecordWhereInput = {
      workDate: { gte: this.utcDate(params.from), lt: this.utcDate(params.to) },
    };
    if (params.employeeId) where.employeeId = params.employeeId;
    return this.prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ workDate: 'desc' }, { employeeId: 'asc' }],
      include: { employee: { select: { employeeCode: true, fullName: true } } },
    });
  }

  /**
   * Device intake - accepts normalized punch events (interface only).
   * Idempotent: same (employeeId, workDate, direction) twice = no change.
   * A future step will plug a vendor adapter that normalizes vendor payloads
   * into NormalizedPunchEvent before calling this method.
   */
  async intakeDeviceEvents(events: DeviceEventInput[]): Promise<{ accepted: number; skipped: number }> {
    let accepted = 0;
    let skipped = 0;
    for (const ev of events) {
      const workDate = this.utcDate(ev.eventAt);
      const existing = await this.prisma.attendanceRecord.findUnique({
        where: { employeeId_workDate: { employeeId: ev.employeeId, workDate } },
      });
      if (existing) {
        // Merge: only update checkIn on first IN, checkOut on first OUT
        const data: Prisma.AttendanceRecordUpdateInput = { source: 'DEVICE' };
        if (ev.direction === 'IN' && !existing.checkInAt) data.checkInAt = new Date(ev.eventAt);
        if (ev.direction === 'OUT' && !existing.checkOutAt) data.checkOutAt = new Date(ev.eventAt);
        if (existing.checkInAt && existing.checkOutAt) {
          skipped++;
          continue;
        }
        await this.prisma.attendanceRecord.update({ where: { id: existing.id }, data });
        accepted++;
      } else {
        await this.prisma.attendanceRecord.create({
          data: {
            employeeId: ev.employeeId,
            workDate,
            status: 'PRESENT',
            source: 'DEVICE',
            checkInAt: ev.direction === 'IN' ? new Date(ev.eventAt) : null,
            checkOutAt: ev.direction === 'OUT' ? new Date(ev.eventAt) : null,
          },
        });
        accepted++;
      }
    }
    return { accepted, skipped };
  }

  // ---- Leave requests ----

  listLeaves(params: { employeeId?: string; status?: string }) {
    const where: Prisma.LeaveRequestWhereInput = {};
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status as any;
    return this.prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { employee: { select: { employeeCode: true, fullName: true } } },
    });
  }

  async createLeave(input: CreateLeaveRequestInput) {
    const from = new Date(input.fromDate);
    const to = new Date(input.toDate);
    if (to < from) throw new BadRequestException('toDate must be >= fromDate');
    const days = Math.max(1, Math.ceil((+to - +from) / 86400000) + 1);
    return this.prisma.leaveRequest.create({
      data: {
        employeeId: input.employeeId,
        type: input.type as LeaveType,
        fromDate: from,
        toDate: to,
        days,
        reason: input.reason,
        status: 'PENDING',
      },
    });
  }

  /** Approve or reject a leave request. On approve, marks attendance LEAVE for the range. */
  async decideLeave(id: string, decision: 'APPROVED' | 'REJECTED', approvedById?: string) {
    return this.prisma.$transaction(async (tx) => {
      const lr = await tx.leaveRequest.findUnique({ where: { id } });
      if (!lr) throw new NotFoundException('Leave request ' + id + ' not found');
      if (lr.status !== 'PENDING') throw new BadRequestException('Leave already decided');

      const updated = await tx.leaveRequest.update({
        where: { id },
        data: { status: decision, approvedById, approvedAt: new Date() },
      });

      if (decision === 'APPROVED') {
        // Mark each day in the range as LEAVE
        const cursor = new Date(lr.fromDate);
        while (cursor <= lr.toDate) {
          const workDate = this.utcDate(cursor);
          await tx.attendanceRecord.upsert({
            where: { employeeId_workDate: { employeeId: lr.employeeId, workDate } },
            update: { status: 'LEAVE', notes: 'Approved leave ' + lr.id },
            create: {
              employeeId: lr.employeeId,
              workDate,
              status: 'LEAVE',
              source: 'MANUAL',
              notes: 'Approved leave ' + lr.id,
            },
          });
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
      }
      return updated;
    });
  }
}