// packages/types/src/hr.ts
// HR, attendance, payroll DTOs. All money = integer poisha (BDT).

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HOLIDAY' | 'WEEKEND';
export type AttendanceSource = 'MANUAL' | 'DEVICE';
export type LeaveType = 'CASUAL' | 'SICK' | 'ANNUAL' | 'UNPAID' | 'MATERNITY' | 'OTHER';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PayrollRunStatus = 'DRAFT' | 'FINALIZED' | 'POSTED' | 'PAID' | 'CANCELLED';

// ---- Department / Designation ----
export interface DepartmentDto {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateDepartmentInput {
  code: string;
  name: string;
  nameBn?: string;
  description?: string;
}
export interface DesignationDto {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateDesignationInput {
  code: string;
  name: string;
  nameBn?: string;
  description?: string;
}

// ---- Employee ----
export interface EmployeeDto {
  id: string;
  employeeCode: string;
  userId: string | null;
  fullName: string;
  fullNameBn: string | null;
  phone: string;
  email: string | null;
  nidNumber: string | null;
  dateOfBirth: string | null;
  joiningDate: string;
  resignationDate: string | null;
  departmentId: string | null;
  designationId: string | null;
  status: EmploymentStatus;
  address: unknown | null;
  emergencyContact: unknown | null;
  bankAccount: unknown | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateEmployeeInput {
  employeeCode: string;
  userId?: string;
  fullName: string;
  fullNameBn?: string;
  phone: string;
  email?: string;
  nidNumber?: string;
  dateOfBirth?: string;
  joiningDate: string;
  departmentId?: string;
  designationId?: string;
  address?: unknown;
  emergencyContact?: unknown;
  bankAccount?: unknown;
  notes?: string;
}
export interface UpdateEmployeeInput {
  fullName?: string;
  fullNameBn?: string;
  phone?: string;
  email?: string;
  nidNumber?: string;
  dateOfBirth?: string;
  resignationDate?: string;
  departmentId?: string;
  designationId?: string;
  status?: EmploymentStatus;
  address?: unknown;
  emergencyContact?: unknown;
  bankAccount?: unknown;
  notes?: string;
}

// ---- Salary Structure ----
export interface SalaryStructureDto {
  id: string;
  employeeId: string;
  baseSalary: number;
  houseAllowance: number;
  transportAllow: number;
  medicalAllow: number;
  otherAllowance: number;
  providentFund: number;
  taxDeduction: number;
  otherDeduction: number;
  overtimeRate: number;
  effectiveFrom: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface UpsertSalaryStructureInput {
  employeeId: string;
  baseSalary: number;
  houseAllowance?: number;
  transportAllow?: number;
  medicalAllow?: number;
  otherAllowance?: number;
  providentFund?: number;
  taxDeduction?: number;
  otherDeduction?: number;
  overtimeRate?: number;
  effectiveFrom?: string;
  notes?: string;
}

// ---- Shift ----
export interface ShiftDto {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMins: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateShiftInput {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMins?: number;
}
export interface AssignShiftInput {
  employeeId: string;
  shiftId: string;
  fromDate: string;
  toDate?: string;
}

// ---- Attendance ----
export interface AttendanceRecordDto {
  id: string;
  employeeId: string;
  workDate: string;
  status: AttendanceStatus;
  source: AttendanceSource;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number;
  overtimeMins: number;
  notes: string | null;
  recordedById: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface MarkAttendanceInput {
  employeeId: string;
  workDate: string;
  status: AttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  workedMinutes?: number;
  overtimeMins?: number;
  notes?: string;
}
export interface BulkAttendanceInput {
  workDate: string;
  records: Array<{
    employeeId: string;
    status: AttendanceStatus;
    workedMinutes?: number;
    overtimeMins?: number;
    notes?: string;
  }>;
}
export interface AttendanceSummaryDto {
  employeeId: string;
  year: number;
  month: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  overtimeMinutes: number;
}
export interface DeviceEventInput {
  employeeId: string;
  eventAt: string;      // ISO datetime of the punch
  direction: 'IN' | 'OUT';
  deviceId?: string;
  rawPayload?: unknown;
}

// ---- Leave ----
export interface LeaveRequestDto {
  id: string;
  employeeId: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string | null;
  status: LeaveRequestStatus;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateLeaveRequestInput {
  employeeId: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  reason?: string;
}

// ---- Payroll ----
export interface PayrollRunDto {
  id: string;
  runNumber: string;
  year: number;
  month: number;
  status: PayrollRunStatus;
  totalGross: number;
  totalNet: number;
  journalEntryId: string | null;
  createdById: string | null;
  finalizedAt: string | null;
  postedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PayslipDto {
  id: string;
  payslipNumber: string;
  payrollRunId: string;
  employeeId: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  overtimeMinutes: number;
  baseSalary: number;
  allowances: number;
  overtimePay: number;
  grossSalary: number;
  leaveDeduction: number;
  absentDeduction: number;
  lateDeduction: number;
  providentFund: number;
  taxDeduction: number;
  otherDeduction: number;
  totalDeductions: number;
  netSalary: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface GeneratePayrollInput {
  year: number;
  month: number;
  notes?: string;
}

// ---- Employee Performance (analytics feed) ----
export interface EmployeePerformanceDto {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  period: { from: string; to: string };
  ordersHandled: number;
  ticketsHandled: number;
  attendanceRate: number;
  presentDays: number;
}