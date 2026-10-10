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
    { code: 'ADMIN', name: 'Admin', description: 'Full platform access except SUPER_ADMIN-only actions' },
    { code: 'EDITOR', name: 'Editor', description: 'Content operations - CMS, promotions, reviews' },
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
      ADMIN: all.map((p) => p.code),
      EDITOR: ['catalog.read', 'cms.read', 'cms.write', 'promotions.read', 'promotions.write', 'reviews.moderate'],
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

/**
 * Step 17: CMS demo seed (TDD §6.4).
 *
 * Idempotent — safe to re-run. Creates:
 *  - 6 policy pages (About, Contact, FAQ, Privacy, Terms, Refund) with bn + en copy
 *  - HEADER + FOOTER + MOBILE menus with basic navigation items
 *  - Ensures the 3 homepage sections have visible titles + are not hidden
 *
 * Required for payment-gateway onboarding (TDD §6.4).
 */
async function seedCmsDemo() {
  // ---- 1. Policy pages ------------------------------------------------
  const pages = [
    {
      slug: 'about-us',
      titleEn: 'About Us',
      titleBn: 'আমাদের সম্পর্কে',
      bodyEn:
        '<p>[PLACEHOLDER] BlueGofer is a category-agnostic online marketplace. Replace this copy from the admin CMS once approved.</p>',
      bodyBn:
        '<p>[PLACEHOLDER] ব্লু-গোফার একটি ক্যাটাগরি-নিরপেক্ষ অনলাইন মার্কেটপ্লেস। অনুমোদিত হলে admin CMS থেকে এই লেখা পরিবর্তন করুন।</p>',
      metaTitle: 'About Us — BlueGofer',
      metaDescription: 'Learn about BlueGofer — our story, mission, and team.',
    },
    {
      slug: 'contact',
      titleEn: 'Contact',
      titleBn: 'যোগাযোগ',
      bodyEn:
        '<p>[PLACEHOLDER] Contact us at support@bluegofer.local — replace with real contact details in the admin CMS.</p>',
      bodyBn:
        '<p>[PLACEHOLDER] support@bluegofer.local এ যোগাযোগ করুন — admin CMS-এ আসল তথ্য দিন।</p>',
      metaTitle: 'Contact — BlueGofer',
      metaDescription: 'Get in touch with BlueGofer customer support.',
    },
    {
      slug: 'faq',
      titleEn: 'FAQ',
      titleBn: 'সাধারণ প্রশ্ন',
      bodyEn:
        '<p>[PLACEHOLDER] Frequently asked questions — add/edit Q&amp;A pairs from the admin CMS.</p>',
      bodyBn:
        '<p>[PLACEHOLDER] সাধারণ প্রশ্ন — admin CMS থেকে প্রশ্ন-উত্তর যোগ বা সম্পাদনা করুন।</p>',
      metaTitle: 'FAQ — BlueGofer',
      metaDescription: 'Answers to frequently asked questions about ordering, delivery, and returns.',
    },
    {
      slug: 'privacy-policy',
      titleEn: 'Privacy Policy',
      titleBn: 'গোপনীয়তা নীতি',
      bodyEn: '<p>[PLACEHOLDER] Privacy policy placeholder — required for payment-gateway onboarding.</p>',
      bodyBn: '<p>[PLACEHOLDER] গোপনীয়তা নীতি — পেমেন্ট-গেটওয়ে অনবোর্ডিংয়ের জন্য প্রয়োজন।</p>',
      metaTitle: 'Privacy Policy — BlueGofer',
      metaDescription: 'How BlueGofer collects, uses, and protects your personal data.',
    },
    {
      slug: 'terms-of-service',
      titleEn: 'Terms of Service',
      titleBn: 'সেবার শর্তাবলী',
      bodyEn: '<p>[PLACEHOLDER] Terms of service placeholder — required for payment-gateway onboarding.</p>',
      bodyBn: '<p>[PLACEHOLDER] সেবার শর্তাবলী — পেমেন্ট-গেটওয়ে অনবোর্ডিংয়ের জন্য প্রয়োজন।</p>',
      metaTitle: 'Terms of Service — BlueGofer',
      metaDescription: 'The terms that govern your use of the BlueGofer platform.',
    },
    {
      slug: 'refund-policy',
      titleEn: 'Refund & Return Policy',
      titleBn: 'ফেরত ও রিফান্ড নীতি',
      bodyEn:
        '<p>[PLACEHOLDER] 7-day return window per D-14. Details editable from the admin CMS.</p>',
      bodyBn:
        '<p>[PLACEHOLDER] D-14 অনুযায়ী ৭ দিনের রিটার্ন উইন্ডো। admin CMS থেকে সম্পাদনাযোগ্য।</p>',
      metaTitle: 'Refund & Return Policy — BlueGofer',
      metaDescription: 'Understand our 7-day return and refund process.',
    },
    {
      slug: 'shipping-policy',
      titleEn: 'Shipping & Delivery Policy',
      titleBn: 'শিপিং ও ডেলিভারি নীতি',
      bodyEn:
        '<p>[PLACEHOLDER] Inside Dhaka: 60 BDT / 2-3 days. Outside Dhaka: 120 BDT / 3-5 days. Free over 1,500 BDT (D-10, D-12). Editable from the admin CMS.</p>',
      bodyBn:
        '<p>[PLACEHOLDER] ঢাকার ভিতরে: ৬০ টাকা / ২-৩ দিন। ঢাকার বাইরে: ১২০ টাকা / ৩-৫ দিন। ১,৫০০ টাকার উপরে ফ্রি (D-10, D-12)। admin CMS থেকে সম্পাদনাযোগ্য।</p>',
      metaTitle: 'Shipping & Delivery Policy — BlueGofer',
      metaDescription: 'Delivery charges, zones, and estimated timelines for Bangladesh.',
    },
  ];

  let pagesCreated = 0;
  for (const p of pages) {
    const existing = await prisma.cmsPage.findUnique({ where: { slug: p.slug } });
    if (existing) continue;

    await prisma.cmsPage.create({
      data: {
        slug: p.slug,
        titleEn: p.titleEn,
        titleBn: p.titleBn,
        bodyEn: p.bodyEn,
        bodyBn: p.bodyBn,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
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
    pagesCreated++;
  }
  console.log(`CMS seed: ${pagesCreated} pages created`);

  // ---- 2. HEADER menu + items ----------------------------------------
  const headerMenu = await prisma.cmsMenu.upsert({
    where: { location: 'HEADER' },
    create: { location: 'HEADER', name: 'Main header' },
    update: {},
  });

  const headerItems = [
    { labelEn: 'Home', labelBn: 'হোম', url: '/', sortOrder: 0 },
    { labelEn: 'Deals', labelBn: 'ডিল', url: '/deals', sortOrder: 1 },
    { labelEn: 'Contact', labelBn: 'যোগাযোগ', url: '/pages/contact', sortOrder: 2 },
    { labelEn: 'About', labelBn: 'সম্পর্কে', url: '/pages/about-us', sortOrder: 3 },
  ];

  let headerItemsCreated = 0;
  for (const it of headerItems) {
    const exists = await prisma.cmsMenuItem.findFirst({
      where: { menuId: headerMenu.id, labelEn: it.labelEn },
    });
    if (exists) continue;
    await prisma.cmsMenuItem.create({
      data: {
        menuId: headerMenu.id,
        parentId: null,
        labelEn: it.labelEn,
        labelBn: it.labelBn,
        url: it.url,
        sortOrder: it.sortOrder,
        isActive: true,
      },
    });
    headerItemsCreated++;
  }
  console.log(`CMS seed: ${headerItemsCreated} HEADER items created`);

  // ---- 3. FOOTER menu + items ----------------------------------------
  const footerMenu = await prisma.cmsMenu.upsert({
    where: { location: 'FOOTER' },
    create: { location: 'FOOTER', name: 'Footer links' },
    update: {},
  });

  const footerItems = [
    { labelEn: 'About Us', labelBn: 'আমাদের সম্পর্কে', url: '/pages/about-us', sortOrder: 0 },
    { labelEn: 'Contact', labelBn: 'যোগাযোগ', url: '/pages/contact', sortOrder: 1 },
    { labelEn: 'FAQ', labelBn: 'সাধারণ প্রশ্ন', url: '/pages/faq', sortOrder: 2 },
    { labelEn: 'Privacy Policy', labelBn: 'গোপনীয়তা নীতি', url: '/pages/privacy-policy', sortOrder: 3 },
    { labelEn: 'Terms of Service', labelBn: 'সেবার শর্তাবলী', url: '/pages/terms-of-service', sortOrder: 4 },
    { labelEn: 'Refund Policy', labelBn: 'ফেরত নীতি', url: '/pages/refund-policy', sortOrder: 5 },
    { labelEn: 'Shipping Policy', labelBn: 'শিপিং নীতি', url: '/pages/shipping-policy', sortOrder: 6 },
  ];

  let footerItemsCreated = 0;
  for (const it of footerItems) {
    const exists = await prisma.cmsMenuItem.findFirst({
      where: { menuId: footerMenu.id, labelEn: it.labelEn },
    });
    if (exists) continue;
    await prisma.cmsMenuItem.create({
      data: {
        menuId: footerMenu.id,
        parentId: null,
        labelEn: it.labelEn,
        labelBn: it.labelBn,
        url: it.url,
        sortOrder: it.sortOrder,
        isActive: true,
      },
    });
    footerItemsCreated++;
  }
  console.log(`CMS seed: ${footerItemsCreated} FOOTER items created`);

  // ---- 3b. MOBILE menu + items ---------------------------------------
  const mobileMenu = await prisma.cmsMenu.upsert({
    where: { location: 'MOBILE' },
    create: { location: 'MOBILE', name: 'Mobile menu' },
    update: {},
  });

  const mobileItems = [
    { labelEn: 'Home', labelBn: 'হোম', url: '/', sortOrder: 0 },
    { labelEn: 'Categories', labelBn: 'ক্যাটাগরি', url: '/c', sortOrder: 1 },
    { labelEn: 'Deals', labelBn: 'ডিল', url: '/deals', sortOrder: 2 },
    { labelEn: 'My Orders', labelBn: 'আমার অর্ডার', url: '/account/orders', sortOrder: 3 },
    { labelEn: 'Wishlist', labelBn: 'উইশলিস্ট', url: '/account/wishlist', sortOrder: 4 },
    { labelEn: 'Contact', labelBn: 'যোগাযোগ', url: '/pages/contact', sortOrder: 5 },
  ];

  let mobileItemsCreated = 0;
  for (const it of mobileItems) {
    const exists = await prisma.cmsMenuItem.findFirst({
      where: { menuId: mobileMenu.id, labelEn: it.labelEn },
    });
    if (exists) continue;
    await prisma.cmsMenuItem.create({
      data: {
        menuId: mobileMenu.id,
        parentId: null,
        labelEn: it.labelEn,
        labelBn: it.labelBn,
        url: it.url,
        sortOrder: it.sortOrder,
        isActive: true,
      },
    });
    mobileItemsCreated++;
  }
  console.log(`CMS seed: ${mobileItemsCreated} MOBILE items created`);

  // ---- 4. Ensure the 3 default sections are visible with titles ------
  const sections = await prisma.cmsSection.findMany({ orderBy: { position: 'asc' } });
  const TITLES: Record<string, { en: string; bn: string }> = {
    HERO: { en: 'Hero carousel', bn: 'হিরো ক্যারোসেল' },
    HERO_CAROUSEL: { en: 'Hero carousel', bn: 'হিরো ক্যারোসেল' },
    DEAL_STRIP: { en: 'Deal strip', bn: 'ডিল স্ট্রিপ' },
    PROMO_TILES: { en: 'Promo tiles', bn: 'প্রমো টাইলস' },
    QUICK_TILES: { en: 'Quick category tiles', bn: 'কুইক ক্যাটাগরি' },
    CATEGORY_TILES: { en: 'Quick category tiles', bn: 'কুইক ক্যাটাগরি' },
    CAROUSEL: { en: 'Featured carousel', bn: 'ফিচার্ড ক্যারোসেল' },
    PRODUCT_CAROUSEL: { en: 'Featured carousel', bn: 'ফিচার্ড ক্যারোসেল' },
    PROMO_BANNER: { en: 'Promo banners', bn: 'প্রমো ব্যানার' },
    WIDE_BANNER: { en: 'Wide banner', bn: 'ওয়াইড ব্যানার' },
    RECOMMENDED: { en: 'Recommended', bn: 'সুপারিশকৃত' },
    SEO_TEXT: { en: 'SEO text block', bn: 'এসইও টেক্সট' },
  };

  let sectionsUpdated = 0;
  for (const s of sections) {
    const meta = TITLES[s.sectionType];
    const needsTitle = !s.titleEn || !s.titleBn;
    const needsVisible = !s.isVisible;
    if (!needsTitle && !needsVisible) continue;
    await prisma.cmsSection.update({
      where: { id: s.id },
      data: {
        titleEn: s.titleEn ?? meta?.en ?? s.sectionType,
        titleBn: s.titleBn ?? meta?.bn ?? s.sectionType,
        isVisible: true,
      },
    });
    sectionsUpdated++;
  }
  console.log(`CMS seed: ${sectionsUpdated} sections updated`);
}

/**
 * Step 47 (T2-3) — Demo RBAC users for role-matrix testing.
 *
 * Creates one staff user per non-SUPER_ADMIN role, so the admin RBAC
 * matrix can be exercised (TDD §6.13, §10.1). All share the same demo
 * password — DEMO ONLY, never use in production.
 *
 * Idempotent — safe to re-run.
 */
async function seedDemoRoleUsers() {
  const PASSWORD = 'ChangeMe!2026';
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const DEMO_USERS: Array<{
    phone: string;
    email: string;
    fullName: string;
    roleCode: string;
  }> = [
    { phone: '+8801700000011', email: 'catalog@bluegofer.local',   fullName: 'Demo Catalog Manager',       roleCode: 'CATALOG_MANAGER' },
    { phone: '+8801700000012', email: 'orders@bluegofer.local',    fullName: 'Demo Order Support',         roleCode: 'ORDER_SUPPORT' },
    { phone: '+8801700000013', email: 'marketing@bluegofer.local', fullName: 'Demo Marketing Manager',     roleCode: 'MARKETING_MANAGER' },
    { phone: '+8801700000014', email: 'finance@bluegofer.local',   fullName: 'Demo Finance (Read-Only)',   roleCode: 'FINANCE_READONLY' },
    { phone: '+8801700000015', email: 'financemgr@bluegofer.local',fullName: 'Demo Finance Manager',       roleCode: 'FINANCE_MANAGER' },
    { phone: '+8801700000016', email: 'purchase@bluegofer.local',  fullName: 'Demo Purchase Manager',      roleCode: 'PURCHASE_MANAGER' },
    { phone: '+8801700000017', email: 'pos@bluegofer.local',       fullName: 'Demo Store POS Staff',       roleCode: 'STORE_POS_STAFF' },
    { phone: '+8801700000018', email: 'hr@bluegofer.local',        fullName: 'Demo HR Manager',            roleCode: 'HR_MANAGER' },
    { phone: '+8801700000010', email: 'admin2@bluegofer.local',    fullName: 'Demo Admin',                 roleCode: 'ADMIN' },
    { phone: '+8801700000019', email: 'editor@bluegofer.local',    fullName: 'Demo Editor',                roleCode: 'EDITOR' },
  ];

  let created = 0;
  let rolesAttached = 0;

  for (const u of DEMO_USERS) {
    const role = await prisma.role.findUnique({ where: { code: u.roleCode } });
    if (!role) {
      console.log(`SKIP ${u.email}: role ${u.roleCode} missing`);
      continue;
    }

    let user = await prisma.user.findUnique({ where: { phone: u.phone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: u.phone,
          email: u.email,
          fullName: u.fullName,
          passwordHash,
          phoneVerifiedAt: new Date(),
          notificationPrefs: { create: {} },
        },
      });
      created++;
    }

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
    rolesAttached++;
  }

  console.log(
    `Demo role users: ${created} created, ${rolesAttached}/${DEMO_USERS.length} roles attached`,
  );
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
  await seedDemoRoleUsers();
  await seedCmsDemo();
  console.log('Seed complete');
  await seedStep79Extension(); // Step-79: Amazon-style HEADER menu + 3 new top cats
  await seedStep80Extension(); // Step-80: Amazon-style demo sections
  await seedStep81Templates(); // Step-81: notification templates (order lifecycle + refund)
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


// ═══════════════════════════════════════════════════════════════════
// STEP79_SEED_EXTENSION — Amazon-style HEADER menu + 3 new top cats
// Idempotent: re-run safe (upsert pattern).
// ═══════════════════════════════════════════════════════════════════
async function seedStep79Extension() {
  // ---- 1. New top-level categories -------------------------------
  const newTopCats = [
    { slug: 'grocery',        nameEn: 'Grocery',         nameBn: 'গ্রোসারি' },
    { slug: 'beauty-health',  nameEn: 'Beauty & Health', nameBn: 'বিউটি ও হেলথ' },
    { slug: 'toys-baby',      nameEn: 'Toys & Baby',     nameBn: 'টয় ও বেবি' },
  ];
  let catsCreated = 0;
  for (const c of newTopCats) {
    const exists = await prisma.category.findFirst({ where: { slug: c.slug } });
    if (exists) continue;
    await prisma.category.create({
      data: {
        slug: c.slug,
        nameEn: c.nameEn,
        nameBn: c.nameBn,
        parentId: null,
        sortOrder: 100,
      },
    });
    catsCreated++;
  }
  console.log(`Step-79 seed: ${catsCreated} top-level categories created`);

  // ---- 2. Sub-categories under existing top cats ------------------
  const subCats = [
    { parentSlug: 'electronics',  slug: 'mobile-phones', nameEn: 'Mobile Phones', nameBn: 'মোবাইল ফোন' },
    { parentSlug: 'electronics',  slug: 'laptops',       nameEn: 'Laptops',       nameBn: 'ল্যাপটপ' },
    { parentSlug: 'electronics',  slug: 'headphones',    nameEn: 'Headphones',    nameBn: 'হেডফোন' },
    { parentSlug: 'electronics',  slug: 'smart-watches', nameEn: 'Smart Watches', nameBn: 'স্মার্ট ওয়াচ' },
    { parentSlug: 'electronics',  slug: 'cameras',       nameEn: 'Cameras',       nameBn: 'ক্যামেরা' },
    { parentSlug: 'fashion',      slug: 'men',           nameEn: 'Men',           nameBn: 'পুরুষ' },
    { parentSlug: 'fashion',      slug: 'women',         nameEn: 'Women',         nameBn: 'নারী' },
    { parentSlug: 'fashion',      slug: 'kids',          nameEn: 'Kids',          nameBn: 'শিশু' },
    { parentSlug: 'fashion',      slug: 'shoes',         nameEn: 'Shoes',         nameBn: 'জুতা' },
    { parentSlug: 'fashion',      slug: 'bags',          nameEn: 'Bags',          nameBn: 'ব্যাগ' },
    { parentSlug: 'home-kitchen', slug: 'cookware',      nameEn: 'Cookware',      nameBn: 'কুকওয়্যার' },
    { parentSlug: 'home-kitchen', slug: 'furniture',     nameEn: 'Furniture',     nameBn: 'ফার্নিচার' },
    { parentSlug: 'home-kitchen', slug: 'decor',         nameEn: 'Home Decor',    nameBn: 'হোম ডেকর' },
    { parentSlug: 'home-kitchen', slug: 'bedding',       nameEn: 'Bedding',       nameBn: 'বেডিং' },
    { parentSlug: 'home-kitchen', slug: 'cleaning',      nameEn: 'Cleaning',      nameBn: 'ক্লিনিং' },
  ];
  let subsCreated = 0;
  for (const s of subCats) {
    const parent = await prisma.category.findFirst({ where: { slug: s.parentSlug } });
    if (!parent) continue;
    const exists = await prisma.category.findFirst({ where: { slug: s.slug } });
    if (exists) continue;
    await prisma.category.create({
      data: {
        slug: s.slug,
        nameEn: s.nameEn,
        nameBn: s.nameBn,
        parentId: parent.id,
        sortOrder: 10,
      },
    });
    subsCreated++;
  }
  console.log(`Step-79 seed: ${subsCreated} subcategories created`);

  // ---- 3. HEADER menu — Amazon-style 12 items + children ----------
  const headerMenu = await prisma.cmsMenu.upsert({
    where: { location: 'HEADER' },
    create: { location: 'HEADER', name: 'Amazon-style header nav (Step-79)' },
    update: {},
  });

  // Clear old HEADER items (safe: only touches HEADER menu; preserves others)
  // Only delete if we need to rebuild — check by a sentinel item
  const sentinel = await prisma.cmsMenuItem.findFirst({
    where: { menuId: headerMenu.id, labelEn: "Today's Deals", parentId: null },
  });

  if (!sentinel) {
    // Delete any legacy items first (Step-79 replaces old 4-item HEADER)
    await prisma.cmsMenuItem.deleteMany({ where: { menuId: headerMenu.id } });

    // Top-level items
    const items: Array<{
      labelEn: string; labelBn: string; url: string; sortOrder: number;
      children?: Array<{ labelEn: string; labelBn: string; url: string }>;
    }> = [
      {
        labelEn: "Today's Deals", labelBn: 'আজকের ডিল', url: '/deals', sortOrder: 0,
      },
      {
        labelEn: 'New Arrivals', labelBn: 'নতুন এসেছে', url: '/new-arrivals', sortOrder: 1,
      },
      {
        labelEn: 'Best Sellers', labelBn: 'বেস্ট সেলার', url: '/best-sellers', sortOrder: 2,
      },
      {
        labelEn: 'Electronics', labelBn: 'ইলেকট্রনিক্স', url: '/c/electronics', sortOrder: 3,
        children: [
          { labelEn: 'Mobile Phones', labelBn: 'মোবাইল ফোন', url: '/c/mobile-phones' },
          { labelEn: 'Laptops',       labelBn: 'ল্যাপটপ',      url: '/c/laptops' },
          { labelEn: 'Headphones',    labelBn: 'হেডফোন',       url: '/c/headphones' },
          { labelEn: 'Smart Watches', labelBn: 'স্মার্ট ওয়াচ', url: '/c/smart-watches' },
          { labelEn: 'Cameras',       labelBn: 'ক্যামেরা',     url: '/c/cameras' },
        ],
      },
      {
        labelEn: 'Fashion', labelBn: 'ফ্যাশন', url: '/c/fashion', sortOrder: 4,
        children: [
          { labelEn: 'Men',   labelBn: 'পুরুষ', url: '/c/men' },
          { labelEn: 'Women', labelBn: 'নারী',  url: '/c/women' },
          { labelEn: 'Kids',  labelBn: 'শিশু',  url: '/c/kids' },
          { labelEn: 'Shoes', labelBn: 'জুতা',  url: '/c/shoes' },
          { labelEn: 'Bags',  labelBn: 'ব্যাগ', url: '/c/bags' },
        ],
      },
      {
        labelEn: 'Home & Kitchen', labelBn: 'হোম ও কিচেন', url: '/c/home-kitchen', sortOrder: 5,
        children: [
          { labelEn: 'Cookware',   labelBn: 'কুকওয়্যার',  url: '/c/cookware' },
          { labelEn: 'Furniture',  labelBn: 'ফার্নিচার',   url: '/c/furniture' },
          { labelEn: 'Home Decor', labelBn: 'হোম ডেকর',   url: '/c/decor' },
          { labelEn: 'Bedding',    labelBn: 'বেডিং',       url: '/c/bedding' },
          { labelEn: 'Cleaning',   labelBn: 'ক্লিনিং',     url: '/c/cleaning' },
        ],
      },
      { labelEn: 'Grocery',          labelBn: 'গ্রোসারি',       url: '/c/grocery',        sortOrder: 6 },
      { labelEn: 'Beauty & Health',  labelBn: 'বিউটি ও হেলথ',   url: '/c/beauty-health',  sortOrder: 7 },
      { labelEn: 'Toys & Baby',      labelBn: 'টয় ও বেবি',      url: '/c/toys-baby',      sortOrder: 8 },
      { labelEn: 'Customer Service', labelBn: 'কাস্টমার সার্ভিস', url: '/pages/contact',    sortOrder: 9 },
      { labelEn: 'About',            labelBn: 'আমাদের সম্পর্কে',  url: '/pages/about-us',   sortOrder: 10 },
    ];

    let parentsCreated = 0;
    let childrenCreated = 0;
    for (const it of items) {
      const parent = await prisma.cmsMenuItem.create({
        data: {
          menuId: headerMenu.id,
          parentId: null,
          labelEn: it.labelEn,
          labelBn: it.labelBn,
          url: it.url,
          sortOrder: it.sortOrder,
        },
      });
      parentsCreated++;
      if (it.children) {
        let childIdx = 0;
        for (const ch of it.children) {
          await prisma.cmsMenuItem.create({
            data: {
              menuId: headerMenu.id,
              parentId: parent.id,
              labelEn: ch.labelEn,
              labelBn: ch.labelBn,
              url: ch.url,
              sortOrder: childIdx++,
            },
          });
          childrenCreated++;
        }
      }
    }
    console.log(`Step-79 seed: HEADER menu rebuilt — ${parentsCreated} parents, ${childrenCreated} children`);
  } else {
    console.log('Step-79 seed: HEADER menu already has Amazon-style items — skipping rebuild');
  }
}


// ═══════════════════════════════════════════════════════════════════
// STEP80_SEED_EXTENSION — Amazon-style demo sections
// Idempotent: skip if a section with same key already exists.
// ═══════════════════════════════════════════════════════════════════
async function seedStep80Extension() {
  // ── 1. CATEGORY_SHOP_ROW — Amazon row 1 style ─────────────────
  const shopRowKey = 'home-shop-row-1';
  const existing1 = await prisma.cmsSection.findFirst({ where: { key: shopRowKey } });
  if (!existing1) {
    const maxPos1 = await prisma.cmsSection.findFirst({
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const nextPos1 = (maxPos1?.position ?? 0) + 1;
    await prisma.cmsSection.create({
      data: {
        key: shopRowKey,
        sectionType: 'CATEGORY_SHOP_ROW',
        titleEn: 'Shop by category',
        titleBn: 'ক্যাটাগরি অনুযায়ী কিনুন',
        position: nextPos1,
        isVisible: true,
        config: {
          bgTheme: 'default',
          tiles: [
            {
              titleEn: 'Shop electronics from NoLimit',
              titleBn: 'নো লিমিট থেকে ইলেকট্রনিক্স',
              subtitleEn: 'Top picks under ৳50,000',
              subtitleBn: '৳৫০,০০০-এর নিচে সেরা পছন্দ',
              seeAllHref: '/c/electronics',
              items: [
                { labelEn: 'Mobile Phones', labelBn: 'মোবাইল ফোন', imageUrl: 'https://picsum.photos/seed/elec-mobile/300/300', href: '/c/mobile-phones' },
                { labelEn: 'Laptops',       labelBn: 'ল্যাপটপ',      imageUrl: 'https://picsum.photos/seed/elec-laptop/300/300', href: '/c/laptops' },
                { labelEn: 'Headphones',    labelBn: 'হেডফোন',       imageUrl: 'https://picsum.photos/seed/elec-head/300/300',  href: '/c/headphones' },
                { labelEn: 'Cameras',       labelBn: 'ক্যামেরা',     imageUrl: 'https://picsum.photos/seed/elec-cam/300/300',   href: '/c/cameras' },
              ],
            },
            {
              titleEn: 'Fashion essentials',
              titleBn: 'ফ্যাশন এssentials',
              subtitleEn: 'New styles this week',
              subtitleBn: 'এই সপ্তাহের নতুন স্টাইল',
              seeAllHref: '/c/fashion',
              items: [
                { labelEn: 'Men',   labelBn: 'পুরুষ', imageUrl: 'https://picsum.photos/seed/fash-men/300/300',   href: '/c/men' },
                { labelEn: 'Women', labelBn: 'নারী',  imageUrl: 'https://picsum.photos/seed/fash-women/300/300', href: '/c/women' },
                { labelEn: 'Shoes', labelBn: 'জুতা',  imageUrl: 'https://picsum.photos/seed/fash-shoes/300/300', href: '/c/shoes' },
                { labelEn: 'Bags',  labelBn: 'ব্যাগ', imageUrl: 'https://picsum.photos/seed/fash-bags/300/300',  href: '/c/bags' },
              ],
            },
            {
              titleEn: 'Home & Kitchen',
              titleBn: 'হোম ও কিচেন',
              subtitleEn: 'Upgrade your space',
              subtitleBn: 'ঘর সাজান',
              seeAllHref: '/c/home-kitchen',
              items: [
                { labelEn: 'Cookware',   labelBn: 'কুকওয়্যার',  imageUrl: 'https://picsum.photos/seed/home-cook/300/300',    href: '/c/cookware' },
                { labelEn: 'Furniture',  labelBn: 'ফার্নিচার',   imageUrl: 'https://picsum.photos/seed/home-furn/300/300',    href: '/c/furniture' },
                { labelEn: 'Home Decor', labelBn: 'হোম ডেকর',   imageUrl: 'https://picsum.photos/seed/home-decor/300/300',   href: '/c/decor' },
                { labelEn: 'Bedding',    labelBn: 'বেডিং',       imageUrl: 'https://picsum.photos/seed/home-bed/300/300',     href: '/c/bedding' },
              ],
            },
            {
              titleEn: 'Grocery picks',
              titleBn: 'গ্রোসারি পছন্দ',
              subtitleEn: 'Daily essentials',
              subtitleBn: 'প্রতিদিনের প্রয়োজন',
              seeAllHref: '/c/grocery',
              items: [
                { labelEn: 'Rice & Grain', labelBn: 'চাল ও শস্য', imageUrl: 'https://picsum.photos/seed/groc-rice/300/300',  href: '/c/grocery' },
                { labelEn: 'Snacks',       labelBn: 'স্ন্যাকস',    imageUrl: 'https://picsum.photos/seed/groc-snack/300/300', href: '/c/grocery' },
                { labelEn: 'Beverages',    labelBn: 'পানীয়',      imageUrl: 'https://picsum.photos/seed/groc-bev/300/300',   href: '/c/grocery' },
                { labelEn: 'Spices',       labelBn: 'মশলা',        imageUrl: 'https://picsum.photos/seed/groc-spice/300/300', href: '/c/grocery' },
              ],
            },
          ],
        },
      },
    });
    console.log('Step-80 seed: CATEGORY_SHOP_ROW created');
  } else {
    console.log('Step-80 seed: CATEGORY_SHOP_ROW already exists — skipping');
  }

  // ── 2. HERO_PRODUCT_ROW — Amazon row 2 style ───────────────────
  const heroRowKey = 'home-hero-product-row-1';
  const existing2 = await prisma.cmsSection.findFirst({ where: { key: heroRowKey } });
  if (!existing2) {
    const maxPos2 = await prisma.cmsSection.findFirst({
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const nextPos2 = (maxPos2?.position ?? 0) + 1;
    await prisma.cmsSection.create({
      data: {
        key: heroRowKey,
        sectionType: 'HERO_PRODUCT_ROW',
        titleEn: 'Featured this week',
        titleBn: 'এই সপ্তাহের ফিচার',
        position: nextPos2,
        isVisible: true,
        config: {
          hero: {
            badgeEn: 'Exclusively for members',
            badgeBn: 'শুধু সদস্যদের জন্য',
            titleEn: 'Big Deals drop this weekend',
            titleBn: 'এই সপ্তাহান্তে বড় ডিল',
            subtitleEn: 'Up to 60% off on selected items',
            subtitleBn: 'নির্বাচিত পণ্যে ৬০% পর্যন্ত ছাড়',
            ctaLabelEn: 'Shop deals',
            ctaLabelBn: 'ডিল দেখুন',
            ctaHref: '/deals',
            bgColor: '#1A6FD9',
            imageUrl: 'https://picsum.photos/seed/hero-bg/800/600',
          },
          products: [
            {
              titleEn: 'Wireless Headphones',
              titleBn: 'ওয়্যারলেস হেডফোন',
              imageUrl: 'https://picsum.photos/seed/card-head/300/300',
              href: '/c/headphones',
              ctaLabelEn: 'Shop now',
              ctaLabelBn: 'এখনই কিনুন',
              ctaHref: '/c/headphones',
            },
            {
              titleEn: 'Smart Watches',
              titleBn: 'স্মার্ট ওয়াচ',
              imageUrl: 'https://picsum.photos/seed/card-watch/300/300',
              href: '/c/smart-watches',
              ctaLabelEn: 'Explore',
              ctaLabelBn: 'দেখুন',
              ctaHref: '/c/smart-watches',
            },
            {
              titleEn: 'Men\'s Sneakers',
              titleBn: 'পুরুষদের স্নিকার',
              imageUrl: 'https://picsum.photos/seed/card-shoe/300/300',
              href: '/c/shoes',
              ctaLabelEn: 'Shop now',
              ctaLabelBn: 'এখনই কিনুন',
              ctaHref: '/c/shoes',
            },
            {
              titleEn: 'Home Decor Picks',
              titleBn: 'হোম ডেকর',
              imageUrl: 'https://picsum.photos/seed/card-decor/300/300',
              href: '/c/decor',
              ctaLabelEn: 'Explore',
              ctaLabelBn: 'দেখুন',
              ctaHref: '/c/decor',
            },
          ],
        },
      },
    });
    console.log('Step-80 seed: HERO_PRODUCT_ROW created');
  } else {
    console.log('Step-80 seed: HERO_PRODUCT_ROW already exists — skipping');
  }
}


// ═══════════════════════════════════════════════════════════════════
// STEP81_SEED_EXTENSION — Transactional notification templates
// (order lifecycle + refund) — bn + en, SMS + EMAIL channels.
// Idempotent — safe to re-run.
// ═══════════════════════════════════════════════════════════════════
async function seedStep81Templates() {
  type TemplateSeed = {
    key: string;
    channel: 'SMS' | 'EMAIL';
    subjectEn?: string;
    subjectBn?: string;
    bodyEn: string;
    bodyBn: string;
  };

  const templates: TemplateSeed[] = [
    // ── ORDER PLACED ─────────────────────────────────────────────
    {
      key: 'order.placed', channel: 'SMS',
      bodyEn: 'NoLimitShopping: Order {{orderNumber}} received. Total ৳{{total}}. We will notify you when confirmed.',
      bodyBn: 'NoLimitShopping: অর্ডার {{orderNumber}} পেয়েছি। মোট ৳{{total}}। কনফার্ম হলে জানাব।',
    },
    {
      key: 'order.placed', channel: 'EMAIL',
      subjectEn: 'Order {{orderNumber}} placed — NoLimitShopping',
      subjectBn: 'অর্ডার {{orderNumber}} সম্পন্ন — NoLimitShopping',
      bodyEn: 'Hi {{customerName}},\n\nThanks for your order! Order {{orderNumber}} has been received.\n\nTotal: ৳{{total}}\nItems: {{itemCount}}\n\nWe will confirm shortly.\n\n— NoLimitShopping',
      bodyBn: 'প্রিয় {{customerName}},\n\nআপনার অর্ডারের জন্য ধন্যবাদ! অর্ডার {{orderNumber}} পেয়েছি।\n\nমোট: ৳{{total}}\nপণ্য: {{itemCount}}\n\nশীঘ্রই কনফার্ম করব।\n\n— NoLimitShopping',
    },

    // ── ORDER CONFIRMED ──────────────────────────────────────────
    {
      key: 'order.confirmed', channel: 'SMS',
      bodyEn: 'NoLimitShopping: Order {{orderNumber}} confirmed. Preparing for dispatch.',
      bodyBn: 'NoLimitShopping: অর্ডার {{orderNumber}} কনফার্ম হয়েছে। প্রস্তুতি চলছে।',
    },
    {
      key: 'order.confirmed', channel: 'EMAIL',
      subjectEn: 'Order {{orderNumber}} confirmed',
      subjectBn: 'অর্ডার {{orderNumber}} কনফার্মড',
      bodyEn: 'Hi {{customerName}},\n\nYour order {{orderNumber}} is confirmed and being prepared.\n\nTotal: ৳{{total}}',
      bodyBn: 'প্রিয় {{customerName}},\n\nআপনার অর্ডার {{orderNumber}} কনফার্ম হয়েছে।\n\nমোট: ৳{{total}}',
    },

    // ── ORDER SHIPPED ────────────────────────────────────────────
    {
      key: 'order.shipped', channel: 'SMS',
      bodyEn: 'NoLimitShopping: Order {{orderNumber}} shipped via {{courier}}. Track: {{trackingUrl}}',
      bodyBn: 'NoLimitShopping: অর্ডার {{orderNumber}} পাঠানো হয়েছে ({{courier}})। ট্র্যাক: {{trackingUrl}}',
    },
    {
      key: 'order.shipped', channel: 'EMAIL',
      subjectEn: 'Order {{orderNumber}} shipped',
      subjectBn: 'অর্ডার {{orderNumber}} পাঠানো হয়েছে',
      bodyEn: 'Hi {{customerName}},\n\nYour order {{orderNumber}} is on the way via {{courier}}.\n\nTracking: {{trackingUrl}}',
      bodyBn: 'প্রিয় {{customerName}},\n\nআপনার অর্ডার {{orderNumber}} রওনা হয়েছে {{courier}}-এর মাধ্যমে।\n\nট্র্যাকিং: {{trackingUrl}}',
    },

    // ── OUT FOR DELIVERY ─────────────────────────────────────────
    {
      key: 'order.out_for_delivery', channel: 'SMS',
      bodyEn: 'NoLimitShopping: Order {{orderNumber}} is out for delivery. Please keep ৳{{codAmount}} ready if COD.',
      bodyBn: 'NoLimitShopping: অর্ডার {{orderNumber}} ডেলিভারির জন্য বের হয়েছে। COD হলে ৳{{codAmount}} প্রস্তুত রাখুন।',
    },
    {
      key: 'order.out_for_delivery', channel: 'EMAIL',
      subjectEn: 'Order {{orderNumber}} out for delivery',
      subjectBn: 'অর্ডার {{orderNumber}} ডেলিভারির পথে',
      bodyEn: 'Hi {{customerName}},\n\nYour order {{orderNumber}} is out for delivery today.',
      bodyBn: 'প্রিয় {{customerName}},\n\nআপনার অর্ডার {{orderNumber}} আজ ডেলিভারির পথে।',
    },

    // ── ORDER DELIVERED ──────────────────────────────────────────
    {
      key: 'order.delivered', channel: 'SMS',
      bodyEn: 'NoLimitShopping: Order {{orderNumber}} delivered. Thanks for shopping! Rate us: {{reviewUrl}}',
      bodyBn: 'NoLimitShopping: অর্ডার {{orderNumber}} ডেলিভারি সম্পন্ন। কিনতে ধন্যবাদ! রেটিং দিন: {{reviewUrl}}',
    },
    {
      key: 'order.delivered', channel: 'EMAIL',
      subjectEn: 'Order {{orderNumber}} delivered — Please review',
      subjectBn: 'অর্ডার {{orderNumber}} ডেলিভারড — রিভিউ দিন',
      bodyEn: 'Hi {{customerName}},\n\nYour order {{orderNumber}} was delivered. We hope you love it!\n\nLeave a review: {{reviewUrl}}',
      bodyBn: 'প্রিয় {{customerName}},\n\nআপনার অর্ডার {{orderNumber}} ডেলিভার হয়েছে। পছন্দ হয়েছে কিনা জানান!\n\nরিভিউ: {{reviewUrl}}',
    },

    // ── REFUND PROCESSED ─────────────────────────────────────────
    {
      key: 'refund.processed', channel: 'SMS',
      bodyEn: 'NoLimitShopping: Refund of ৳{{amount}} for order {{orderNumber}} initiated to your {{method}}.',
      bodyBn: 'NoLimitShopping: অর্ডার {{orderNumber}}-এর জন্য ৳{{amount}} রিফান্ড {{method}}-এ প্রেরণ করা হয়েছে।',
    },
    {
      key: 'refund.processed', channel: 'EMAIL',
      subjectEn: 'Refund initiated for order {{orderNumber}}',
      subjectBn: 'অর্ডার {{orderNumber}}-এর রিফান্ড প্রেরিত',
      bodyEn: 'Hi {{customerName}},\n\nA refund of ৳{{amount}} for order {{orderNumber}} has been initiated to your {{method}}.\n\nAllow 3-7 business days.',
      bodyBn: 'প্রিয় {{customerName}},\n\nঅর্ডার {{orderNumber}}-এর জন্য ৳{{amount}} রিফান্ড {{method}}-এ প্রেরণ করা হয়েছে।\n\n৩-৭ কর্মদিবস লাগতে পারে।',
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const t of templates) {
    const exists = await prisma.notificationTemplate.findUnique({
      where: { key_channel: { key: t.key, channel: t.channel } },
    });
    if (exists) { skipped++; continue; }
    await prisma.notificationTemplate.create({
      data: {
        key: t.key,
        channel: t.channel,
        subjectEn: t.subjectEn,
        subjectBn: t.subjectBn,
        bodyEn: t.bodyEn,
        bodyBn: t.bodyBn,
        isActive: true,
      },
    });
    created++;
  }

  console.log(`Step-81 templates: ${created} created, ${skipped} skipped (idempotent)`);
}
