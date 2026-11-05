import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatusTone } from './status-chip';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-sky-50 text-sky-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
  violet: 'bg-info-50 text-info-600',
  teal: 'bg-teal-50 text-teal-600',
};

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  icon?: LucideIcon;
  tone?: StatusTone;
  className?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = 'info',
  className,
}: MetricCardProps) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12.5px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {value}
          </p>
          {delta && <p className="mt-1 text-[12px] text-slate-400">{delta}</p>}
        </div>
        {Icon && (
          <span
            className={cn(
              'w-10 h-10 grid place-items-center rounded-lg',
              TONE_CLASSES[tone],
            )}
          >
            <Icon className="w-5 h-5" />
          </span>
        )}
      </div>
    </div>
  );
}