import { cn } from '@/lib/utils';

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'violet'
  | 'teal';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  success: 'bg-success-50 text-success-700 ring-success-100',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100',
  danger: 'bg-danger-50 text-danger-700 ring-danger-100',
  violet: 'bg-info-50 text-info-600 ring-info-100',
  teal: 'bg-teal-50 text-teal-600 ring-teal-100',
};

interface StatusChipProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

export function StatusChip({ label, tone = 'neutral', className }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium ring-1 ring-inset whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

// Order-status mapping per UI Spec C9 + mock orders.html
export const ORDER_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: 'info',
  PENDING_VERIFICATION: 'info',
  VERIFIED: 'teal',
  PROCESSING: 'warning',
  PACKED: 'warning',
  SHIPPED: 'violet',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
  RETURN: 'danger',
  EXCHANGE: 'violet',
  PAYMENT_PENDING: 'danger',
};