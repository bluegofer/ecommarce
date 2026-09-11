'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart/context';
import { useToast } from '@/lib/ui/toast-context';
import { api, ApiError } from '@/lib/api';
import { track } from '@/lib/analytics/events';
import { CheckoutStepper } from './CheckoutStepper';
import { AddressStep, type CheckoutAddress } from './AddressStep';
import { PaymentStep, type PaymentMethod } from './PaymentStep';
import { ReviewStep } from './ReviewStep';
import { CartEmpty } from '@/components/cart';
import type { PlaceOrderDto, PlaceOrderResultDto, PaymentMethod as ApiPaymentMethod } from '@ecommarce/types';
import styles from './CheckoutClient.module.css';

const FREE_SHIPPING_THRESHOLD = 150000; // ৳1,500
const DELIVERY_FLAT_POISHA = 6000; // ৳60

export interface CheckoutClientProps {
  locale: 'bn' | 'en';
  labels: CheckoutLabels;
}

export interface CheckoutLabels {
  // Stepper
  stepAddress: string;
  stepPayment: string;
  stepReview: string;
  // Address
  addressTitle: string;
  recipientName: string;
  phone: string;
  email: string;
  city: string;
  cityPlaceholder: string;
  area: string;
  areaPlaceholder: string;
  line1: string;
  line1Placeholder: string;
  postcode: string;
  continueLabel: string;
  required: string;
  invalidPhone: string;
  invalidEmail: string;
  // Payment
  paymentTitle: string;
  bkashLabel: string;
  bkashDesc: string;
  nagadLabel: string;
  nagadDesc: string;
  sslcommerzLabel: string;
  sslcommerzDesc: string;
  codLabel: string;
  codDesc: string;
  codFeeNote: string;
  back: string;
  // Review
  reviewTitle: string;
  addressSection: string;
  paymentSection: string;
  itemsSection: string;
  edit: string;
  placeOrder: string;
  placing: string;
  terms: string;
  // Shared summary
  summaryTitle: string;
  subtotal: string;
  delivery: string;
  discount: string;
  total: string;
  // Cart empty
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  // Toast
  orderPlaced: string;
  orderFailed: string;
  paymentNotReady: string;
  // City options
  cityOptions: { value: string; label: string }[];
  paymentNames: Record<PaymentMethod, string>;
}

const INITIAL_ADDRESS: CheckoutAddress = {
  recipientName: '',
  phone: '',
  contactPhone: '',
  contactEmail: '',
  city: '',
  area: '',
  line1: '',
  postcode: '',
};

