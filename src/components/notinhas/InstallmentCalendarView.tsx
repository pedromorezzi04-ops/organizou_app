import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Installment } from '@/hooks/useFinancialData';

interface InstallmentCalendarViewProps {
  installments: Installment[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDayClick: (installments: Installment[]) => void;
}

const formatCurrency = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}k`;
  return value.toFixed(0);
};

const InstallmentCalendarView = ({
  installments,
  currentMonth,
  onMonthChange,
  onDayClick,
}: InstallmentCalendarViewProps) => {
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getInstallmentsForDay = (day: Date) =>
    installments.filter(i => isSameDay(new Date(i.due_date), day));

  const getDayTotal = (dayInstallments: Installment[]) =>
    dayInstallments.reduce((acc, i) => acc + Number(i.total_value), 0);

  const prevMonth = () =>
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));

  const nextMonth = () =>
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Month navigation */}
      <div className="flex items-center justify-between bg-card shadow-card rounded-xl p-3 border border-border">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-bold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="bg-card shadow-card rounded-xl border border-border p-3">
        <div className="grid grid-cols-7 gap-1 text-center">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <div key={i} className="p-1.5 text-xs font-semibold text-muted-foreground uppercase">
              {day}
            </div>
          ))}

          {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-1.5" />
          ))}

          {days.map((day) => {
            const dayInstallments = getInstallmentsForDay(day);
            const hasPending = dayInstallments.some(i => i.status === 'pending');
            const hasPaid = dayInstallments.some(i => i.status === 'paid');
            const total = getDayTotal(dayInstallments);
            const hasItems = dayInstallments.length > 0;
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => hasItems && onDayClick(dayInstallments)}
                disabled={!hasItems}
                className={cn(
                  "p-1 rounded-lg relative flex flex-col items-center justify-center min-h-[3rem] transition-all duration-150",
                  hasItems && "cursor-pointer hover:bg-accent/60 active:scale-95",
                  today && "ring-1 ring-primary/30",
                  !hasItems && "opacity-60"
                )}
              >
                <span className={cn(
                  "text-sm",
                  today && "font-bold text-primary",
                  hasItems && !today && "font-semibold"
                )}>
                  {format(day, 'd')}
                </span>

                {hasItems && (
                  <>
                    <span className={cn(
                      "text-[9px] font-bold leading-tight mt-0.5 tabular-nums",
                      hasPending && !hasPaid && "text-amber",
                      hasPaid && !hasPending && "text-emerald",
                      hasPaid && hasPending && "text-primary"
                    )}>
                      R${formatCurrency(total)}
                    </span>
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {hasPending && <div className="w-1 h-1 rounded-full bg-amber" />}
                      {hasPaid && <div className="w-1 h-1 rounded-full bg-emerald" />}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InstallmentCalendarView;
