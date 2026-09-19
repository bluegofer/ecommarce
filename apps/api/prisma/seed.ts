import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedDefaultCoa } from '../src/modules/accounting/seeds/default-coa.seed';

const prisma = new PrismaClient();

const ROLES = [
  { code: 'SUPER_ADMIN', name: 'Super Admin', description: 'Full platform access - all modules, all actions' },
  { code: 'CATALOG_MANAGER', name: 'Catalog Manager', description: 'Products, categories, attributes, inventory, media' },
  { code: 'ORDER_SUPPORT', name: 'Order / Support Staff', description: 'Orders, courier, RMA, tickets, customer service' },
  { code: 'MARKETING_MANAGER', name: 'Marketing Manager', description: 'Promotions, coupons, flash sales, CMS, banners' },
  { code: 'FINANCE_READONLY', name: 'Finance (read-only)', description: 'Read-only access to payments, refunds, settlements, reports' },
  { code: 'FINANCE_MANAGER', name: 'Finance Manager', description: 'Write access to accounting, ledger, journal, payments' },
  { code: 'PURCHASE_MANAGER', name: 'Purchase Manager', description: 'Suppliers, purchase orders, GRN, invoices, supplier payments' },
  { code: 'STORE_POS_STAFF', name: 'Store / POS Staff', description: 'POS sales and returns at assigned branch (activated in Step 11)' },
  { code: 'HR_MANAGER', name: 'HR Manager', description: 'Employees, attendance, payroll (activated in Step 10)' },
] as const;

const PERMISSIONS = [
  { code: 'catalog.read', description: 'View catalog' },
  { code: 'catalog.write', description: 'Create/update catalog' },
  { code: 'catalog.delete', description: 'Delete catalog entries' },
  { code: 'inventory.read', description: 'View inventory' },
  { code: 'inventory.adjust', description: 'Adjust stock with reason' },
  { code: 'orders.read', description: 'View orders' },
  { code: 'orders.write', description: 'Update orders / transitions' },
  { code: 'orders.cancel', description: 'Cancel orders' },
  { code: 'payments.read', description: 'View payments' },
  { code: 'payments.refund', description: 'Issue refunds' },
  { code: 'promotions.read', description: 'View promotions' },
  { code: 'promotions.write', description: 'Manage promotions' },
  { code: 'cms.read', description: 'View CMS' },
  { code: 'cms.write', description: 'Manage CMS' },
  { code: 'customers.read', description: 'View customers' },
  { code: 'customers.write', description: 'Edit customers' },
  { code: 'reviews.moderate', description: 'Moderate reviews' },
  { code: 'rma.process', description: 'Process returns/tickets' },
  { code: 'reports.read', description: 'View reports' },
  { code: 'settings.read', description: 'View settings' },
  { code: 'settings.write', description: 'Edit settings' },
  { code: 'users.read', description: 'View staff users' },
  { code: 'users.write', description: 'Manage staff users' },
  // Step 9 additions (ERP)
  { code: 'accounting.read', description: 'View accounting / ledger / reports' },
  { code: 'accounting.write', description: 'Manage ledger accounts, income/expense' },
  { code: 'journal.post', description: 'Post or reverse journal entries' },
  { code: 'suppliers.read', description: 'View suppliers and payables' },
  { code: 'suppliers.write', description: 'Manage suppliers and record payments' },
  { code: 'purchase.read', description: 'View requisitions, POs, GRN, invoices' },
  { code: 'purchase.write', description: 'Create requisitions, POs, GRN, invoices' },
  { code: 'pos.sell', description: 'Ring up POS sales at assigned branch' },
  { code: 'pos.return', description: 'Process POS returns and exchanges' },
  { code: 'hr.read', description: 'View employees, attendance, payroll' },
  { code: 'hr.write', description: 'Manage employees, attendance, payroll' },
] as const;

async function seedRoles() {
  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: { ...r, isSystem: true },
    });
  }
  console.log(`Seeded ${ROLES.length} roles`);
}

