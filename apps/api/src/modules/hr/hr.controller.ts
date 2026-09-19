// apps/api/src/modules/hr/hr.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DepartmentsService } from './departments.service';
import { EmployeesService } from './employees.service';
import { AttendanceService } from './attendance.service';
import { PayrollService } from './payroll.service';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  UpsertSalaryStructureInput,
  CreateDepartmentInput,
  CreateDesignationInput,
  CreateShiftInput,
  MarkAttendanceInput,
  BulkAttendanceInput,
  DeviceEventInput,
  CreateLeaveRequestInput,
  GeneratePayrollInput,
} from '@ecommarce/types';

@Controller('hr')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HrController {
  constructor(
    private readonly depts: DepartmentsService,
    private readonly emps: EmployeesService,
    private readonly att: AttendanceService,
    private readonly payroll: PayrollService,
  ) {}

  // ---- Departments / Designations / Shifts ----
  @Get('departments') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  listDepartments() { return this.depts.listDepartments(); }

  @Post('departments') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  createDepartment(@Body() body: CreateDepartmentInput) { return this.depts.createDepartment(body); }

  @Patch('departments/:id') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  updateDepartment(@Param('id') id: string, @Body() body: any) { return this.depts.updateDepartment(id, body); }

  @Get('designations') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  listDesignations() { return this.depts.listDesignations(); }

  @Post('designations') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  createDesignation(@Body() body: CreateDesignationInput) { return this.depts.createDesignation(body); }

  @Get('shifts') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  listShifts() { return this.depts.listShifts(); }

  @Post('shifts') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  createShift(@Body() body: CreateShiftInput) { return this.depts.createShift(body); }

  @Post('shifts/assign') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  assignShift(@Body() body: { employeeId: string; shiftId: string; fromDate: string; toDate?: string }) {
    return this.depts.assignShift(body.employeeId, body.shiftId, body.fromDate, body.toDate);
  }

  // ---- Employees ----
  @Get('employees') @Roles('SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_READONLY')
  listEmp(@Query() q: any) {
    return this.emps.list({
      status: q.status, departmentId: q.departmentId, q: q.q,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });
  }

  @Get('employees/:id') @Roles('SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_READONLY')
  getEmp(@Param('id') id: string) { return this.emps.findById(id); }

  @Post('employees') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  createEmp(@Body() body: CreateEmployeeInput) { return this.emps.create(body); }

  @Patch('employees/:id') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  updateEmp(@Param('id') id: string, @Body() body: UpdateEmployeeInput) { return this.emps.update(id, body); }

  @Post('employees/salary-structure') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  upsertSalary(@Body() body: UpsertSalaryStructureInput) { return this.emps.upsertSalaryStructure(body); }

  // ---- Attendance ----
  @Get('attendance') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  listAttendance(@Query() q: { employeeId?: string; from: string; to: string }) {
    return this.att.listRange(q);
  }

  @Post('attendance/mark') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  mark(@Body() body: MarkAttendanceInput, @CurrentUser() user: any) {
    return this.att.mark(body, user?.id);
  }

  @Post('attendance/bulk') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  bulk(@Body() body: BulkAttendanceInput, @CurrentUser() user: any) {
    return this.att.bulkMark(body, user?.id);
  }

  @Get('attendance/summary') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  summary(@Query() q: { employeeId: string; year: string; month: string }) {
    return this.att.monthlySummary(q.employeeId, parseInt(q.year, 10), parseInt(q.month, 10));
  }

  @Post('attendance/device-events') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  deviceEvents(@Body() body: { events: DeviceEventInput[] }) {
    return this.att.intakeDeviceEvents(body.events ?? []);
  }

  // ---- Leave ----
  @Get('leaves') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  listLeaves(@Query() q: any) { return this.att.listLeaves(q); }

  @Post('leaves') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  createLeave(@Body() body: CreateLeaveRequestInput) { return this.att.createLeave(body); }

  @Post('leaves/:id/decide') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  decideLeave(@Param('id') id: string, @Body() body: { decision: 'APPROVED' | 'REJECTED' }, @CurrentUser() user: any) {
    return this.att.decideLeave(id, body.decision, user?.id);
  }

  // ---- Payroll ----
  @Get('payroll') @Roles('SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_READONLY')
  listPayroll(@Query() q: any) {
    return this.payroll.list({
      year: q.year ? parseInt(q.year, 10) : undefined,
      status: q.status,
    });
  }

  @Get('payroll/:id') @Roles('SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_READONLY')
  getPayroll(@Param('id') id: string) { return this.payroll.findById(id); }

  @Post('payroll/generate') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  generatePayroll(@Body() body: GeneratePayrollInput, @CurrentUser() user: any) {
    return this.payroll.generate(body, user?.id);
  }

  @Post('payroll/:id/finalize') @Roles('SUPER_ADMIN', 'HR_MANAGER')
  finalizePayroll(@Param('id') id: string) { return this.payroll.finalize(id); }

  @Post('payroll/:id/pay') @Roles('SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER')
  payPayroll(@Param('id') id: string, @Body() body: { method?: 'CASH' | 'BANK' | 'MFS' }) {
    return this.payroll.markPaid(id, body.method ?? 'MFS');
  }

  @Get('employees/:id/performance') @Roles('SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_READONLY')
  empPerformance(@Param('id') id: string, @Query() q: { from: string; to: string }) {
    return this.payroll.employeePerformance(id, q.from, q.to);
  }
}