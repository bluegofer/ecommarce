import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Resolve the COA seed module at runtime. Local dev has `src/`, but the
// production container only ships `dist/`. We try both candidate paths,
// and if neither resolves (e.g. a partial build) we return null so the
// rest of the seed still runs (roles, permissions, admin user).
// eslint-disable-next-line @typescript-eslint/no-var-requires
function loadSeedDefaultCoa():
  | ((prisma: PrismaClient) => Promise<{ created: number; skipped: number }>)
  | null {
  const candidates = [
    '../src/modules/accounting/seeds/default-coa.seed',
    '../dist/apps/api/src/modules/accounting/seeds/default-coa.seed.js',
  ];
  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(candidate);
      if (mod && typeof mod.seedDefaultCoa === 'function') {
        return mod.seedDefaultCoa as (
          prisma: PrismaClient,
        ) => Promise<{ created: number; skipped: number }>;
      }
    } catch {
      // Try the next candidate path
    }
  }
  return null;
}

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

/**
 * Seed the demo Super Admin.
 *
 * Idempotent on repeated runs:
 *  - If the user is missing, create it.
 *  - ALWAYS ensure the SUPER_ADMIN role is attached (fix for the case where
 *    the user was created without a role, which left every admin page
 *    returning 403 "Requires one of roles: SUPER_ADMIN, ...").
 */
async function seedDemoAdmin() {
  const phone = '+8801700000000';
  const passwordHash = await bcrypt.hash('ChangeMe!2026', 12);
  const superAdminRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
  if (!superAdminRole) throw new Error('SUPER_ADMIN role missing');

  // Step 11: POS demo data (branches, registers, branch stock) — idempotent
  await seedPosDemo(prisma);

  // Find the admin user by phone OR email (older seeds may have used one or the other).
  let admin =
    (await prisma.user.findUnique({ where: { phone } })) ??
    (await prisma.user.findUnique({ where: { email: 'admin@bluegofer.local' } }));

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        phone,
        email: 'admin@bluegofer.local',
        fullName: 'Demo Super Admin',
        passwordHash,
        phoneVerifiedAt: new Date(),
        notificationPrefs: { create: {} },
      },
    });
    console.log(`Demo admin created: ${phone} / ChangeMe!2026`);
  } else {
    console.log('Demo admin already exists — ensuring SUPER_ADMIN role is attached');
  }

  // ALWAYS ensure the role is attached (idempotent upsert).
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });
  console.log(`Demo admin has SUPER_ADMIN role: ${admin.id}`);
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
  const seedFn = loadSeedDefaultCoa();
  if (!seedFn) {
    console.log('SKIP: default-coa.seed module not found in this build');
    return;
  }
  const result = await seedFn(prisma);
  console.log(`COA seed: created=${result.created}, skipped=${result.skipped}`);
}

