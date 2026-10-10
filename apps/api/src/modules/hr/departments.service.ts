// apps/api/src/modules/hr/departments.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CreateDepartmentInput, CreateDesignationInput, CreateShiftInput } from '@ecommarce/types';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Departments ----
  listDepartments() {
    return this.prisma.department.findMany({ orderBy: { code: 'asc' } });
  }

  async createDepartment(input: CreateDepartmentInput) {
    const exists = await this.prisma.department.findUnique({ where: { code: input.code } });
    if (exists) throw new BadRequestException('Department code ' + input.code + ' already exists');
    return this.prisma.department.create({ data: input });
  }

  async updateDepartment(id: string, input: Partial<CreateDepartmentInput> & { isActive?: boolean }) {
    const d = await this.prisma.department.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Department ' + id + ' not found');
    return this.prisma.department.update({ where: { id }, data: input });
  }

  // ---- Designations ----
  listDesignations() {
    return this.prisma.designation.findMany({ orderBy: { code: 'asc' } });
  }

  async createDesignation(input: CreateDesignationInput) {
    const exists = await this.prisma.designation.findUnique({ where: { code: input.code } });
    if (exists) throw new BadRequestException('Designation code ' + input.code + ' already exists');
    return this.prisma.designation.create({ data: input });
  }

  // ---- Shifts ----
  listShifts() {
    return this.prisma.shift.findMany({ orderBy: { code: 'asc' } });
  }

  async createShift(input: CreateShiftInput) {
    const exists = await this.prisma.shift.findUnique({ where: { code: input.code } });
    if (exists) throw new BadRequestException('Shift code ' + input.code + ' already exists');
    return this.prisma.shift.create({ data: { ...input, breakMins: input.breakMins ?? 60 } });
  }

  assignShift(employeeId: string, shiftId: string, fromDate: string, toDate?: string) {
    return this.prisma.employeeShiftAssignment.create({
      data: {
        employeeId,
        shiftId,
        fromDate: new Date(fromDate),
        toDate: toDate ? new Date(toDate) : null,
      },
    });
  }
}