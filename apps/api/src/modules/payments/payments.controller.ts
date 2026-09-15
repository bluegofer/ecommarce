// Payment endpoints (TDD §6.8).
// - POST /payments/initiate       (auth: customer OR guest order owner)
// - POST /payments/webhook/:provider  (public; signature verified inside service)
// - POST /payments/refund         (admin: FINANCE roles)
//
// Webhook accepts raw body — main.ts enables rawBody globally for this route.
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
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
  constructor(private readonly payments: PaymentsService) {}

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
}