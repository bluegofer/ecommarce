import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Request } from 'express';
import { from, Observable, of, switchMap } from 'rxjs';

import { PrismaService } from '../../database/prisma.service';

const IDEMPOTENCY_HEADER = 'idempotency-key';
const TTL_HOURS = 24;

/**
 * IdempotencyInterceptor - reads the Idempotency-Key header.
 * On first call: stores request hash + response (SYNCHRONOUSLY, before the response is sent).
 * On replay: returns the stored response without re-executing the handler.
 *
 * TDD section 11.2 - order and payment endpoints must be retry-safe.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.header(IDEMPOTENCY_HEADER);
    if (!key) return next.handle();

    if (key.length < 8 || key.length > 120) {
      throw new BadRequestException('Idempotency-Key must be 8-120 characters');
    }

    const requestHash = this.hash({
      method: req.method,
      url: req.originalUrl,
      body: req.body,
    });

    const existing = await this.prisma.idempotencyKey.findUnique({ where: { key } });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new BadRequestException('Idempotency-Key reused with different payload');
      }
      if (existing.responseBody) {
        return of(existing.responseBody);
      }
      // In-flight - first call not yet completed (rare; retry-safe)
      return next.handle();
    }

    const expiresAt = new Date(Date.now() + TTL_HOURS * 3600 * 1000);
    const userId = (req as Request & { user?: { userId: string } }).user?.userId ?? null;

    await this.prisma.idempotencyKey.create({
      data: {
        key,
        userId,
        endpoint: `${req.method} ${req.originalUrl}`.slice(0, 255),
        requestHash,
        expiresAt,
      },
    });

    return next.handle().pipe(
      switchMap((response) =>
        from(
          this.prisma.idempotencyKey
            .update({
              where: { key },
              data: {
                responseBody: response as object,
                statusCode: 200,
              },
            })
            .then(() => response)
            .catch(() => response),
        ),
      ),
    );
  }

  private hash(input: unknown): string {
    return createHash('sha256').update(JSON.stringify(input)).digest('hex');
  }
}