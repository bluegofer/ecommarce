// apps/api/src/modules/hr/payroll.service.ts
// ============================================================
// A.5 CHAIN #3 - HR -> Attendance -> Payroll -> Accounts
// Payroll engine rules (all money = integer poisha):
//   workingDays = days in the month
//   perDay      = baseSalary / workingDays  (integer floor)
//   overtimePay = round(OT_minutes / 60 * overtimeRate)
//   gross       = base + allowances + overtimePay
//   leaveDed.   = perDay * unpaid leave days (currently ALL leave deducts;
//                 paid-leave policy becomes a DECISIONS.md item in Step 12)
//   absentDed.  = perDay * absent days
//   lateDed.    = 0 (no policy yet - placeholder)
//   totalDed.   = leaveDed + absentDed + lateDed + providentFund + tax + other
//   net         = gross - totalDed
// Idempotency: re-running a month replaces DRAFT payslips only;
//              POSTED/PAID runs cannot be regenerated.
// Auto-post: on markPaid -> balanced journal entry
//              Salaries Expense Dr / Cash-Bank-MFS Cr  (one per run)
// ============================================================
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { AttendanceService } from './attendance.service';
import type { GeneratePayrollInput } from '@ecommarce/types';

const MS_PER_DAY = 86400000;

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly attendance: AttendanceService,
  ) {}

  private async nextRunNumber(tx: Prisma.TransactionClient, year: number, month: number): Promise<string> {
    const tag = 'PR-' + year + String(month).padStart(2, '0') + '-';
    const c = await tx.payrollRun.count({ where: { runNumber: { startsWith: tag } } });
    return tag + String(c + 1).padStart(4, '0');
  }

  list(params: { year?: number; status?: string }) {
    const where: Prisma.PayrollRunWhereInput = {};
    if (params.year) where.year = params.year;
    if (params.status) where.status = params.status as any;
    return this.prisma.payrollRun.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: { payslips: true },
    });
  }

  async findById(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payslips: {
          include: { employee: { select: { employeeCode: true, fullName: true } } },
        },
      },
    });
    if (!run) throw new NotFoundException('Payroll run ' + id + ' not found');
    return run;
  }

  /** Generate (or regenerate DRAFT) a monthly payroll run. */
  generate(input: GeneratePayrollInput, createdById?: string) {
    if (input.month < 1 || input.month > 12) throw new BadRequestException('Invalid month');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.payrollRun.findUnique({
        where: { year_month: { year: input.year, month: input.month } },
      });
      if (existing && existing.status !== 'DRAFT') {
        throw new BadRequestException(
          'Payroll for ' + input.year + '-' + input.month + ' is already ' + existing.status,
        );
      }

      // Delete draft payslips (if any) and regenerate
      let runId: string;
      if (existing) {
        await tx.payslip.deleteMany({ where: { payrollRunId: existing.id } });
        runId = existing.id;
      } else {
        const runNumber = await this.nextRunNumber(tx, input.year, input.month);
        const created = await tx.payrollRun.create({
          data: {
            runNumber,
            year: input.year,
            month: input.month,
            status: 'DRAFT',
            createdById,
            notes: input.notes,
          },
        });
        runId = created.id;
      }

      // Fetch all active employees with a salary structure
      const employees = await tx.employee.findMany({
        where: { status: 'ACTIVE', salaryStructure: { isNot: null } },
        include: { salaryStructure: true },
      });

      const daysInMonth = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();

      let totalGross = 0;
      let totalNet = 0;

      for (const emp of employees) {
        const ss = emp.salaryStructure!;
        const summary = await this.attendance.monthlySummary(emp.id, input.year, input.month);

        const perDay = Math.floor(ss.baseSalary / daysInMonth);
        const allowances =
          ss.houseAllowance + ss.transportAllow + ss.medicalAllow + ss.otherAllowance;
        const overtimePay = Math.round((summary.overtimeMinutes / 60) * ss.overtimeRate);
        const grossSalary = ss.baseSalary + allowances + overtimePay;

        const leaveDeduction = perDay * summary.leaveDays;
        const absentDeduction = perDay * summary.absentDays;
        const lateDeduction = 0;
        const totalDeductions =
          leaveDeduction +
          absentDeduction +
          lateDeduction +
          ss.providentFund +
          ss.taxDeduction +
          ss.otherDeduction;
        const netSalary = grossSalary - totalDeductions;

        // Build payslipNumber: PS-YYYYMM-<employeeCode>
        const tag = 'PS-' + input.year + String(input.month).padStart(2, '0') + '-';
        const payslipNumber = tag + emp.employeeCode;

        await tx.payslip.create({
          data: {
            payslipNumber,
            payrollRunId: runId,
            employeeId: emp.id,
            totalDays: daysInMonth,
            presentDays: summary.presentDays,
            absentDays: summary.absentDays,
            lateDays: summary.lateDays,
            leaveDays: summary.leaveDays,
            overtimeMinutes: summary.overtimeMinutes,
            baseSalary: ss.baseSalary,
            allowances,
            overtimePay,
            grossSalary,
            leaveDeduction,
            absentDeduction,
            lateDeduction,
            providentFund: ss.providentFund,
            taxDeduction: ss.taxDeduction,
            otherDeduction: ss.otherDeduction,
            totalDeductions,
            netSalary,
          },
        });

        totalGross += grossSalary;
        totalNet += netSalary;
      }

      const updated = await tx.payrollRun.update({
        where: { id: runId },
        data: { totalGross, totalNet },
        include: { payslips: true },
      });
      return updated;
    });
  }

  /** Mark the run FINALIZED (draft payslips become immutable). */
  async finalize(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.findUnique({ where: { id } });
      if (!run) throw new NotFoundException('Payroll run ' + id + ' not found');
      if (run.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT runs can be finalized');
      }
      return tx.payrollRun.update({
        where: { id },
        data: { status: 'FINALIZED', finalizedAt: new Date() },
      });
    });
  }

  /**
   * Mark PAID - posts the balanced journal (A.5 chain #3):
   *   Salaries Expense Dr (5100-SALARY) / Cash-Bank-MFS Cr
   * Ledger account chosen by payment method arg (default MFS).
   */
  markPaid(id: string, method: 'CASH' | 'BANK' | 'MFS' = 'MFS') {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.findUnique({
        where: { id },
        include: { payslips: true },
      });
      if (!run) throw new NotFoundException('Payroll run ' + id + ' not found');
      if (run.status !== 'FINALIZED') {
        throw new BadRequestException('Only FINALIZED runs can be marked PAID');
      }
      if (run.payslips.length === 0) throw new BadRequestException('No payslips to pay');

      const salaryAcct = await tx.ledgerAccount.findUnique({ where: { code: '5100-SALARY' } });
      if (!salaryAcct) throw new BadRequestException('Ledger account 5100-SALARY not seeded');
      const debitCode = method === 'CASH' ? '1000-CASH' : method === 'BANK' ? '1010-BANK' : '1020-MFS';
      const creditAcct = await tx.ledgerAccount.findUnique({ where: { code: debitCode } });
      if (!creditAcct) throw new BadRequestException('Ledger account ' + debitCode + ' not seeded');

      const total = run.totalNet;
      const journal = await this.ledger.postEntry(
        {
          entryDate: new Date().toISOString(),
          description: 'Payroll ' + run.runNumber + ' salary payment',
          sourceType: 'PAYROLL',
          sourceId: run.id,
          lines: [
            { ledgerAccountId: salaryAcct.id, debit: total, credit: 0, description: 'Salaries expense' },
            { ledgerAccountId: creditAcct.id, debit: 0, credit: total, description: 'Payment out' },
          ],
        },
        { tx, status: 'POSTED' },
      );

      const updated = await tx.payrollRun.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          postedAt: new Date(),
          journalEntryId: journal.id,
        },
      });
      return { run: updated, journalEntryId: journal.id };
    });
  }

  /**
   * Employee performance feed (consumed by Step 12 analytics).
   * Aggregates: orders handled (via Order.assignedTo? no such column yet ->
   * placeholder 0), tickets handled (placeholder 0), attendance rate.
   */
  async employeePerformance(employeeId: string, from: string, to: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new NotFoundException('Employee ' + employeeId + ' not found');

    const records = await this.prisma.attendanceRecord.findMany({
      where: { employeeId, workDate: { gte: new Date(from), lte: new Date(to) } },
    });
    const totalDays = records.length || 1;
    const presentDays = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const attendanceRate = Math.round((presentDays / totalDays) * 10000) / 10000;

    return {
      employeeId,
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      period: { from, to },
      ordersHandled: 0,
      ticketsHandled: 0,
      attendanceRate,
      presentDays,
    };
  }
}