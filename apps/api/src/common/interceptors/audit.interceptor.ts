import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

import { AuthUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';

/**
 * AuditInterceptor - records who/what/when for every mutating request
 * into audit_log (TDD section 6.13).
 *
 * Never blocks the request - logging failures are swallowed so a broken
 * audit write cannot take down the API.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      user?: AuthUser;
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
      body?: unknown;
    }>();

    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = req.user;
    const userAgent = (req.headers['user-agent'] as string | undefined) ?? null;
    const ipAddress = req.ip ?? null;
    const entityType = this.guessEntityType(req.url);

    return next.handle().pipe(
      tap({
        next: () => {
          void this.writeAudit({
            userId: user?.userId ?? null,
            actorRole: user?.roles?.[0] ?? null,
            action: `${method} ${req.url}`,
            entityType,
            entityId: null,
            before: null,
            after: null,
            ipAddress,
            userAgent,
          });
        },
        error: () => {
          void this.writeAudit({
            userId: user?.userId ?? null,
            actorRole: user?.roles?.[0] ?? null,
            action: `${method} ${req.url} (failed)`,
            entityType,
            entityId: null,
            before: null,
            after: null,
            ipAddress,
            userAgent,
          });
        },
      }),
    );
  }

  /**
   * Extract entity type from URL.
   * /api/v1/auth/register -> "auth"
   * /api/v1/products/123   -> "products"
   */
  private guessEntityType(url: string): string {
    const parts = url.split('/').filter(Boolean);
    // parts[0] = "api", parts[1] = "v1", parts[2] = entity
    const candidate = parts[2] ?? 'unknown';
    return candidate.slice(0, 50);
  }

  private async writeAudit(data: {
    userId: string | null;
    actorRole: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    before: unknown;
    after: unknown;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          actorRole: data.actorRole,
          action: data.action.slice(0, 80),
          entityType: data.entityType,
          entityId: data.entityId,
          before: (data.before as object) ?? undefined,
          after: (data.after as object) ?? undefined,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Audit write failed:', err);
    }
  }
}