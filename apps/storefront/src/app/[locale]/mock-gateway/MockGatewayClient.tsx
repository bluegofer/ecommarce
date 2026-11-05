'use client';

// Minimal mock gateway UI. "Pay" fires POST /payments/webhook/:provider with
// a mock payload, then redirects to /order-confirmation.
// Real gateways replace this entirely — this page never ships to production.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

interface Props {
  locale: string;
  intent: string;
  provider: string;
  orderNumber: string;
  orderId: string;
}

export function MockGatewayClient({ locale, intent, provider, orderNumber, orderId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(status: 'PAID' | 'FAILED') {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        eventId: `mock-${intent}-${status}-${Date.now()}`,
        providerIntentId: intent,
        orderId,
        orderNumber,
        amountPoisha: 0,
        status,
        occurredAt: new Date().toISOString(),
      };
      const url = `${API_BASE_URL}/payments/webhook/${provider}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': 'mock-signature',
        },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string };
      if (!res.ok || body.ok === false) {
        throw new Error(body.reason ?? `webhook failed: ${res.status}`);
      }
      router.push(
        `/${locale}/order-confirmation?order=${encodeURIComponent(orderNumber)}&phone=&mock=1`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#F6FAFD',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: '#FFFFFF',
          border: '1px solid #D9E5EE',
          borderRadius: 12,
          padding: 32,
          boxShadow: '0 4px 12px rgba(12,43,61,0.10)',
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: '#64748B', textTransform: 'uppercase' }}>
          Mock {provider} gateway
        </p>
        <h1 style={{ fontSize: 24, marginTop: 8, marginBottom: 4 }}>
          Simulate a payment for order
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
          Intent: <code>{intent || '(missing)'}</code>
        </p>
        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
          Order: <strong>{orderNumber || '(missing)'}</strong>
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => submit('PAID')}
            disabled={busy}
            style={{
              flex: 1,
              height: 48,
              background: '#FF8A1E',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Processing…' : 'Pay now'}
          </button>
          <button
            onClick={() => submit('FAILED')}
            disabled={busy}
            style={{
              flex: 1,
              height: 48,
              background: '#FFFFFF',
              color: '#D62828',
              border: '1.5px solid #D62828',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Simulate failure
          </button>
        </div>

        {error ? (
          <p style={{ fontSize: 13, color: '#D62828', margin: 0 }} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}