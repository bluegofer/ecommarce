import { notFound } from 'next/navigation';
import { OrdersList, type OrdersListLabels } from '@/components/account';
import { isLocale, type Locale } from '@/lib/i18n';

export const metadata = {
  title: 'Your Orders | NoLimitShopping',
  robots: { index: false, follow: false },
};

export default function OrdersPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const bn = locale === 'bn';

  const labels: OrdersListLabels = {
    title: bn ? 'আমার অর্ডার' : 'Your Orders',
    orderNumber: bn ? 'অর্ডার' : 'Order',
    placed: bn ? 'তারিখ' : 'Placed',
    total: bn ? 'মোট' : 'Total',
    trackPackage: bn ? 'ট্র্যাক করুন' : 'Track package',
    returnItems: bn ? 'রিটার্ন' : 'Return items',
    reorder: bn ? 'আবার কিনুন' : 'Buy it again',
    cancelledReason: bn ? 'কারণ' : 'Reason',
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
    tabAll: bn ? 'সব' : 'All',
    tabInProgress: bn ? 'চলমান' : 'In progress',
    tabDelivered: bn ? 'ডেলিভারড' : 'Delivered',
    tabCancelled: bn ? 'বাতিল' : 'Cancelled',
    searchPlaceholder: bn ? 'অর্ডার নম্বর খুঁজুন' : 'Search by order no',
    emptyTitle: bn ? 'এখনো কোনো অর্ডার নেই' : 'No orders yet',
    emptyBody: bn ? 'আপনার প্রথম অর্ডার করুন' : 'Place your first order to see it here',
    startShopping: bn ? 'কেনাকাটা শুরু করুন' : 'Start shopping',
    loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
    errorText: bn ? 'লোড করা যায়নি' : 'Could not load orders',
  };

  return <OrdersList locale={locale} labels={labels} />;
}