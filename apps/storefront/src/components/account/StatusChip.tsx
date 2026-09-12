import styles from './StatusChip.module.css';

export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'PAYMENT_PENDING'
  | string;

export interface StatusChipLabels {
  PLACED: string;
  CONFIRMED: string;
  PROCESSING: string;
  SHIPPED: string;
  OUT_FOR_DELIVERY: string;
  DELIVERED: string;
  CANCELLED: string;
  RETURNED: string;
  PAYMENT_PENDING: string;
}

export interface StatusChipProps {
  status: OrderStatus;
  labels: StatusChipLabels;
}

/** Map status → CSS class per UI Spec C9 color mapping. */
function statusClass(status: OrderStatus): string {
  switch (status) {
    case 'PLACED':
    case 'CONFIRMED':
      return styles.info ?? '';
    case 'PROCESSING':
    case 'OUT_FOR_DELIVERY':
      return styles.warning ?? '';
    case 'SHIPPED':
      return styles.purple ?? '';
    case 'DELIVERED':
      return styles.success ?? '';
    case 'CANCELLED':
    case 'RETURNED':
      return styles.neutral ?? '';
    case 'PAYMENT_PENDING':
      return styles.error ?? '';
    default:
      return styles.neutral ?? '';
  }
}

export function StatusChip({ status, labels }: StatusChipProps) {
  const labelMap = labels as unknown as Record<string, string>;
  const label = labelMap[status] ?? status;
  return (
    <span className={[styles.chip, statusClass(status)].filter(Boolean).join(' ')}>
      {label}
    </span>
  );
}