export function CheckoutClient({ locale, labels }: CheckoutClientProps) {
  const router = useRouter();
  const cart = useCart();
  const { show: showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [address, setAddress] = useState<CheckoutAddress>(INITIAL_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

  const items = cart.items;
  const subtotalPoisha = useMemo(
    () => items.reduce((s, i) => s + i.unitPricePoisha * i.qty, 0),
    [items],
  );
  const deliveryFeePoisha = subtotalPoisha === 0
    ? 0
    : subtotalPoisha >= FREE_SHIPPING_THRESHOLD
      ? 0
      : DELIVERY_FLAT_POISHA;
  const discountPoisha = 0; // coupon eval happens server-side in Step 8.6+ (server-side truth TDD §11.4)

  const placeOrder = useCallback(async () => {
    if (items.length === 0) return;

    // Non-COD methods: show stub toast (DECISIONS.md: Step 8 Checkout Payment Methods)
    if (paymentMethod !== 'cod') {
      showToast({
        kind: 'info',
        title: labels.paymentNotReady,
        durationMs: 5000,
      });
      return;
    }

    const apiMethod: ApiPaymentMethod = 'COD';

    // Idempotency-Key — client-generated; server replays duplicates (TDD §11.2)
    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const dto: PlaceOrderDto = {
      items: items.map((it) => ({ variantId: it.variantId, quantity: it.qty })),
      shippingAddress: {
        recipientName: address.recipientName,
        phone: address.phone,
        area: address.area,
        city: address.city,
        postcode: address.postcode || undefined,
        line1: address.line1,
        isDefault: false,
      },
      contactPhone: address.contactPhone || address.phone,
      contactEmail: address.contactEmail || undefined,
      paymentMethod: apiMethod,
      customerNote: undefined,
    };

    track('CHECKOUT_START', { items: items.length, subtotalPoisha });

    try {
      const result = await api.post<PlaceOrderResultDto>(
        '/checkout/place-order',
        dto,
        { idempotencyKey },
      );

      // Success: clear local cart, navigate to confirmation with orderNumber in state (not URL)
      cart.clear();
      showToast({
        kind: 'success',
        title: labels.orderPlaced,
        description: result.orderNumber,
      });
      router.push(`/${locale}/order-confirmation?order=${encodeURIComponent(result.orderNumber)}&phone=${encodeURIComponent(address.phone)}`);
    } catch (err) {
      let msg = labels.orderFailed;
      if (err instanceof ApiError) {
        const body = err.body as { message?: string | string[] } | null;
        if (body?.message) {
          msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
        }
      }
      showToast({ kind: 'error', title: labels.orderFailed, description: msg, durationMs: 8000 });
    }
  }, [items, address, paymentMethod, cart, locale, labels, router, showToast]);

  if (!cart.hydrated) {
    return <div className={styles.placeholder} aria-busy="true" />;
  }

  if (items.length === 0) {
    return (
      <CartEmpty
        locale={locale}
        labels={{
          title: labels.emptyTitle,
          body: labels.emptyBody,
          cta: labels.emptyCta,
        }}
      />
    );
  }

  return (
    <div>
      <CheckoutStepper
        current={step}
        labels={[labels.stepAddress, labels.stepPayment, labels.stepReview]}
        onStepClick={(s) => setStep(s)}
      />

      {step === 1 ? (
        <AddressStep
          value={address}
          onChange={setAddress}
          onContinue={() => setStep(2)}
          items={items}
          subtotalPoisha={subtotalPoisha}
          deliveryFeePoisha={deliveryFeePoisha}
          discountPoisha={discountPoisha}
          locale={locale}
          labels={{
            title: labels.addressTitle,
            recipientName: labels.recipientName,
            phone: labels.phone,
            email: labels.email,
            city: labels.city,
            cityPlaceholder: labels.cityPlaceholder,
            area: labels.area,
            areaPlaceholder: labels.areaPlaceholder,
            line1: labels.line1,
            line1Placeholder: labels.line1Placeholder,
            postcode: labels.postcode,
            continue: labels.continueLabel,
            summaryTitle: labels.summaryTitle,
            subtotal: labels.subtotal,
            delivery: labels.delivery,
            discount: labels.discount,
            total: labels.total,
            required: labels.required,
            invalidPhone: labels.invalidPhone,
            invalidEmail: labels.invalidEmail,
            cityOptions: labels.cityOptions,
          }}
        />
      ) : null}

      {step === 2 ? (
        <PaymentStep
          value={paymentMethod}
          onChange={setPaymentMethod}
          onContinue={() => setStep(3)}
          onBack={() => setStep(1)}
          items={items}
          subtotalPoisha={subtotalPoisha}
          deliveryFeePoisha={deliveryFeePoisha}
          discountPoisha={discountPoisha}
          locale={locale}
          labels={{
            title: labels.paymentTitle,
            bkashLabel: labels.bkashLabel,
            bkashDesc: labels.bkashDesc,
            nagadLabel: labels.nagadLabel,
            nagadDesc: labels.nagadDesc,
            sslcommerzLabel: labels.sslcommerzLabel,
            sslcommerzDesc: labels.sslcommerzDesc,
            codLabel: labels.codLabel,
            codDesc: labels.codDesc,
            codFeeNote: labels.codFeeNote,
            continue: labels.continueLabel,
            back: labels.back,
            summaryTitle: labels.summaryTitle,
            subtotal: labels.subtotal,
            delivery: labels.delivery,
            discount: labels.discount,
            total: labels.total,
          }}
        />
      ) : null}

      {step === 3 ? (
        <ReviewStep
          address={address}
          paymentMethod={paymentMethod}
          items={items}
          subtotalPoisha={subtotalPoisha}
          deliveryFeePoisha={deliveryFeePoisha}
          discountPoisha={discountPoisha}
          couponCode={null}
          onSubmit={placeOrder}
          onEdit={(s) => setStep(s)}
          onBack={() => setStep(2)}
          locale={locale}
          labels={{
            title: labels.reviewTitle,
            addressSection: labels.addressSection,
            paymentSection: labels.paymentSection,
            itemsSection: labels.itemsSection,
            edit: labels.edit,
            back: labels.back,
            placeOrder: labels.placeOrder,
            placing: labels.placing,
            terms: labels.terms,
            summaryTitle: labels.summaryTitle,
            subtotal: labels.subtotal,
            delivery: labels.delivery,
            discount: labels.discount,
            total: labels.total,
            paymentNames: labels.paymentNames,
          }}
        />
      ) : null}
    </div>
  );
}