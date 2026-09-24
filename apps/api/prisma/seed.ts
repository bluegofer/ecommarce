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