import { notFound } from 'next/navigation';
import { OrderTracking, type OrderTrackingLabels } from '@/components/account';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'Track Order | BlueGofer',
  robots: { index: false, follow: false },
};

export default function OrderDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const labels: OrderTrackingLabels = {
    loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
    errorText: bn ? 'অর্ডার লোড করা যায়নি' : 'Could not load order',
    backToOrders: bn ? 'অর্ডারে ফিরে যান' : 'Back to Orders',
    needHelp: bn ? 'সাহায্য দরকার?' : 'Need help?',
    orderItems: bn ? 'পণ্যসমূহ' : 'Items',
    shippingTo: bn ? 'ডেলিভারি ঠিকানা' : 'Shipping to',
    payment: bn ? 'পেমেন্ট' : 'Payment',
    paidLabel: bn ? 'পরিশোধিত' : 'Paid',
    pendingLabel: bn ? 'বাকি' : 'Pending',
    codLabel: bn ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery',
    subtotal: bn ? 'সাব-টোটাল' : 'Subtotal',
    delivery: bn ? 'ডেলিভারি' : 'Delivery',
    discount: bn ? 'ডিসকাউন্ট' : 'Discount',
    total: bn ? 'মোট' : 'Total',
    freeDelivery: bn ? 'ফ্রি' : 'FREE',
    couponLabel: bn ? 'কুপন' : 'Coupon',
    downloadInvoice: bn ? 'ইনভয়েস' : 'Download invoice',
    copied: bn ? '✓ কপি হয়েছে' : '✓ Copied',
    statusLabels: {
      PLACED: bn ? 'অর্ডার হয়েছে' : 'Ordered',
      CONFIRMED: bn ? 'নিশ্চিত' : 'Confirmed',
      PROCESSING: bn ? 'প্যাকিং' : 'Packed',
      SHIPPED: bn ? 'শিপড' : 'Shipped',
      OUT_FOR_DELIVERY: bn ? 'ডেলিভারিতে' : 'Out for delivery',
      DELIVERED: bn ? 'ডেলিভারড' : 'Delivered',
      CANCELLED: bn ? 'বাতিল' : 'Cancelled',
      RETURNED: bn ? 'ফেরত' : 'Returned',
      PAYMENT_PENDING: bn ? 'পেমেন্ট বাকি' : 'Payment pending',
    },
    timeline: {
      nodes: {
        PLACED: bn ? 'অর্ডার করা হয়েছে' : 'Order Placed',
        CONFIRMED: bn ? 'নিশ্চিত করা হয়েছে' : 'Order Confirmed',
        PROCESSING: bn ? 'প্যাকিং' : 'Packed',
        SHIPPED: bn ? 'কুরিয়ারে দেওয়া হয়েছে' : 'Handed to Courier',
        OUT_FOR_DELIVERY: bn ? 'ডেলিভারিতে' : 'Out for Delivery',
        DELIVERED: bn ? 'ডেলিভারি সম্পন্ন' : 'Delivered',
      },
      notePrefix: bn ? 'নোট:' : 'Note:',
    },
  };

  return <OrderTracking locale={locale} orderId={params.id} labels={labels} />;
}