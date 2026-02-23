import { Check, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Installment } from '@/hooks/useFinancialData';

interface InstallmentCardProps {
  installment: Installment;
  onClick: (installment: Installment) => void;
  index: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const InstallmentCard = ({ installment, onClick, index }: InstallmentCardProps) => {
  const isPaid = installment.status === 'paid';

  return (
    <button
      onClick={() => onClick(installment)}
      className={cn(
        "w-full text-left bg-card shadow-card rounded-xl p-4 border border-border",
        "transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5 active:scale-[0.98]",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            isPaid
              ? "bg-emerald-light text-emerald"
              : "bg-amber-light text-amber"
          )}
        >
          {isPaid ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate text-foreground">{installment.customer_name}</p>
          <p className="text-xs text-muted-foreground">
            Parcela {installment.current_installment}/{installment.total_installments}
            {' • '}
            {format(new Date(installment.due_date), "dd/MM/yyyy")}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className={cn(
            "font-bold tabular-nums",
            isPaid ? "text-emerald" : "text-amber"
          )}>
            {formatCurrency(Number(installment.total_value))}
          </p>
          <p className="text-xs text-muted-foreground">
            {isPaid ? 'Recebido' : 'Pendente'}
          </p>
        </div>
      </div>
    </button>
  );
};

export default InstallmentCard;
