// apps/api/test/purchase/grn.integration.spec.ts
// A.5 chain proof: GRN confirm → stock + PO receivedQty + supplier AP + journal, one tx.
import { PrismaService } from '../../src/database/prisma.service';
import { LedgerService } from '../../src/modules/accounting/services/ledger.service';
import { ChartOfAccountsService } from '../../src/modules/accounting/services/chart-of-accounts.service';
import { seedDefaultCoa } from '../../src/modules/accounting/seeds/default-coa.seed';
import { RequisitionsService } from '../../src/modules/purchase/requisitions.service';
import { PurchaseOrdersService } from '../../src/modules/purchase/purchase-orders.service';
import { GRNService } from '../../src/modules/purchase/grn.service';

jest.setTimeout(30000);

describe('Purchase — GRN A.5 chain (integration)', () => {
  let prisma: PrismaService;
  let ledger: LedgerService;
  let reqSvc: RequisitionsService;
  let poSvc: PurchaseOrdersService;
  let grnSvc: GRNService;
  let branchId: string;
  let supplierId: string;
  let variantId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    ledger = new LedgerService(prisma);
    reqSvc = new RequisitionsService(prisma);
    poSvc = new PurchaseOrdersService(prisma);
    grnSvc = new GRNService(prisma, ledger, poSvc);

    // Seed default COA
    await seedDefaultCoa(prisma);

    // Branch
    let branch = await prisma.branch.findUnique({ where: { code: 'TEST-BR' } });
    if (!branch) {
      branch = await prisma.branch.create({
        data: { code: 'TEST-BR', name: 'Test Branch', isDefault: false, status: 'ACTIVE' },
      });
    }
    branchId = branch.id;

    // Supplier
    let supplier = await prisma.supplier.findUnique({ where: { code: 'TEST-SUP' } });
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: { code: 'TEST-SUP', name: 'Test Supplier', currentDue: 0, openingBalance: 0 },
      });
    }
    supplierId = supplier.id;

    // Variant — find one existing or create minimally
    let variant = await prisma.variant.findFirst();
    if (!variant) {
      // We need a product + variant. Create throwaway.
      const cat = await prisma.category.upsert({
        where: { slug: 'test-cat' },
        update: {},
        create: { slug: 'test-cat', nameEn: 'Test Cat', nameBn: 'Test Cat' },
      });
      const prod = await prisma.product.create({
        data: {
          slug: 'test-grn-prod',
          titleEn: 'Test GRN Product',
          titleBn: 'Test GRN Product',
          categoryId: cat.id,
          status: 'DRAFT',
        },
      });
      variant = await prisma.variant.create({
        data: {
          productId: prod.id,
          sku: 'TEST-GRN-SKU',
          pricePoisha: 10000,
          stock: 0,
          attributeValues: {},
        },
      });
    }
    variantId = variant.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      await prisma.journalLine.deleteMany({
        where: { journalEntry: { description: { contains: 'TEST-GRN' } } },
      });
      await prisma.journalEntry.deleteMany({ where: { description: { contains: 'TEST-GRN' } } });
      await prisma.gRNItem.deleteMany({ where: { grn: { notes: { contains: 'TEST-GRN' } } } });
      await prisma.gRN.deleteMany({ where: { notes: { contains: 'TEST-GRN' } } });
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { notes: { contains: 'TEST-GRN' } } } });
      await prisma.purchaseOrder.deleteMany({ where: { notes: { contains: 'TEST-GRN' } } });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('GRN confirm increments stock, PO received, supplier AP, and posts balanced ledger', async () => {
    // ---- Setup PO ----
    const po = await poSvc.create({
      supplierId,
      branchId,
      notes: 'TEST-GRN PO',
      items: [{ variantId, orderedQty: 10, unitCost: 5000 }],
    });
    await poSvc.transition(po.id, 'SENT');

    const stockBefore = (await prisma.variant.findUnique({ where: { id: variantId } }))!.stock;
    const supplierBefore = (await prisma.supplier.findUnique({ where: { id: supplierId } }))!.currentDue;

    // ---- Create + confirm GRN ----
    const grn = await grnSvc.create({
      purchaseOrderId: po.id,
      branchId,
      notes: 'TEST-GRN draft',
      items: [{ poItemId: po.items[0].id, variantId, receivedQty: 4, unitCost: 5000 }],
    });
    const result = await grnSvc.confirm(grn.id);

    // ---- Assert stock ----
    const stockAfter = (await prisma.variant.findUnique({ where: { id: variantId } }))!.stock;
    expect(stockAfter - stockBefore).toBe(4);

    // ---- Assert AP ----
    const supplierAfter = (await prisma.supplier.findUnique({ where: { id: supplierId } }))!.currentDue;
    expect(supplierAfter - supplierBefore).toBe(4 * 5000);

    // ---- Assert PO status flipped to PARTIAL_RECEIVED ----
    const poAfter = await prisma.purchaseOrder.findUnique({ where: { id: po.id } });
    expect(poAfter!.status).toBe('PARTIAL_RECEIVED');

    // ---- Assert journal is POSTED + balanced ----
    const je = await prisma.journalEntry.findUnique({
      where: { id: result.journalEntryId },
      include: { lines: true },
    });
    expect(je!.status).toBe('POSTED');
    expect(je!.totalDebit).toBe(20000);
    expect(je!.totalCredit).toBe(20000);
    expect(je!.lines.length).toBe(2);

    // ---- Assert ledger balances: Inventory Dr +20000, AP Cr +20000 ----
    const inv = await prisma.ledgerAccount.findUnique({ where: { code: '1200-INV' } });
    const ap = await prisma.ledgerAccount.findUnique({ where: { code: '2000-AP' } });
    expect(inv!.currentBalance).toBeGreaterThanOrEqual(20000);
    expect(ap!.currentBalance).toBeLessThanOrEqual(-20000);

    // ---- Assert InventoryAdjustment row ----
    const adj = await prisma.inventoryAdjustment.findFirst({
      where: { variantId, reason: 'RESTOCK', referenceId: grn.id },
    });
    expect(adj).toBeTruthy();
    expect(adj!.delta).toBe(4);
    expect(adj!.stockBefore).toBe(stockBefore);
    expect(adj!.stockAfter).toBe(stockBefore + 4);

    // ---- Assert SupplierDue created ----
    const due = await prisma.supplierDue.findFirst({
      where: { supplierId, notes: { contains: 'GRN' }, status: 'OPEN' },
    });
    expect(due).toBeTruthy();
    expect(due!.amount).toBe(20000);
  });
});