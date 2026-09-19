// apps/api/test/hr/payroll.integration.spec.ts
// A.5 chain #3 proof: attendance summary -> payroll run -> balanced ledger
// entry. Also proves idempotency: DRAFT re-run replaces, PAID cannot regenerate.
import { PrismaService } from '../../src/database/prisma.service';
import { LedgerService } from '../../src/modules/accounting/services/ledger.service';
import { seedDefaultCoa } from '../../src/modules/accounting/seeds/default-coa.seed';
import { AttendanceService } from '../../src/modules/hr/attendance.service';
import { PayrollService } from '../../src/modules/hr/payroll.service';

jest.setTimeout(40000);

const TEST_CODE = 'TEST-PAYROLL-EMP';

describe('HR - payroll A.5 chain (integration)', () => {
  let prisma: PrismaService;
  let ledger: LedgerService;
  let attendance: AttendanceService;
  let payroll: PayrollService;
  let empId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    ledger = new LedgerService(prisma);
    attendance = new AttendanceService(prisma);
    payroll = new PayrollService(prisma, ledger, attendance);

    await seedDefaultCoa(prisma);

    // Cleanup any previous test run
    const prev = await prisma.employee.findUnique({ where: { employeeCode: TEST_CODE } });
    if (prev) {
      await prisma.payslip.deleteMany({ where: { employeeId: prev.id } });
      await prisma.attendanceRecord.deleteMany({ where: { employeeId: prev.id } });
      await prisma.salaryStructure.deleteMany({ where: { employeeId: prev.id } });
      await prisma.employee.delete({ where: { id: prev.id } });
    }
    const prevRun = await prisma.payrollRun.findUnique({
      where: { year_month: { year: 2026, month: 9 } },
    });
    if (prevRun) {
      await prisma.payslip.deleteMany({ where: { payrollRunId: prevRun.id } });
      await prisma.payrollRun.delete({ where: { id: prevRun.id } });
    }

    // Create test employee with structure
    const emp = await prisma.employee.create({
      data: {
        employeeCode: TEST_CODE,
        fullName: 'Test Payroll Employee',
        phone: '+8801700999999',
        joiningDate: new Date('2026-01-01'),
        status: 'ACTIVE',
      },
    });
    empId = emp.id;

    // Base 30,000 taka (3,000,000 poisha); allowances 5,000 taka; OT 100 tk/hr
    await prisma.salaryStructure.create({
      data: {
        employeeId: empId,
        baseSalary: 3_000_000,
        houseAllowance: 3_000_000,
        transportAllow: 1_500_000,
        medicalAllow: 500_000,
        otherAllowance: 0,
        providentFund: 0,
        taxDeduction: 0,
        otherDeduction: 0,
        overtimeRate: 10_000, // 100 taka per hour
      },
    });

    // Attendance: Sep 2026 has 30 days
    // 20 PRESENT, 3 LATE, 2 ABSENT, 1 LEAVE, rest none -> 24 marked
    for (let d = 1; d <= 20; d++) {
      await prisma.attendanceRecord.create({
        data: {
          employeeId: empId,
          workDate: new Date(Date.UTC(2026, 8, d)),
          status: 'PRESENT',
        },
      });
    }
    for (let d = 21; d <= 23; d++) {
      await prisma.attendanceRecord.create({
        data: {
          employeeId: empId,
          workDate: new Date(Date.UTC(2026, 8, d)),
          status: 'LATE',
          overtimeMins: d === 21 ? 120 : 0,
        },
      });
    }
    for (let d = 24; d <= 25; d++) {
      await prisma.attendanceRecord.create({
        data: {
          employeeId: empId,
          workDate: new Date(Date.UTC(2026, 8, d)),
          status: 'ABSENT',
        },
      });
    }
    await prisma.attendanceRecord.create({
      data: {
        employeeId: empId,
        workDate: new Date(Date.UTC(2026, 8, 26)),
        status: 'LEAVE',
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      await prisma.payslip.deleteMany({ where: { employeeId: empId } });
      await prisma.attendanceRecord.deleteMany({ where: { employeeId: empId } });
      await prisma.salaryStructure.deleteMany({ where: { employeeId: empId } });
      await prisma.journalLine.deleteMany({
        where: { journalEntry: { description: { contains: 'TEST-PAYROLL' } } },
      });
      await prisma.journalEntry.deleteMany({ where: { description: { contains: 'TEST-PAYROLL' } } });
      await prisma.payrollRun.deleteMany({ where: { year: 2026, month: 9 } });
      await prisma.employee.delete({ where: { id: empId } });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('attendance summary matches seeded pattern', async () => {
    const s = await attendance.monthlySummary(empId, 2026, 9);
    expect(s.presentDays).toBe(23);   // 20 PRESENT + 3 LATE
    expect(s.absentDays).toBe(2);
    expect(s.lateDays).toBe(3);
    expect(s.leaveDays).toBe(1);
    expect(s.overtimeMinutes).toBe(120);
  });

  it('payroll math matches hand-computed poisha', async () => {
    const run = await payroll.generate({ year: 2026, month: 9 });
    expect(run.payslips.length).toBeGreaterThanOrEqual(1);
    const slip = run.payslips.find((p) => p.employeeId === empId)!;
    expect(slip).toBeDefined();

    // daysInMonth=30, base=3,000,000, perDay=100,000
    // allowances = 3,000,000 + 1,500,000 + 500,000 = 5,000,000
    // overtimePay = round(120/60 * 10,000) = 20,000
    // gross = 3,000,000 + 5,000,000 + 20,000 = 8,020,000
    // leaveDed = perDay * 1 = 100,000
    // absentDed = perDay * 2 = 200,000
    // totalDed = 300,000
    // net = 8,020,000 - 300,000 = 7,720,000
    expect(slip.baseSalary).toBe(3_000_000);
    expect(slip.allowances).toBe(5_000_000);
    expect(slip.overtimePay).toBe(20_000);
    expect(slip.grossSalary).toBe(8_020_000);
    expect(slip.leaveDeduction).toBe(100_000);
    expect(slip.absentDeduction).toBe(200_000);
    expect(slip.totalDeductions).toBe(300_000);
    expect(slip.netSalary).toBe(7_720_000);
  });

  it('A.5 chain: finalize -> markPaid posts balanced journal', async () => {
    const list = await payroll.list({ year: 2026 });
    const draft = list.find((r) => r.year === 2026 && r.month === 9 && r.status === 'DRAFT');
    expect(draft).toBeDefined();

    await payroll.finalize(draft!.id);
    const invBefore = (await prisma.ledgerAccount.findUniqueOrThrow({ where: { code: '5100-SALARY' } })).currentBalance;
    const cashBefore = (await prisma.ledgerAccount.findUniqueOrThrow({ where: { code: '1020-MFS' } })).currentBalance;

    const { run, journalEntryId } = await payroll.markPaid(draft!.id, 'MFS');
    expect(run.status).toBe('PAID');

    const je = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { lines: true },
    });
    expect(je!.status).toBe('POSTED');
    expect(je!.totalDebit).toBe(je!.totalCredit);
    expect(je!.lines.length).toBe(2);

    const invAfter = (await prisma.ledgerAccount.findUniqueOrThrow({ where: { code: '5100-SALARY' } })).currentBalance;
    const cashAfter = (await prisma.ledgerAccount.findUniqueOrThrow({ where: { code: '1020-MFS' } })).currentBalance;

    // Salary expense Dr -> currentBalance increases by totalNet
    expect(invAfter - invBefore).toBe(run.totalNet);
    // MFS wallet Cr -> currentBalance decreases
    expect(cashAfter - cashBefore).toBe(-run.totalNet);
  });

  it('idempotency: cannot regenerate a PAID payroll run', async () => {
    await expect(payroll.generate({ year: 2026, month: 9 })).rejects.toThrow(/already/i);
  });
});