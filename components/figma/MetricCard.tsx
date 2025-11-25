import { LucideIcon } from 'lucide-react';
import { classNames } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  className?: string;
}

export function MetricCard({ title, value, change, icon: Icon, trend, subtitle, className }: MetricCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-success';
    if (trend === 'down') return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <article
      className={classNames(
        'bg-card border border-border rounded-lg p-6 transition-colors hover:border-muted',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className="mb-1">{value}</h3>
          {change !== undefined && (
            <p className={classNames('text-sm', getTrendColor())}>
              {change >= 0 ? '+' : ''}{change}%
              {subtitle && <span className="text-muted-foreground ml-2">{subtitle}</span>}
            </p>
          )}
        </div>
        {Icon && (
          <div className="ml-4 p-3 bg-primary/10 rounded-lg">
            <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
        )}
      </div>
    </article>
  );
}
