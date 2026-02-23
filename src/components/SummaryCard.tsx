import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  variant: 'income' | 'expense' | 'pending' | 'forecast';
  index?: number;
}

const variantConfig = {
  income: {
    bg: 'bg-emerald-light/60 dark:bg-emerald-light/40',
    text: 'text-emerald',
    icon: 'bg-emerald/10 text-emerald',
    border: 'border-emerald/10',
  },
  expense: {
    bg: 'bg-destructive/5 dark:bg-destructive/10',
    text: 'text-destructive',
    icon: 'bg-destructive/10 text-destructive',
    border: 'border-destructive/10',
  },
  pending: {
    bg: 'bg-amber-light/60 dark:bg-amber-light/40',
    text: 'text-amber',
    icon: 'bg-amber/10 text-amber',
    border: 'border-amber/10',
  },
  forecast: {
    bg: 'bg-primary/5 dark:bg-primary/10',
    text: 'text-primary',
    icon: 'bg-primary/10 text-primary',
    border: 'border-primary/10',
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const SummaryCard = ({ title, value, icon, variant, index = 0 }: SummaryCardProps) => {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        "rounded-xl p-4 border shadow-card backdrop-blur-sm",
        "transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5",
        "animate-fade-in",
        config.bg,
        config.border
      )}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", config.icon)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <p className={cn("text-lg font-bold truncate tabular-nums mt-0.5", config.text)}>
            {formatCurrency(value)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
