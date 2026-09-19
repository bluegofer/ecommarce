// apps/api/src/modules/hr/employees.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateEmployeeInput, UpdateEmployeeInput, UpsertSalaryStructureInput } from '@ecommarce/types';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { status?: string; departmentId?: string; q?: string; limit?: number; offset?: number }) {
    const where: Prisma.EmployeeWhereInput = {};
    if (params.status) where.status = params.status as any;
    if (params.departmentId) where.departmentId = params.departmentId;
    if (params.q) {
      where.OR = [
        { fullName: { contains: params.q, mode: 'insensitive' } },
        { employeeCode: { contains: params.q, mode: 'insensitive' } },
        { phone: { contains: params.q } },
      ];
    }
    return this.prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
      include: { department: true, designation: true, salaryStructure: true },
    });
  }

  async findById(id: string) {
    const e = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        designation: true,
        salaryStructure: true,
        shiftAssignments: { include: { shift: true } },
      },
    });
    if (!e) throw new NotFoundException('Employee ' + id + ' not found');
    return e;
  }

  async create(input: CreateEmployeeInput) {
    const exists = await this.prisma.employee.findUnique({
      where: { employeeCode: input.employeeCode },
    });
    if (exists) throw new BadRequestException('Employee code already exists');
    return this.prisma.employee.create({
      data: {
        employeeCode: input.employeeCode,
        userId: input.userId,
        fullName: input.fullName,
        fullNameBn: input.fullNameBn,
        phone: input.phone,
        email: input.email,
        nidNumber: input.nidNumber,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        joiningDate: new Date(input.joiningDate),
        departmentId: input.departmentId,
        designationId: input.designationId,
        address: input.address as any,
        emergencyContact: input.emergencyContact as any,
        bankAccount: input.bankAccount as any,
        notes: input.notes,
      },
      include: { department: true, designation: true },
    });
  }

  async update(id: string, input: UpdateEmployeeInput) {
    const e = await this.prisma.employee.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Employee ' + id + ' not found');
    return this.prisma.employee.update({
      where: { id },
      data: {
        fullName: input.fullName,
        fullNameBn: input.fullNameBn,
        phone: input.phone,
        email: input.email,
        nidNumber: input.nidNumber,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        resignationDate: input.resignationDate ? new Date(input.resignationDate) : undefined,
        departmentId: input.departmentId,
        designationId: input.designationId,
        status: input.status,
        address: input.address as any,
        emergencyContact: input.emergencyContact as any,
        bankAccount: input.bankAccount as any,
        notes: input.notes,
      },
    });
  }

  /** Idempotent upsert of the employee's salary structure. */
  async upsertSalaryStructure(input: UpsertSalaryStructureInput) {
    const emp = await this.prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!emp) throw new NotFoundException('Employee ' + input.employeeId + ' not found');
    const existing = await this.prisma.salaryStructure.findUnique({
      where: { employeeId: input.employeeId },
    });
    const payload = {
      baseSalary: input.baseSalary,
      houseAllowance: input.houseAllowance ?? 0,
      transportAllow: input.transportAllow ?? 0,
      medicalAllow: input.medicalAllow ?? 0,
      otherAllowance: input.otherAllowance ?? 0,
      providentFund: input.providentFund ?? 0,
      taxDeduction: input.taxDeduction ?? 0,
      otherDeduction: input.otherDeduction ?? 0,
      overtimeRate: input.overtimeRate ?? 0,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
      notes: input.notes,
    };
    if (existing) {
      return this.prisma.salaryStructure.update({ where: { id: existing.id }, data: payload });
    }
    return this.prisma.salaryStructure.create({
      data: { employeeId: input.employeeId, ...payload },
    });
  }
}