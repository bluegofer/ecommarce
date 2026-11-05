// Mock gateway checkout page — dev/demo only.
// Enabled when NEXT_PUBLIC_ENABLE_MOCK_GATEWAY=true (or NODE_ENV !== production).
// In production builds it returns 404 so it can never be accidentally reachable.
import { notFound } from 'next/navigation';
import { MockGatewayClient } from './MockGatewayClient';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

interface PageProps {
  params: { locale: string };
  searchParams: { intent?: string; provider?: string; orderId?: string; order?: string };
}

export default function MockGatewayPage({ params, searchParams }: PageProps) {
  const enabled =
    process.env.NEXT_PUBLIC_ENABLE_MOCK_GATEWAY === 'true' ||
    process.env.NODE_ENV !== 'production';
  if (!enabled) notFound();

  const intent = searchParams.intent ?? '';
  const provider = (searchParams.provider ?? 'BKASH').toUpperCase();
  const orderNumber = searchParams.order ?? '';
  const orderId = searchParams.orderId ?? '';

  return (
    <MockGatewayClient
      locale={params.locale}
      intent={intent}
      provider={provider}
      orderNumber={orderNumber}
      orderId={orderId}
    />
  );
}