// apps/api/src/modules/audit/audit.service.ts
// B-10 fix — expose audit_log reads to admin (TDD §6.13).
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuditEntryDto {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q?: string, limit = 200): Promise<AuditEntryDto[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: q
        ? {
            OR: [
              { action: { contains: q, mode: 'insensitive' } },
              { entityType: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(500, Math.max(1, limit)),
      include: { user: { select: { fullName: true, phone: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      actorName: r.user?.fullName ?? r.user?.phone ?? 'system',
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      before: r.before,
      after: r.after,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}