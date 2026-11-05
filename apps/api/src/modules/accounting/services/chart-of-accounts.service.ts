// packages/api/src/modules/accounting/services/chart-of-accounts.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { AccountType, NormalBalance, CreateLedgerAccountInput } from '@ecommarce/types';

export interface CreateCoaInput {
  code: string;
  name: string;
  nameBn?: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId?: string;
  isLeaf?: boolean;
  description?: string;
}

@Injectable()
export class ChartOfAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.chartOfAccounts.findMany({ orderBy: { code: 'asc' } });
  }

  async tree() {
    const all = await this.prisma.chartOfAccounts.findMany({ orderBy: { code: 'asc' } });
    type CoaNode = (typeof all)[number] & { children: CoaNode[] };
    const byId = new Map<string, CoaNode>(all.map((a) => [a.id, { ...a, children: [] }]));
    const roots: CoaNode[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async findById(id: string) {
    const coa = await this.prisma.chartOfAccounts.findUnique({
      where: { id },
      include: { ledgerAccounts: true },
    });
    if (!coa) throw new NotFoundException(`Chart of account ${id} not found`);
    return coa;
  }

  async findByCode(code: string) {
    return this.prisma.chartOfAccounts.findUnique({ where: { code } });
  }

  async create(input: CreateCoaInput) {
    const existing = await this.prisma.chartOfAccounts.findUnique({ where: { code: input.code } });
    if (existing) throw new BadRequestException(`COA code ${input.code} already exists`);
    return this.prisma.chartOfAccounts.create({ data: input });
  }

  async createLedgerAccount(input: CreateLedgerAccountInput) {
    const coa = await this.prisma.chartOfAccounts.findUnique({ where: { id: input.accountId } });
    if (!coa) throw new BadRequestException(`Chart of account ${input.accountId} not found`);

    const codeExists = await this.prisma.ledgerAccount.findUnique({ where: { code: input.code } });
    if (codeExists) throw new BadRequestException(`Ledger code ${input.code} already exists`);

    return this.prisma.ledgerAccount.create({
      data: {
        code: input.code,
        name: input.name,
        nameBn: input.nameBn,
        accountId: input.accountId,
        kind: input.kind,
        openingBalance: input.openingBalance ?? 0,
        currentBalance: input.openingBalance ?? 0,
        notes: input.notes,
      },
    });
  }

  async listLedgerAccounts() {
    return this.prisma.ledgerAccount.findMany({
      orderBy: { code: 'asc' },
      include: { chartOfAccount: true },
    });
  }

  async findLedgerAccountById(id: string) {
    const la = await this.prisma.ledgerAccount.findUnique({
      where: { id },
      include: { chartOfAccount: true },
    });
    if (!la) throw new NotFoundException(`Ledger account ${id} not found`);
    return la;
  }

  async findLedgerAccountByCode(code: string) {
    return this.prisma.ledgerAccount.findUnique({ where: { code } });
  }
}