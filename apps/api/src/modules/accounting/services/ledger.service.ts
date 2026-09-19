// packages/api/src/modules/accounting/services/ledger.service.ts
// Double-entry ledger service. All money = integer poisha.
// Invariants (also enforced at DB level via Step 9.3 trigger):
//   - >= 2 lines per entry
//   - sum(debit) == sum(credit) per POSTED entry
//   - each line one-sided: (debit>0 && credit==0) OR (debit==0 && credit>0)
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type {
  CreateJournalEntryInput,
  JournalEntryStatus,
  JournalSourceType,
} from '@ecommarce/types';

export interface PostEntryOptions {
  tx?: Prisma.TransactionClient;
  status?: JournalEntryStatus;
  postedById?: string;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextEntryNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const count = await tx.journalEntry.count({
      where: { entryNumber: { startsWith: `JE-${ym}-` } },
    });
    return `JE-${ym}-${String(count + 1).padStart(6, '0')}`;
  }

  private validateLines(input: CreateJournalEntryInput): void {
    if (!input.lines || input.lines.length < 2) {
      throw new BadRequestException('A journal entry requires at least 2 lines');
    }
    let sumDebit = 0;
    let sumCredit = 0;
    for (const line of input.lines) {
      const d = line.debit ?? 0;
      const c = line.credit ?? 0;
      if (d < 0 || c < 0) throw new BadRequestException('debit/credit must be >= 0');
      if (d > 0 && c > 0) {
        throw new BadRequestException('A journal line must be one-sided: debit OR credit, not both');
      }
      if (d === 0 && c === 0) {
        throw new BadRequestException('A journal line cannot be zero on both sides');
      }
      sumDebit += d;
      sumCredit += c;
    }
    if (sumDebit !== sumCredit) {
      throw new BadRequestException(
        `Journal entry is out of balance: debit=${sumDebit} credit=${sumCredit}`,
      );
    }
  }

  async postEntry(input: CreateJournalEntryInput, opts: PostEntryOptions = {}) {
    this.validateLines(input);

    const run = async (tx: Prisma.TransactionClient) => {
      const entryNumber = await this.nextEntryNumber(tx);
      const status: JournalEntryStatus = opts.status ?? 'DRAFT';
      const sumDebit = input.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
      const sumCredit = input.lines.reduce((s, l) => s + (l.credit ?? 0), 0);

      const entry = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate: new Date(input.entryDate),
          description: input.description,
          status,
          sourceType: (input.sourceType ?? 'MANUAL') as JournalSourceType,
          sourceId: input.sourceId,
          branchId: input.branchId,
          reversalOfId: input.reversalOfId,
          totalDebit: sumDebit,
          totalCredit: sumCredit,
          postedAt: status === 'POSTED' ? new Date() : null,
          postedById: status === 'POSTED' ? opts.postedById : null,
          lines: {
            create: input.lines.map((l) => ({
              ledgerAccountId: l.ledgerAccountId,
              debit: l.debit ?? 0,
              credit: l.credit ?? 0,
              description: l.description,
            })),
          },
        },
        include: { lines: true },
      });

      if (status === 'POSTED') {
        await this.applyBalances(tx, entry.lines);
      }

      return entry;
    };

    if (opts.tx) return run(opts.tx);
    return this.prisma.$transaction(run);
  }

  async postDraft(entryId: string, postedById?: string) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const entry = await tx.journalEntry.findUnique({
        where: { id: entryId },
        include: { lines: true },
      });
      if (!entry) throw new NotFoundException(`Journal entry ${entryId} not found`);
      if (entry.status !== 'DRAFT') {
        throw new BadRequestException(`Only DRAFT entries can be posted (current: ${entry.status})`);
      }

      const sumDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
      const sumCredit = entry.lines.reduce((s, l) => s + l.credit, 0);
      if (sumDebit !== sumCredit) {
        throw new BadRequestException(
          `Cannot post unbalanced entry: debit=${sumDebit} credit=${sumCredit}`,
        );
      }

      const updated = await tx.journalEntry.update({
        where: { id: entryId },
        data: { status: 'POSTED', postedAt: new Date(), postedById },
        include: { lines: true },
      });

      await this.applyBalances(tx, updated.lines);
      return updated;
    });
  }

  private async applyBalances(
    tx: Prisma.TransactionClient,
    lines: { ledgerAccountId: string; debit: number; credit: number }[],
  ): Promise<void> {
    const deltas = new Map<string, number>();
    for (const line of lines) {
      const delta = line.debit - line.credit;
      deltas.set(line.ledgerAccountId, (deltas.get(line.ledgerAccountId) ?? 0) + delta);
    }
    for (const [accountId, delta] of deltas.entries()) {
      await tx.ledgerAccount.update({
        where: { id: accountId },
        data: { currentBalance: { increment: delta } },
      });
    }
  }

  async findById(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: { include: { ledgerAccount: true } } },
    });
    if (!entry) throw new NotFoundException(`Journal entry ${id} not found`);
    return entry;
  }

  async list(params: {
    from?: string;
    to?: string;
    sourceType?: JournalSourceType;
    status?: JournalEntryStatus;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.JournalEntryWhereInput = {};
    if (params.from || params.to) {
      where.entryDate = {};
      if (params.from) where.entryDate.gte = new Date(params.from);
      if (params.to) where.entryDate.lte = new Date(params.to);
    }
    if (params.sourceType) where.sourceType = params.sourceType;
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        orderBy: { entryDate: 'desc' },
        take: params.limit ?? 50,
        skip: params.offset ?? 0,
        include: { lines: true },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);
    return { items, total };
  }

  async reverse(entryId: string, reason: string, postedById?: string) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const original = await tx.journalEntry.findUnique({
        where: { id: entryId },
        include: { lines: true },
      });
      if (!original) throw new NotFoundException(`Journal entry ${entryId} not found`);
      if (original.status !== 'POSTED') {
        throw new BadRequestException('Only POSTED entries can be reversed');
      }

      const entryNumber = await this.nextEntryNumber(tx);
      const reversal = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate: new Date(),
          description: `Reversal of ${original.entryNumber}: ${reason}`,
          status: 'POSTED',
          sourceType: 'REVERSAL',
          sourceId: original.id,
          branchId: original.branchId,
          reversalOfId: original.id,
          totalDebit: original.totalCredit,
          totalCredit: original.totalDebit,
          postedAt: new Date(),
          postedById,
          lines: {
            create: original.lines.map((l) => ({
              ledgerAccountId: l.ledgerAccountId,
              debit: l.credit,
              credit: l.debit,
              description: `Reversal: ${l.description ?? ''}`.trim(),
            })),
          },
        },
        include: { lines: true },
      });

      await tx.journalEntry.update({ where: { id: original.id }, data: { status: 'VOID' } });

      await this.applyBalances(tx, reversal.lines);
      await this.applyBalances(
        tx,
        original.lines.map((l) => ({
          ledgerAccountId: l.ledgerAccountId,
          debit: l.credit,
          credit: l.debit,
        })),
      );

      return reversal;
    });
  }
}