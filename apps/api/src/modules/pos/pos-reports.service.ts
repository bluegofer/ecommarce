import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface RangeInput {
  from?: string;
  to?: string;
}

export interface DailyReportRow {
  date: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  saleCount: number;
  grossPoisha: number;
  discountPoisha: number;
  netPoisha: number;
}

export interface BranchReportRow {
  branchId: string;
  branchCode: string;
  branchName: string;
  saleCount: number;
  grossPoisha: number;
  discountPoisha: number;
  netPoisha: number;
  cashPoisha: number;
  cardPoisha: number;
  mfsPoisha: number;
}

@Injectable()
export class PosReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveRange(input: RangeInput): { from: Date; to: Date } {
    const to = input.to ? new Date(input.to) : new Date();
    const from = input.from
      ? new Date(input.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000); // last 30 days
    return { from, to };
  }

  /** AC-38: Daily sales report per branch */
  async dailyReport(input: RangeInput): Promise<DailyReportRow[]> {
    const { from, to } = this.resolveRange(input);

    const sales = await this.prisma.posSale.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { not: 'VOIDED' },
      },
      include: {
        branch: { select: { id: true, code: true, name: true } },
      },
    });

    const map = new Map<string, DailyReportRow>();
    for (const s of sales) {
      const date = s.createdAt.toISOString().slice(0, 10);
      const key = `${date}|${s.branchId}`;
      const existing = map.get(key) ?? {
        date,
        branchId: s.branchId,
        branchCode: s.branch.code,
        branchName: s.branch.name,
        saleCount: 0,
        grossPoisha: 0,
        discountPoisha: 0,
        netPoisha: 0,
      };
      existing.saleCount += 1;
      existing.grossPoisha += s.subtotal;
      existing.discountPoisha += s.discount;
      existing.netPoisha += s.total;
      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.date === b.date
        ? a.branchCode.localeCompare(b.branchCode)
        : b.date.localeCompare(a.date),
    );
  }

  /** AC-38: Branch-wise sales report (aggregated, method-wise split) */
  async branchReport(input: RangeInput): Promise<BranchReportRow[]> {
    const { from, to } = this.resolveRange(input);

    const sales = await this.prisma.posSale.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { not: 'VOIDED' },
      },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        payments: true,
      },
    });

    const map = new Map<string, BranchReportRow>();
    for (const s of sales) {
      const key = s.branchId;
      const existing = map.get(key) ?? {
        branchId: s.branchId,
        branchCode: s.branch.code,
        branchName: s.branch.name,
        saleCount: 0,
        grossPoisha: 0,
        discountPoisha: 0,
        netPoisha: 0,
        cashPoisha: 0,
        cardPoisha: 0,
        mfsPoisha: 0,
      };
      existing.saleCount += 1;
      existing.grossPoisha += s.subtotal;
      existing.discountPoisha += s.discount;
      existing.netPoisha += s.total;
      for (const p of s.payments) {
        if (p.method === 'CASH') existing.cashPoisha += p.amount;
        else if (p.method === 'CARD') existing.cardPoisha += p.amount;
        else existing.mfsPoisha += p.amount;
      }
      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.branchCode.localeCompare(b.branchCode),
    );
  }

  /** CSV for daily report (raw string; controller sets content-type) */
  async dailyReportCsv(input: RangeInput): Promise<string> {
    const rows = await this.dailyReport(input);
    const header =
      'date,branchCode,branchName,saleCount,grossPoisha,discountPoisha,netPoisha\n';
    const body = rows
      .map(
        (r) =>
          `${r.date},${r.branchCode},"${r.branchName}",${r.saleCount},${r.grossPoisha},${r.discountPoisha},${r.netPoisha}`,
      )
      .join('\n');
    return header + body;
  }

  /** CSV for branch report */
  async branchReportCsv(input: RangeInput): Promise<string> {
    const rows = await this.branchReport(input);
    const header =
      'branchCode,branchName,saleCount,grossPoisha,discountPoisha,netPoisha,cashPoisha,cardPoisha,mfsPoisha\n';
    const body = rows
      .map(
        (r) =>
          `${r.branchCode},"${r.branchName}",${r.saleCount},${r.grossPoisha},${r.discountPoisha},${r.netPoisha},${r.cashPoisha},${r.cardPoisha},${r.mfsPoisha}`,
      )
      .join('\n');
    return header + body;
  }
}