async function seedDepartmentsAndDesignations() {
  const depts = [
    { code: 'MGMT', name: 'Management', nameBn: 'ব্যবস্থাপনা' },
    { code: 'OPS', name: 'Operations', nameBn: 'অপারেশনস' },
    { code: 'FIN', name: 'Finance', nameBn: 'অর্থ' },
    { code: 'HR', name: 'Human Resources', nameBn: 'এইচআর' },
    { code: 'SALES', name: 'Sales', nameBn: 'বিক্রয়' },
  ];
  for (const d of depts) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: d,
    });
  }
  const desigs = [
    { code: 'CEO', name: 'CEO' },
    { code: 'MANAGER', name: 'Manager' },
    { code: 'EXEC', name: 'Executive' },
    { code: 'ACCT', name: 'Accountant' },
    { code: 'CASHIER', name: 'Cashier' },
    { code: 'RIDER', name: 'Delivery Rider' },
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

// =====================================================================
// Custom Phase 3.6 — CMS demo seed (idempotent, safe to re-run)
// =====================================================================
async function seedCmsDemo() {
  // --- Sections (homepage builder slots) ---
  const sections = [
    {
      key: 'home-hero',
      sectionType: 'hero',
      titleEn: 'Welcome to BlueGofer',
      titleBn: 'ব্লু গোফারে স্বাগতম',
      position: 0,
      config: {
        slides: [
          {
            imageUrl: '/placeholders/hero-1.svg',
            headlineEn: 'Shop Smart. Save More.',
            headlineBn: 'স্মার্ট শপিং, বেশি সাশ্রয়।',
            ctaEn: 'Shop Now',
            ctaBn: 'এখনই কিনুন',
            href: '/c',
          },
        ],
      },
      isVisible: true,
    },
    {
      key: 'home-categories',
      sectionType: 'category-grid',
      titleEn: 'Shop by Category',
      titleBn: 'ক্যাটাগরি অনুযায়ী কিনুন',
      position: 1,
      config: { categorySlugs: [] },
      isVisible: true,
    },
    {
      key: 'home-best-sellers',
      sectionType: 'best-sellers',
      titleEn: 'Best Sellers',
      titleBn: 'বেস্ট সেলার',
      position: 2,
      config: { limit: 8 },
      isVisible: true,
    },
  ];
  for (const s of sections) {
    await prisma.cmsSection.upsert({
      where: { key: s.key },
      update: {
        sectionType: s.sectionType,
        titleEn: s.titleEn,
        titleBn: s.titleBn,
        position: s.position,
        config: s.config as object,
        isVisible: s.isVisible,
      },
      create: {
        key: s.key,
        sectionType: s.sectionType,
        titleEn: s.titleEn,
        titleBn: s.titleBn,
        position: s.position,
        config: s.config as object,
        isVisible: s.isVisible,
      },
    });
  }
  console.log(`CMS sections seeded: ${sections.length}`);

  // --- Static pages ---
  const pages = [
    {
      slug: 'about-us',
      titleEn: 'About Us',
      titleBn: 'আমাদের সম্পর্কে',
      bodyEn: '<p>BlueGofer is a demo e-commerce storefront.</p>',
      bodyBn: '<p>ব্লু গোফার একটি ডেমো ই-কমার্স স্টোরফ্রন্ট।</p>',
    },
    {
      slug: 'contact-us',
      titleEn: 'Contact Us',
      titleBn: 'যোগাযোগ করুন',
      bodyEn: '<p>Reach us at support@nolimitshopping.com</p>',
      bodyBn: '<p>আমাদের সাথে যোগাযোগ: support@nolimitshopping.com</p>',
    },
    {
      slug: 'faq',
      titleEn: 'FAQ',
      titleBn: 'সাধারণ জিজ্ঞাসা',
      bodyEn: '<p>Frequently asked questions...</p>',
      bodyBn: '<p>প্রায়শই জিজ্ঞাসিত প্রশ্ন...</p>',
    },
  ];
  for (const p of pages) {
    const exists = await prisma.cmsPage.findUnique({ where: { slug: p.slug } });
    if (!exists) {
      await prisma.cmsPage.create({
        data: {
          slug: p.slug,
          titleEn: p.titleEn,
          titleBn: p.titleBn,
          bodyEn: p.bodyEn,
          bodyBn: p.bodyBn,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          currentRevision: 1,
          revisions: {
            create: {
              revisionNumber: 1,
              titleEn: p.titleEn,
              titleBn: p.titleBn,
              bodyEn: p.bodyEn,
              bodyBn: p.bodyBn,
            },
          },
        },
      });
    }
  }
  console.log(`CMS pages seeded: ${pages.length}`);

  // --- Header menu ---
  const headerMenu = await prisma.cmsMenu.upsert({
    where: { location: 'HEADER' },
    update: { name: 'Header' },
    create: { location: 'HEADER', name: 'Header' },
  });
  const headerCount = await prisma.cmsMenuItem.count({ where: { menuId: headerMenu.id } });
  if (headerCount === 0) {
    const headerItems = [
      { labelEn: 'Home', labelBn: 'হোম', url: '/', sortOrder: 0 },
      { labelEn: 'Shop', labelBn: 'শপ', url: '/c', sortOrder: 1 },
      { labelEn: 'Deals', labelBn: 'ডিল', url: '/deals', sortOrder: 2 },
      { labelEn: 'About', labelBn: 'আমাদের সম্পর্কে', url: '/pages/about-us', sortOrder: 3 },
      { labelEn: 'Contact', labelBn: 'যোগাযোগ', url: '/pages/contact-us', sortOrder: 4 },
    ];
    for (const it of headerItems) {
      await prisma.cmsMenuItem.create({ data: { menuId: headerMenu.id, ...it } });
    }
    console.log(`Header menu items seeded: ${headerItems.length}`);
  }

  // --- Footer menu ---
  const footerMenu = await prisma.cmsMenu.upsert({
    where: { location: 'FOOTER' },
    update: { name: 'Footer' },
    create: { location: 'FOOTER', name: 'Footer' },
  });
  const footerCount = await prisma.cmsMenuItem.count({ where: { menuId: footerMenu.id } });
  if (footerCount === 0) {
    const footerItems = [
      { labelEn: 'About Us', labelBn: 'আমাদের সম্পর্কে', url: '/pages/about-us', sortOrder: 0 },
      { labelEn: 'Contact Us', labelBn: 'যোগাযোগ', url: '/pages/contact-us', sortOrder: 1 },
      { labelEn: 'FAQ', labelBn: 'সাধারণ জিজ্ঞাসা', url: '/pages/faq', sortOrder: 2 },
      { labelEn: 'Privacy Policy', labelBn: 'প্রাইভেসি পলিসি', url: '/pages/privacy-policy', sortOrder: 3 },
      { labelEn: 'Terms', labelBn: 'শর্তাবলী', url: '/pages/terms', sortOrder: 4 },
    ];
    for (const it of footerItems) {
      await prisma.cmsMenuItem.create({ data: { menuId: footerMenu.id, ...it } });
    }
    console.log(`Footer menu items seeded: ${footerItems.length}`);
  }
}

// =====================================================================
// Custom Phase 3.7 — Demo RBAC users (idempotent, safe to re-run)
// Password for all demo users: ChangeMe!2026
// =====================================================================
async function seedDemoRoleUsers() {
  const passwordHash = await bcrypt.hash('ChangeMe!2026', 12);

  const demos: Array<{ phone: string; email: string; fullName: string; roleCode: string }> = [
    { phone: '+8801700000101', email: 'hr@bluegofer.local',        fullName: 'Demo HR Manager',        roleCode: 'HR_MANAGER' },
    { phone: '+8801700000102', email: 'finance@bluegofer.local',   fullName: 'Demo Finance Manager',   roleCode: 'FINANCE_MANAGER' },
    { phone: '+8801700000103', email: 'pos@bluegofer.local',       fullName: 'Demo POS Staff',         roleCode: 'STORE_POS_STAFF' },
    { phone: '+8801700000104', email: 'purchase@bluegofer.local',  fullName: 'Demo Purchase Manager',  roleCode: 'PURCHASE_MANAGER' },
    { phone: '+8801700000105', email: 'marketing@bluegofer.local', fullName: 'Demo Marketing Manager', roleCode: 'MARKETING_MANAGER' },
  ];

  for (const d of demos) {
    const role = await prisma.role.findUnique({ where: { code: d.roleCode } });
    if (!role) {
      console.log(`SKIP ${d.roleCode}: role not found`);
      continue;
    }
    let user = await prisma.user.findUnique({ where: { phone: d.phone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: d.phone,
          email: d.email,
          fullName: d.fullName,
          passwordHash,
          phoneVerifiedAt: new Date(),
          notificationPrefs: { create: {} },
        },
      });
      console.log(`Demo user created: ${d.email} (${d.roleCode})`);
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }
  console.log(`Demo RBAC users seeded: ${demos.length}`);
}

async function main() {
  console.log('Seed starting...');
  await seedRoles();
  await seedPermissions();
  await assignPermissionsToRoles();
  await seedDemoAdmin();
  // Allow skipping the accounting seed if the environment lacks the
  // compiled default-coa module (e.g. a partial build).
  if (process.env.SKIP_ACCOUNTING_SEED !== 'true') {
    await seedChartOfAccounts();
  } else {
    console.log('Skipping COA seed (SKIP_ACCOUNTING_SEED=true)');
  }
  await seedDefaultBranch();
  await seedDemoSupplier();
  await seedDepartmentsAndDesignations();
  await seedShifts();
  await seedDemoEmployee();
  await seedCmsDemo();
  await seedDemoRoleUsers();
  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// =====================================================================
// STEP 11 — POS demo seed (branches, registers, branch stock)
// Idempotent — safe to re-run.
// =====================================================================
async function seedPosDemo(prisma: PrismaClient) {
  const mainBranch = await prisma.branch.findUnique({ where: { code: 'MAIN' } });
  if (!mainBranch) {
    console.log('SKIP: MAIN branch not found; run base seed first');
    return;
  }

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
}