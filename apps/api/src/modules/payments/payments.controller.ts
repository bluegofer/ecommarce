// Payment endpoints (TDD §6.8).
// - POST /payments/initiate       (auth: customer OR guest order owner)
// - POST /payments/webhook/:provider  (public; signature verified inside service)
// - POST /payments/refund         (admin: FINANCE roles)
// - GET  /payments/transactions   (admin: FINANCE + ORDER_SUPPORT, list of all payments)
// - GET  /payments/refunds        (admin: FINANCE, list of refunded payments)
//
// Webhook accepts raw body — main.ts enables rawBody globally for this route.
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { PaymentsService } from './payments.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { PaymentProvider } from '@ecommarce/types';

interface RequestUser {
  userId: string;
  roles: string[];
}

interface InitiateDto {
  orderId: string;
  provider: PaymentProvider;
  callbackUrl: string;
}

interface RefundDto {
  paymentId: string;
  amountPoisha: number;
  reason: string;
}

const ALLOWED_PROVIDERS: PaymentProvider[] = ['BKASH', 'NAGAD', 'SSLCOMMERZ', 'COD'];

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('initiate')
  async initiate(
    @Body() dto: InitiateDto,
    @CurrentUser() user: RequestUser,
    @Headers('idempotency-key') idemKey: string | undefined,
  ) {
    if (!dto.orderId || !dto.provider || !dto.callbackUrl) {
      throw new BadRequestException('orderId, provider, callbackUrl are required');
    }
    if (!ALLOWED_PROVIDERS.includes(dto.provider)) {
      throw new BadRequestException(`unsupported provider: ${dto.provider}`);
    }
    const key = idemKey ?? `initiate-${dto.orderId}-${dto.provider}`;
    const result = await this.payments.initiate(dto.orderId, dto.provider, dto.callbackUrl, key);
    return { ok: true, userId: user?.userId, result };
  }

  @Public()
  @Post('webhook/:provider')
  @HttpCode(200)
  async webhook(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string | undefined,
    @Headers() headers: Record<string, string>,
  ) {
    const providerUpper = provider.toUpperCase() as PaymentProvider;
    if (!ALLOWED_PROVIDERS.includes(providerUpper)) {
      throw new BadRequestException(`unsupported provider: ${provider}`);
    }
    const rawBody =
      req.rawBody?.toString('utf8') ??
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));

    const verified = await this.payments.verifyWebhook(
      providerUpper,
      rawBody,
      signature,
      headers,
    );
    if (!verified.ok || !verified.event) {
      throw new BadRequestException(verified.reason ?? 'invalid webhook');
    }

    const applied = await this.payments.applyWebhook(verified.event);
    return { ok: applied.ok, reason: applied.reason ?? null, eventId: verified.event.eventId };
  }

  @Roles('SUPER_ADMIN', 'FINANCE')
  @Post('refund')
  async refund(
    @Body() dto: RefundDto,
    @Headers('idempotency-key') idemKey: string | undefined,
  ) {
    if (!dto.paymentId || !dto.amountPoisha || dto.amountPoisha <= 0) {
      throw new BadRequestException('paymentId and positive amountPoisha are required');
    }
    const key = idemKey ?? `refund-${dto.paymentId}-${dto.amountPoisha}`;
    const result = await this.payments.refund(
      dto.paymentId,
      dto.amountPoisha,
      dto.reason ?? 'admin refund',
      key,
    );
    return { ok: result.ok, result };
  }

  /**
   * List all payments for the admin console (Transactions tab).
   * Admin-only. Returns a flat shape that the payments page expects:
   *   { id, orderNumber, gateway, amountPoisha, status, reference, createdAt }
   */
  @Get('transactions')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY', 'ORDER_SUPPORT')
  async listTransactions() {
    const rows = await this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { order: { select: { orderNumber: true } } },
    });
    return rows.map((p) => {
      const refunded = p.refundedPoisha ?? 0;
      const status =
        refunded > 0
          ? refunded >= p.amountPoisha
            ? 'REFUNDED'
            : 'PARTIAL_REFUND'
          : p.status;
      return {
        id: p.id,
        orderNumber: p.order?.orderNumber ?? null,
        gateway: p.method,
        amountPoisha: p.amountPoisha,
        status,
        reference: p.gatewayRef,
        createdAt: p.createdAt.toISOString(),
      };
    });
  }

  /**
   * List refunded payments for the admin console (Refunds tab).
   * Admin-only. Returns only rows where refundedPoisha > 0.
   */
  @Get('refunds')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  async listRefunds() {
    const rows = await this.prisma.payment.findMany({
      where: { refundedPoisha: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { order: { select: { orderNumber: true } } },
    });
    return rows.map((p) => ({
      id: p.id,
      orderNumber: p.order?.orderNumber ?? null,
      amountPoisha: p.refundedPoisha,
      status: p.refundedPoisha >= p.amountPoisha ? 'COMPLETED' : 'PROCESSING',
      createdAt: p.createdAt.toISOString(),
    }));
  }
}