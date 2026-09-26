// PaymentsService — provider-agnostic entry point for initiate / webhook /
// refund. Actual gateway calls go through the adapter registry (Step 13.2);
// webhook + controller wiring land in Step 13.3.
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
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
    private readonly ledger: LedgerService,
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

    // A.5 chain #4 — Website Orders -> Accounting.
    // Post revenue at PAID for prepaid methods (bKash/Nagad/SSLCommerz).
    // COD is offline; its revenue posts at DELIVERED (OrdersService hook).
    // Idempotency guaranteed by (sourceType=ORDER, sourceId=orderId).
    if (event.status === 'PAID' && payment.method !== 'COD') {
      await this.postRevenueOnPaid(payment.orderId);
    }

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

  /**
   * A.5 chain #4 — post revenue when a prepaid payment is confirmed PAID.
   * Idempotent via (sourceType=ORDER, sourceId=orderId): if the delivery
   * hook already posted (unlikely but possible via re-queue), no-op.
   * TDD §6.8 (revenue on verified payment) + §11.4 (money correctness).
   */
  private async postRevenueOnPaid(orderId: string): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { payments: true },
      });
      if (!order) return;

      // Idempotency — same key the delivery hook uses.
      const existing = await this.prisma.journalEntry.findFirst({
        where: { sourceType: 'ORDER', sourceId: order.id },
      });
      if (existing) return;

      const paidPayment = order.payments.find((p) => p.status === 'PAID');
      if (!paidPayment) return;

      const method = paidPayment.method;
      const debitCode =
        method === 'BKASH' || method === 'NAGAD'
          ? '1020-MFS'
          : '1010-BANK';

      const debit = await this.prisma.ledgerAccount.findUnique({ where: { code: debitCode } });
      const sales = await this.prisma.ledgerAccount.findUnique({ where: { code: '4000-SALES' } });
      if (!debit || !sales) {
        this.logger.warn(
          `postRevenueOnPaid skipped: ledger accounts missing (${debitCode} / 4000-SALES) for order=${order.orderNumber}`,
        );
        return;
      }

      await this.ledger.postEntry(
        {
          entryDate: new Date().toISOString(),
          description: `Order ${order.orderNumber} paid via ${method} — revenue`,
          sourceType: 'ORDER',
          sourceId: order.id,
          lines: [
            { ledgerAccountId: debit.id, debit: order.totalPoisha, credit: 0, description: 'Payment received' },
            { ledgerAccountId: sales.id, debit: 0, credit: order.totalPoisha, description: 'Sales revenue' },
          ],
        },
        { status: 'POSTED' },
      );
    } catch (err) {
      // Revenue posting must never break webhook processing.
      this.logger.error(
        `postRevenueOnPaid failed for order=${orderId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}