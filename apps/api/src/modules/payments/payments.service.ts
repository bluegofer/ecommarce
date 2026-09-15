// PaymentsService — provider-agnostic entry point for initiate / webhook /
// refund. Actual gateway calls go through the adapter registry (Step 13.2);
// webhook + controller wiring land in Step 13.3.
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PAYMENT_ADAPTERS } from './payment-adapter.interface';
import type { PaymentAdapterRegistry } from './payment-adapter.interface';
import type {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  PaymentWebhookEvent,
  RefundInput,
  RefundResult,
  WebhookVerifyResult,
} from '@ecommarce/types';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_ADAPTERS) private readonly adapters: PaymentAdapterRegistry,
  ) {}

  /**
   * Creates (or reuses) a payment intent for an order. Idempotent per order:
   * if a PENDING payment row already exists for the same provider, we reuse
   * its gateway ref instead of creating a duplicate (TDD §11.2).
   */
  async initiate(
    orderId: string,
    provider: PaymentProvider,
    callbackUrl: string,
    idempotencyKey: string,
  ): Promise<PaymentIntentResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('order not found');

    const existing = order.payments.find(
      (p) => p.method === provider && p.status === 'PENDING' && p.gatewayRef,
    );
    if (existing && existing.gatewayRef) {
      this.logger.log(`Reusing pending ${provider} intent for order=${order.orderNumber}`);
      return {
        provider,
        providerIntentId: existing.gatewayRef,
        redirectUrl: this.buildRedirectForReuse(provider, existing.gatewayRef),
        status: 'PENDING',
        rawResponse: { reused: true },
      };
    }

    const adapter = this.adapters.get(provider);
    const input: PaymentIntentInput = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountPoisha: order.totalPoisha,
      currency: 'BDT',
      provider,
      customerPhone: order.contactPhone,
      customerEmail: order.contactEmail ?? undefined,
      callbackUrl,
      idempotencyKey,
    };
    const result = await adapter.initiate(input);

    await this.prisma.payment.updateMany({
      where: { orderId: order.id, method: provider, status: 'PENDING' },
      data: {
        gatewayRef: result.providerIntentId,
        gatewayMeta: result.rawResponse as object,
      },
    });

    return result;
  }

  /** Verifies a webhook payload via the adapter. Controller calls this in 13.3. */
  async verifyWebhook(
    provider: PaymentProvider,
    rawBody: string,
    signature: string | undefined,
    headers: Record<string, string>,
  ): Promise<WebhookVerifyResult> {
    const adapter = this.adapters.get(provider);
    return adapter.verifyWebhook({ provider, rawBody, signatureHeader: signature, headers });
  }

  /**
   * Applies a verified webhook to the payment row. Idempotent — repeat events
   * for the same provider/gatewayRef are a no-op (TDD §11.2). Order + ledger
   * side effects are wired in Step 13.3.
   */
  async applyWebhook(event: PaymentWebhookEvent): Promise<{ ok: boolean; reason?: string }> {
    if (event.status === 'PENDING') {
      return { ok: true, reason: 'no-op pending' };
    }

    const payment = await this.prisma.payment.findFirst({
      where: { gatewayRef: event.providerIntentId, method: event.provider },
    });
    if (!payment) {
      return { ok: false, reason: `no payment row for ${event.providerIntentId}` };
    }
    if (payment.status === 'PAID' && event.status === 'PAID') {
      return { ok: true, reason: 'duplicate' };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: event.status,
        paidAt: event.status === 'PAID' ? new Date() : payment.paidAt,
        gatewayMeta: event.raw as object,
      },
    });
    return { ok: true };
  }

  /** Initiates a refund via the adapter. Ledger + order hooks land in 13.3. */
  async refund(
    paymentId: string,
    amountPoisha: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<RefundResult> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('payment not found');
    if (!payment.gatewayRef) throw new BadRequestException('payment has no gatewayRef');
    if (amountPoisha <= 0) throw new BadRequestException('refund amount must be > 0');
    if (payment.refundedPoisha + amountPoisha > payment.amountPoisha) {
      throw new BadRequestException('refund exceeds captured amount');
    }

    const adapter = this.adapters.get(payment.method);
    const input: RefundInput = {
      provider: payment.method,
      providerIntentId: payment.gatewayRef,
      amountPoisha,
      reason,
      idempotencyKey,
    };
    const result = await adapter.refund(input);

    if (result.ok) {
      const newRefunded = payment.refundedPoisha + amountPoisha;
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundedPoisha: newRefunded,
          status: newRefunded >= payment.amountPoisha ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });
    }
    return result;
  }

  private buildRedirectForReuse(provider: PaymentProvider, ref: string): string | undefined {
    if (provider === 'COD') return undefined;
    const lower = provider.toLowerCase();
    return `https://mock-gateway.local/${lower}/checkout?intent=${ref}`;
  }
}