// apps/api/src/modules/hr/hr.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { DepartmentsService } from './departments.service';
import { EmployeesService } from './employees.service';
import { AttendanceService } from './attendance.service';
import { PayrollService } from './payroll.service';
import { HrController } from './hr.controller';

@Module({
  controllers: [HrController],
  providers: [
    PrismaService,
    LedgerService,
    DepartmentsService,
    EmployeesService,
    AttendanceService,
    PayrollService,
  ],
  exports: [EmployeesService, AttendanceService, PayrollService, DepartmentsService],
})
export class HrModule {}