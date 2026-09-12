import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

async function main() {
  console.log('Seed starting...');
  await seedRoles();
  await seedPermissions();
  await assignPermissionsToRoles();
  await seedDemoAdmin();
  console.log('Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });