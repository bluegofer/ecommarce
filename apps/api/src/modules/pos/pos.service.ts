import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { ChartOfAccountsService } from '../accounting/services/chart-of-accounts.service';
import {
  OpenSessionDto, CloseSessionDto, CashEventDto,
  CreatePosSaleDto, PosPaymentMethodDto,
  CreateStockTransferDto,
} from './dto';

const VARIANCE_APPROVAL_THRESHOLD_POISHA = 10000; // 100 BDT

// COA ledger codes (see default-coa.seed.ts)
const LEDGER_CODES = {
  CASH: '1000-CASH',
  BANK: '1010-BANK',
  MFS: '1020-MFS',
  AR: '1100-AR',
  SALES: '4000-SALES',
} as const;

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly coa: ChartOfAccountsService,
  ) {}

  // ================= SESSION =================

  async openSession(dto: OpenSessionDto, userId: string) {
    const register = await this.prisma.register.findUnique({
      where: { id: dto.registerId },
    });
    if (!register) throw new NotFoundException('Register not found');
    if (!register.isActive) throw new BadRequestException('Register inactive');

    const existing = await this.prisma.posSession.findFirst({
      where: { registerId: dto.registerId, status: 'OPEN' },
    });
    if (existing) {
      throw new ConflictException(
        `Register already has an open session (${existing.id})`,
      );
    }

    return this.prisma.posSession.create({
      data: {
        registerId: dto.registerId,
        openedById: userId,
        openingBalance: dto.openingBalance,
      },
    });
  }

  async closeSession(sessionId: string, dto: CloseSessionDto, userId: string) {
    const session = await this.prisma.posSession.findUnique({
      where: { id: sessionId },
      include: {
        cashEvents: true,
        sales: { include: { payments: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'CLOSED') {
      throw new BadRequestException('Session already closed');
    }

    const expected = this.computeExpectedBalance(session);
    const variance = dto.countedBalance - expected;
    const needsApproval =
      Math.abs(variance) > VARIANCE_APPROVAL_THRESHOLD_POISHA;

    if (needsApproval && !dto.varianceApprovedById) {
      throw new ForbiddenException(
        `Variance ${variance} poisha exceeds threshold; approval required`,
      );
    }

    return this.prisma.posSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closedById: userId,
        closedAt: new Date(),
        countedBalance: dto.countedBalance,
        expectedBalance: expected,
        variance,
        varianceNote: dto.varianceNote,
        varianceApprovedById: dto.varianceApprovedById ?? null,
      },
    });
  }

  async recordCashEvent(sessionId: string, dto: CashEventDto, userId: string) {
    const session = await this.prisma.posSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'OPEN') {
      throw new BadRequestException('Session is not open');
    }

    return this.prisma.posCashEvent.create({
      data: {
        sessionId,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason,
        actorId: userId,
      },
    });
  }

  private computeExpectedBalance(session: {
    openingBalance: number;
    cashEvents: { type: string; amount: number }[];
    sales: { payments: { method: string; amount: number }[] }[];
  }): number {
    let balance = session.openingBalance;
    for (const ev of session.cashEvents) {
      balance += ev.type === 'CASH_IN' ? ev.amount : -ev.amount;
    }
    for (const sale of session.sales) {
      for (const p of sale.payments) {
        if (p.method === 'CASH') balance += p.amount;
      }
    }
    return balance;
  }

  // ================= SALE =================

  async createSale(dto: CreatePosSaleDto, cashierId: string) {
    const register = await this.prisma.register.findUnique({
      where: { id: dto.registerId },
    });
    if (!register) throw new NotFoundException('Register not found');

    const session = await this.prisma.posSession.findFirst({
      where: { registerId: dto.registerId, status: 'OPEN' },
    });
    if (!session) {
      throw new BadRequestException('No open session on this register');
    }

    // ---- Server-side totals (never trust client) ----
    let subtotal = 0;
    for (const item of dto.items) {
      const lineTotal = (item.unitPrice - (item.discount ?? 0)) * item.quantity;
      if (lineTotal < 0) {
        throw new BadRequestException('Negative line total not allowed');
      }
      subtotal += lineTotal;
    }

    const total = subtotal - dto.discount + (dto.tax ?? 0);
    if (total < 0) throw new BadRequestException('Negative total not allowed');

    const paidAmount = dto.payments.reduce((s, p) => s + p.amount, 0);
    if (paidAmount < total) {
      throw new BadRequestException(
        `Underpaid: total=${total} poisha, paid=${paidAmount} poisha`,
      );
    }
    const changeAmount = paidAmount - total;

    // ---- Receipt number per branch ----
    const todayCount = await this.prisma.posSale.count({
      where: { branchId: register.branchId },
    });
    const receiptNumber = `POS-${register.branchId.slice(-4).toUpperCase()}-${String(
      todayCount + 1,
    ).padStart(6, '0')}`;

    // ---- Resolve ledger accounts once (before tx) ----
    const requireAccount = async (code: string, label: string) => {
      const acc = await this.coa.findLedgerAccountByCode(code);
      if (!acc) {
        throw new BadRequestException(
          `Ledger account not found for ${label} (code=${code}); run COA seed`,
        );
      }
      return acc;
    };

    const cashAccount  = await requireAccount(LEDGER_CODES.CASH,  'Cash');
    const bankAccount  = await requireAccount(LEDGER_CODES.BANK,  'Bank');
    const mfsAccount   = await requireAccount(LEDGER_CODES.MFS,   'MFS');
    const salesAccount = await requireAccount(LEDGER_CODES.SALES, 'Sales Revenue');

    const accountFor = (m: PosPaymentMethodDto) => {
      if (m === PosPaymentMethodDto.CASH) return cashAccount;
      if (m === PosPaymentMethodDto.CARD) return bankAccount;
      return mfsAccount;
    };

    // ---- ONE TRANSACTION ----
    return this.prisma.$transaction(async (tx) => {
      // 1) Branch stock decrement (conditional UPDATE — no oversell)
      for (const item of dto.items) {
        const affected = await tx.$executeRaw`
          UPDATE "branch_stock"
          SET quantity = quantity - ${item.quantity}
          WHERE "branchId" = ${register.branchId}
            AND "variantId" = ${item.variantId}
            AND quantity >= ${item.quantity}
        `;
        if (affected === 0) {
          throw new ConflictException(
            `Insufficient branch stock for variant ${item.variantId}`,
          );
        }
      }

      // 2) Create sale + items + payments
      const sale = await tx.posSale.create({
        data: {
          branchId: register.branchId,
          registerId: dto.registerId,
          sessionId: session.id,
          cashierId,
          customerId: dto.customerId,
          receiptNumber,
          subtotal,
          discount: dto.discount,
          tax: dto.tax ?? 0,
          total,
          paidAmount,
          changeAmount,
          notes: dto.notes,
          items: {
            create: dto.items.map((it) => ({
              variantId: it.variantId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discount: it.discount ?? 0,
              lineTotal: (it.unitPrice - (it.discount ?? 0)) * it.quantity,
            })),
          },
          payments: {
            create: dto.payments.map((p) => ({
              method: p.method as any,
              amount: p.amount,
              reference: p.reference,
            })),
          },
        },
        include: { items: true, payments: true },
      });

      // 3) Ledger posting — one line per payment method + sales credit
      const journalLines: Array<{
        ledgerAccountId: string;
        debit: number;
        credit: number;
        description?: string;
      }> = [];

      for (const p of dto.payments) {
        const acc = accountFor(p.method);
        journalLines.push({
          ledgerAccountId: acc.id,
          debit: p.amount,
          credit: 0,
          description: `POS ${p.method} received`,
        });
      }

      journalLines.push({
        ledgerAccountId: salesAccount.id,
        debit: 0,
        credit: total,
        description: `POS sale ${receiptNumber}`,
      });

      // If payments exceed total (change given), debit cash by net change
      // Simplest handling: reduce the cash debit by changeAmount if CASH was used.
      if (changeAmount > 0) {
        const cashLine = journalLines.find(
          (l) => l.ledgerAccountId === cashAccount.id,
        );
        if (cashLine) {
          cashLine.debit -= changeAmount;
        } else {
          // Edge: change on non-cash (rare). Post a credit on cash.
          journalLines.push({
            ledgerAccountId: cashAccount.id,
            debit: 0,
            credit: changeAmount,
            description: 'Change given',
          });
        }
      }

      // Filter out zero lines and rebalance if needed
      const cleanLines = journalLines.filter(
        (l) => l.debit !== 0 || l.credit !== 0,
      );

      await this.ledger.postEntry(
        {
          entryDate: new Date().toISOString(),
          description: `POS sale ${receiptNumber}`,
          sourceType: 'POS_SALE',
          sourceId: sale.id,
          branchId: register.branchId,
          lines: cleanLines,
        },
        { tx, status: 'POSTED' },
      );

      return sale;
    });
  }

  // ================= BRANCH STOCK =================

  async getBranchStock(branchId: string, variantId?: string) {
    return this.prisma.branchStock.findMany({
      where: { branchId, ...(variantId ? { variantId } : {}) },
      // NOTE: BranchStock has variantId field but no ariant relation yet.
    });
  }

  // ================= STOCK TRANSFER =================

  async createTransfer(dto: CreateStockTransferDto, userId: string) {
    if (dto.fromBranchId === dto.toBranchId) {
      throw new BadRequestException('Cannot transfer to same branch');
    }

    const count = await this.prisma.stockTransfer.count();
    const transferNumber = `TRF-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.stockTransfer.create({
      data: {
        transferNumber,
        fromBranchId: dto.fromBranchId,
        toBranchId: dto.toBranchId,
        createdById: userId,
        notes: dto.notes,
        items: {
          create: dto.items.map((it) => ({
            variantId: it.variantId,
            quantity: it.quantity,
          })),
        },
      },
      include: { items: true },
    });
  }

  async dispatchTransfer(transferId: string, userId: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT transfers can be dispatched');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const affected = await tx.$executeRaw`
          UPDATE "branch_stock"
          SET quantity = quantity - ${item.quantity}
          WHERE "branchId" = ${transfer.fromBranchId}
            AND "variantId" = ${item.variantId}
            AND quantity >= ${item.quantity}
        `;
        if (affected === 0) {
          throw new ConflictException(
            `Insufficient stock at source branch for variant ${item.variantId}`,
          );
        }
      }

      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: 'DISPATCHED',
          dispatchedById: userId,
          dispatchedAt: new Date(),
        },
      });
    });
  }

  async receiveTransfer(transferId: string, userId: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'DISPATCHED') {
      throw new BadRequestException('Only DISPATCHED transfers can be received');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        await tx.branchStock.upsert({
          where: {
            branchId_variantId: {
              branchId: transfer.toBranchId,
              variantId: item.variantId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            branchId: transfer.toBranchId,
            variantId: item.variantId,
            quantity: item.quantity,
          },
        });
      }

      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: 'RECEIVED',
          receivedById: userId,
          receivedAt: new Date(),
        },
      });
    });
  }
}