async function seedPermissions() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description },
      create: p,
    });
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions`);
}

async function assignPermissionsToRoles() {
  const all = await prisma.permission.findMany();
  const roleMap = await prisma.role.findMany();
  const byCode = Object.fromEntries(roleMap.map((r) => [r.code, r.id]));
  const permByCode = Object.fromEntries(all.map((p) => [p.code, p.id]));

  const grants: Record<string, string[]> = {
    SUPER_ADMIN: all.map((p) => p.code),
    CATALOG_MANAGER: ['catalog.read', 'catalog.write', 'catalog.delete', 'inventory.read', 'inventory.adjust'],
    ORDER_SUPPORT: ['orders.read', 'orders.write', 'orders.cancel', 'rma.process', 'customers.read', 'customers.write'],
    MARKETING_MANAGER: ['promotions.read', 'promotions.write', 'cms.read', 'cms.write'],
    FINANCE_READONLY: ['payments.read', 'reports.read'],
    FINANCE_MANAGER: ['payments.read', 'payments.refund', 'reports.read', 'accounting.read', 'accounting.write', 'journal.post', 'suppliers.read', 'suppliers.write'],
    PURCHASE_MANAGER: ['suppliers.read', 'suppliers.write', 'purchase.read', 'purchase.write', 'inventory.read', 'accounting.read'],
    STORE_POS_STAFF: ['pos.sell', 'pos.return', 'inventory.read'],
    HR_MANAGER: ['hr.read', 'hr.write'],
  };

  for (const [roleCode, permCodes] of Object.entries(grants)) {
    for (const permCode of permCodes) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: byCode[roleCode], permissionId: permByCode[permCode] } },
        update: {},
        create: { roleId: byCode[roleCode], permissionId: permByCode[permCode] },
      });
    }
  }
  console.log('Assigned permissions to roles');
}

async function seedDemoAdmin() {
  const phone = '+8801700000000';
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    console.log('Demo admin already exists');
    return;
  }

  const passwordHash = await bcrypt.hash('ChangeMe!2026', 12);
  const superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });

  // Step 11: POS demo data (branches, registers, branch stock)
  await seedPosDemo(prisma);
  if (!superAdminRole) throw new Error('SUPER_ADMIN role missing');

  const admin = await prisma.user.create({
    data: {
      phone,
      email: 'admin@bluegofer.local',
      fullName: 'Demo Super Admin',
      passwordHash,
      phoneVerifiedAt: new Date(),
      notificationPrefs: { create: {} },
    },
  });

  await prisma.userRole.create({ data: { userId: admin.id, roleId: superAdminRole.id } });
  console.log(`Demo admin created: ${phone} / ChangeMe!2026`);
}

async function seedDefaultBranch() {
  const existing = await prisma.branch.findUnique({ where: { code: 'MAIN' } });
  if (existing) {
    console.log('Default branch already exists');
    return;
  }
  await prisma.branch.create({
    data: {
      code: 'MAIN',
      name: 'Main Branch',
      nameBn: 'প্রধান শাখা',
      isDefault: true,
      status: 'ACTIVE',
    },
  });
  console.log('Default branch created');
}

async function seedDemoSupplier() {
  const existing = await prisma.supplier.findUnique({ where: { code: 'DEMO-SUP-01' } });
  if (existing) {
    console.log('Demo supplier already exists');
    return;
  }
  await prisma.supplier.create({
    data: {
      code: 'DEMO-SUP-01',
      name: 'Demo Supplier Ltd.',
      contactPerson: 'Demo Contact',
      phone: '+8801700000001',
      email: 'supplier@bluegofer.local',
      paymentTerms: 'Net 15',
      openingBalance: 0,
      currentDue: 0,
      status: 'ACTIVE',
    },
  });
  console.log('Demo supplier created');
}

async function seedChartOfAccounts() {
  const result = await seedDefaultCoa(prisma);
  console.log(`COA seed: created=${result.created}, skipped=${result.skipped}`);
}

async function seedDepartmentsAndDesignations() {
  const depts = [
    { code: 'MGMT', name: 'Management', nameBn: 'ব্যবস্থাপনা' },
    { code: 'OPS',  name: 'Operations', nameBn: 'অপারেশনস' },
    { code: 'FIN',  name: 'Finance', nameBn: 'অর্থ' },
    { code: 'HR',   name: 'Human Resources', nameBn: 'এইচআর' },
    { code: 'SALES',name: 'Sales', nameBn: 'বিক্রয়' },
  ];
  for (const d of depts) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: d,
    });
  }
  const desigs = [
    { code: 'CEO',      name: 'CEO' },
    { code: 'MANAGER',  name: 'Manager' },
    { code: 'EXEC',     name: 'Executive' },
    { code: 'ACCT',     name: 'Accountant' },
    { code: 'CASHIER',  name: 'Cashier' },
    { code: 'RIDER',    name: 'Delivery Rider' },
  ];
  for (const d of desigs) {
    await prisma.designation.upsert({
      where: { code: d.code },
      update: {},
      create: d,
    });
  }
  console.log('Departments + designations seeded');
}

async function seedShifts() {
  const shifts = [
    { code: 'MORNING', name: 'Morning (9-6)', startTime: '09:00', endTime: '18:00', breakMins: 60 },
    { code: 'EVENING', name: 'Evening (2-11)', startTime: '14:00', endTime: '23:00', breakMins: 60 },
  ];
  for (const s of shifts) {
    await prisma.shift.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }
  console.log('Shifts seeded');
}

async function seedDemoEmployee() {
  const code = 'EMP-0001';
  const existing = await prisma.employee.findUnique({ where: { employeeCode: code } });
  if (existing) {
    console.log('Demo employee already exists');
    return;
  }
  const hrDept = await prisma.department.findUnique({ where: { code: 'MGMT' } });
  const managerDesig = await prisma.designation.findUnique({ where: { code: 'MANAGER' } });

  const emp = await prisma.employee.create({
    data: {
      employeeCode: code,
      fullName: 'Demo Manager',
      fullNameBn: 'ডেমো ম্যানেজার',
      phone: '+8801700000010',
      email: 'manager@bluegofer.local',
      joiningDate: new Date('2026-01-01'),
      departmentId: hrDept?.id,
      designationId: managerDesig?.id,
      status: 'ACTIVE',
      salaryStructure: {
        create: {
          baseSalary: 5_000_000,
          houseAllowance: 2_500_000,
          transportAllow: 1_000_000,
          medicalAllow: 500_000,
          otherAllowance: 0,
          providentFund: 0,
          taxDeduction: 0,
          otherDeduction: 0,
          overtimeRate: 15_000,
        },
      },
    },
  });
  console.log(`Demo employee created: ${emp.employeeCode}`);
}

async function main() {
  console.log('Seed starting...');
  await seedRoles();
  await seedPermissions();
  await assignPermissionsToRoles();
  await seedDemoAdmin();
  await seedChartOfAccounts();
  await seedDefaultBranch();
  await seedDemoSupplier();
  await seedDepartmentsAndDesignations();
  await seedShifts();
  await seedDemoEmployee();
  console.log('Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
// =====================================================================
// STEP 11 — POS demo seed (branches, registers, branch stock)
// Idempotent — safe to re-run.
// =====================================================================
async function seedPosDemo(prisma: PrismaClient) {
  // Marker so we don't duplicate
  const mainBranch = await prisma.branch.findUnique({ where: { code: 'MAIN' } });
  if (!mainBranch) {
    console.log('SKIP: MAIN branch not found; run base seed first');
    return;
  }

  // Ensure 2nd branch exists (Chittagong)
  let ctgBranch = await prisma.branch.findUnique({ where: { code: 'CTG' } });
  if (!ctgBranch) {
    ctgBranch = await prisma.branch.create({
      data: {
        code: 'CTG',
        name: 'Chittagong Branch',
        nameBn: 'চট্টগ্রাম শাখা',
        isDefault: false,
        status: 'ACTIVE',
      },
    });
    console.log('Created branch CTG');
  }

  // Registers: one per branch
  for (const branch of [mainBranch, ctgBranch]) {
    const existing = await prisma.register.findFirst({
      where: { branchId: branch.id },
    });
    if (!existing) {
      await prisma.register.create({
        data: {
          branchId: branch.id,
          name: `${branch.name} Counter 1`,
          isActive: true,
        },
      });
      console.log(`Created register for ${branch.code}`);
    }
  }

  // Seed branch stock: give every variant 100 units in MAIN, 20 in CTG
  const variants = await prisma.variant.findMany({ select: { id: true } });
  let created = 0;
  for (const v of variants) {
    for (const branch of [mainBranch, ctgBranch]) {
      const exists = await prisma.branchStock.findUnique({
        where: {
          branchId_variantId: { branchId: branch.id, variantId: v.id },
        },
      });
      if (!exists) {
        await prisma.branchStock.create({
          data: {
            branchId: branch.id,
            variantId: v.id,
            quantity: branch.code === 'MAIN' ? 100 : 20,
          },
        });
        created++;
      }
    }
  }
  console.log(`POS demo seed: ${created} branch_stock rows created`);

  // POS_DEMO_SEED_APPLIED
}

// Hook into main() — call after base seed
// (add the call in your existing main() function)