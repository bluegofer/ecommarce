import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { ChartOfAccountsService } from '../accounting/services/chart-of-accounts.service';

const LEDGER_CODES = {
  CASH: '1000-CASH',
  BANK: '1010-BANK',
  MFS: '1020-MFS',
  SALES: '4000-SALES',
} as const;

interface ReturnItemInput {
  posSaleItemId: string;
  quantity: number;
}

interface ReturnInput {
  items: ReturnItemInput[];
  reason?: string;
  refundMethod: 'CASH' | 'CARD' | 'MFS_BKASH' | 'MFS_NAGAD' | 'MFS_ROCKET';
  exchangeVariantIds?: Array<{ variantId: string; quantity: number }>;
}

@Injectable()
export class PosReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly coa: ChartOfAccountsService,
  ) {}

  private async requireAccount(code: string, label: string) {
    const acc = await this.coa.findLedgerAccountByCode(code);
    if (!acc) {
      throw new BadRequestException(
        `Ledger account not found: ${label} (${code}) — run COA seed`,
      );
    }
    return acc;
  }

  private accountCodeFor(method: string): string {
    if (method === 'CASH') return LEDGER_CODES.CASH;
    if (method === 'CARD') return LEDGER_CODES.BANK;
    return LEDGER_CODES.MFS;
  }

  /**
   * AC-36: Return against a POS sale.
   * - Restocks the branch (reason-coded)
   * - Reverses the sales revenue portion
   * - Refunds via chosen method
   * All within ONE transaction.
   */
  async returnSale(saleId: string, input: ReturnInput, actorId: string) {
    if (!input.items?.length) {
      throw new BadRequestException('Return must have at least one item');
    }

    const sale = await this.prisma.posSale.findUnique({
      where: { id: saleId },
      include: { items: true, payments: true },
    });
    if (!sale) throw new NotFoundException('POS sale not found');
    if (sale.status === 'VOIDED') {
      throw new BadRequestException('Sale is already voided');
    }

    // Compute refund amount + validate quantities
    let refundTotal = 0;
    const itemUpdates: Array<{
      id: string;
      returnQty: number;
      lineRefund: number;
      variantId: string;
    }> = [];

    for (const reqItem of input.items) {
      const saleItem = sale.items.find((i) => i.id === reqItem.posSaleItemId);
      if (!saleItem) {
        throw new NotFoundException(
          `Sale item ${reqItem.posSaleItemId} not in sale ${saleId}`,
        );
      }
      const remaining = saleItem.quantity - saleItem.returnedQty;
      if (reqItem.quantity < 1 || reqItem.quantity > remaining) {
        throw new BadRequestException(
          `Invalid return qty for item ${saleItem.id}: requested ${reqItem.quantity}, remaining ${remaining}`,
        );
      }
      const lineRefund = saleItem.unitPrice * reqItem.quantity;
      refundTotal += lineRefund;
      itemUpdates.push({
        id: saleItem.id,
        returnQty: reqItem.quantity,
        lineRefund,
        variantId: saleItem.variantId,
      });
    }

    if (refundTotal <= 0) throw new BadRequestException('Refund total is zero');

    // Resolve ledger accounts
    const refundAccount = await this.requireAccount(
      this.accountCodeFor(input.refundMethod),
      input.refundMethod,
    );
    const salesAccount = await this.requireAccount(LEDGER_CODES.SALES, 'Sales');

    return this.prisma.$transaction(async (tx) => {
      // 1) Restock branch + bump returnedQty
      for (const u of itemUpdates) {
        await tx.$executeRaw`
          UPDATE "branch_stock"
          SET quantity = quantity + ${u.returnQty}
          WHERE "branchId" = ${sale.branchId}
            AND "variantId" = ${u.variantId}
        `;
        await tx.posSaleItem.update({
          where: { id: u.id },
          data: { returnedQty: { increment: u.returnQty } },
        });
      }

      // 2) Determine new sale status
      const refreshedItems = await tx.posSaleItem.findMany({
        where: { saleId },
      });
      const allReturned = refreshedItems.every(
        (i) => i.returnedQty >= i.quantity,
      );
      const anyReturned = refreshedItems.some((i) => i.returnedQty > 0);
      const newStatus = allReturned
        ? 'RETURNED'
        : anyReturned
          ? 'PARTIALLY_RETURNED'
          : 'COMPLETED';

      const updated = await tx.posSale.update({
        where: { id: saleId },
        data: { status: newStatus },
        include: { items: true, payments: true },
      });

      // 3) Ledger: reverse revenue + refund payment method
      await this.ledger.postEntry(
        {
          entryDate: new Date().toISOString(),
          description: `POS return ${sale.receiptNumber} (${input.refundMethod})`,
          sourceType: 'POS_SALE',
          sourceId: sale.id,
          branchId: sale.branchId,
          lines: [
            {
              ledgerAccountId: salesAccount.id,
              debit: refundTotal,
              credit: 0,
              description: `Return refund revenue reversal`,
            },
            {
              ledgerAccountId: refundAccount.id,
              debit: 0,
              credit: refundTotal,
              description: `Refund via ${input.refundMethod}`,
            },
          ],
        },
        { tx, status: 'POSTED' },
      );

      return {
        sale: updated,
        refundTotal,
        reason: input.reason,
        refundMethod: input.refundMethod,
      };
    });
  }

  /**
   * AC-36: Exchange = return + immediate new sale in one flow.
   * Money delta = newItemsTotal - returnedTotal
   *   delta > 0 → customer pays delta (cash/card/mfs)
   *   delta < 0 → refund |delta|
   *   delta = 0 → even exchange
   */
  async exchangeSale(saleId: string, input: ReturnInput, actorId: string) {
    if (!input.exchangeVariantIds?.length) {
      throw new BadRequestException(
        'Exchange requires exchangeVariantIds (items customer takes)',
      );
    }

    const sale = await this.prisma.posSale.findUnique({
      where: { id: saleId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('POS sale not found');
    if (sale.status === 'VOIDED') {
      throw new BadRequestException('Sale is already voided');
    }

    // Validate returned items
    let returnedTotal = 0;
    const returnUpdates: Array<{
      id: string;
      returnQty: number;
      variantId: string;
    }> = [];

    for (const reqItem of input.items) {
      const saleItem = sale.items.find((i) => i.id === reqItem.posSaleItemId);
      if (!saleItem) {
        throw new NotFoundException(
          `Sale item ${reqItem.posSaleItemId} not in sale ${saleId}`,
        );
      }
      const remaining = saleItem.quantity - saleItem.returnedQty;
      if (reqItem.quantity < 1 || reqItem.quantity > remaining) {
        throw new BadRequestException(
          `Invalid exchange return qty for ${saleItem.id}`,
        );
      }
      returnedTotal += saleItem.unitPrice * reqItem.quantity;
      returnUpdates.push({
        id: saleItem.id,
        returnQty: reqItem.quantity,
        variantId: saleItem.variantId,
      });
    }

    // Lookup new variants' prices
    let newItemsTotal = 0;
    const newItems: Array<{
      variantId: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const ex of input.exchangeVariantIds) {
      const variant = await this.prisma.variant.findUnique({
        where: { id: ex.variantId },
      });
      if (!variant) throw new NotFoundException(`Variant ${ex.variantId} not found`);
      const lineTotal = variant.pricePoisha * ex.quantity;
      newItemsTotal += lineTotal;
      newItems.push({
        variantId: ex.variantId,
        quantity: ex.quantity,
        unitPrice: variant.pricePoisha,
      });
    }

    const delta = newItemsTotal - returnedTotal;

    // Resolve ledger accounts
    const refundAccount = await this.requireAccount(
      this.accountCodeFor(input.refundMethod),
      input.refundMethod,
    );
    const salesAccount = await this.requireAccount(LEDGER_CODES.SALES, 'Sales');

    return this.prisma.$transaction(async (tx) => {
      // 1) Restock returned items
      for (const u of returnUpdates) {
        await tx.$executeRaw`
          UPDATE "branch_stock"
          SET quantity = quantity + ${u.returnQty}
          WHERE "branchId" = ${sale.branchId}
            AND "variantId" = ${u.variantId}
        `;
        await tx.posSaleItem.update({
          where: { id: u.id },
          data: { returnedQty: { increment: u.returnQty } },
        });
      }

      // 2) Decrement stock for new items (conditional)
      for (const item of newItems) {
        const affected = await tx.$executeRaw`
          UPDATE "branch_stock"
          SET quantity = quantity - ${item.quantity}
          WHERE "branchId" = ${sale.branchId}
            AND "variantId" = ${item.variantId}
            AND quantity >= ${item.quantity}
        `;
        if (affected === 0) {
          throw new ConflictException(
            `Insufficient stock for exchange variant ${item.variantId}`,
          );
        }
      }

      // 3) Add the new items to the same sale (invoice-level exchange)
      const count = await tx.posSaleItem.count({ where: { saleId } });
      for (const item of newItems) {
        await tx.posSaleItem.create({
          data: {
            saleId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: 0,
            lineTotal: item.unitPrice * item.quantity,
          },
        });
      }

      // 4) Ledger: posted as two entries (revenue reversal + new revenue)
      if (returnedTotal > 0) {
        await this.ledger.postEntry(
          {
            entryDate: new Date().toISOString(),
            description: `Exchange return ${sale.receiptNumber}`,
            sourceType: 'POS_SALE',
            sourceId: sale.id,
            branchId: sale.branchId,
            lines: [
              {
                ledgerAccountId: salesAccount.id,
                debit: returnedTotal,
                credit: 0,
                description: 'Exchange — return reversal',
              },
              {
                ledgerAccountId: refundAccount.id,
                debit: 0,
                credit: returnedTotal,
                description: 'Exchange — refund leg',
              },
            ],
          },
          { tx, status: 'POSTED' },
        );
      }

      if (newItemsTotal > 0) {
        await this.ledger.postEntry(
          {
            entryDate: new Date().toISOString(),
            description: `Exchange new items ${sale.receiptNumber}`,
            sourceType: 'POS_SALE',
            sourceId: sale.id,
            branchId: sale.branchId,
            lines: [
              {
                ledgerAccountId: refundAccount.id,
                debit: newItemsTotal,
                credit: 0,
                description: 'Exchange — new sale leg',
              },
              {
                ledgerAccountId: salesAccount.id,
                debit: 0,
                credit: newItemsTotal,
                description: 'Exchange — new revenue',
              },
            ],
          },
          { tx, status: 'POSTED' },
        );
      }

      // 5) Adjust paidAmount / changeAmount based on delta
      const updatedSale = await tx.posSale.findUnique({
        where: { id: saleId },
        include: { items: true },
      });

      const updated = await tx.posSale.update({
        where: { id: saleId },
        data: {
          paidAmount:
            (updatedSale?.paidAmount ?? 0) + Math.max(delta, 0),
          changeAmount:
            (updatedSale?.changeAmount ?? 0) + Math.max(-delta, 0),
        },
        include: { items: true, payments: true },
      });

      return {
        sale: updated,
        returnedTotal,
        newItemsTotal,
        delta,
        settlement: delta > 0 ? 'CUSTOMER_PAYS' : delta < 0 ? 'REFUND' : 'EVEN',
      };
    });
  }
}