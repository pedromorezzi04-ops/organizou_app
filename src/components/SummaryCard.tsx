import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  variant: 'income' | 'expense' | 'pending' | 'forecast';
}

const variantStyles = {
  income: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  expense: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  forecast: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
};

const iconStyles = {
  income: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
  expense: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
  forecast: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const SummaryCard = ({ title, value, icon, variant }: SummaryCardProps) => {
  return (
    <div className={cn("rounded-xl p-4", variantStyles[variant])}>
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconStyles[variant])}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium opacity-80 truncate">{title}</p>
          <p className="text-lg font-bold truncate">{formatCurrency(value)}</p>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
