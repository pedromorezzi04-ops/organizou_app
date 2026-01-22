import { useState } from 'react';
import { Plus, FileText, Check, Clock, List, CalendarDays, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { useAllInstallments, Installment } from '@/hooks/useFinancialData';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import NewInstallmentDialog from '@/components/NewInstallmentDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const Notinhas = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: installments, isLoading } = useAllInstallments();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('installments')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a notinha.",
        variant: "destructive",
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      toast({ title: "Notinha removida" });
    }
  };

  return (
    <Layout title="Notinhas">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Toggle
              pressed={viewMode === 'list'}
              onPressedChange={() => setViewMode('list')}
              size="sm"
              aria-label="Ver lista"
            >
              <List className="w-4 h-4" />
            </Toggle>
            <Toggle
              pressed={viewMode === 'calendar'}
              onPressedChange={() => setViewMode('calendar')}
              size="sm"
              aria-label="Ver calendário"
            >
              <CalendarDays className="w-4 h-4" />
            </Toggle>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Nova
          </Button>
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : installments?.length === 0 ? (
          <EmptyState />
        ) : viewMode === 'list' ? (
          <ListView installments={installments || []} onDelete={handleDelete} />
        ) : (
          <CalendarView 
            installments={installments || []} 
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
        )}
      </div>

      <NewInstallmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Layout>
  );
};

const EmptyState = () => (
  <div className="text-center py-12">
    <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
      <FileText className="w-8 h-8 text-amber-600 dark:text-amber-400" />
    </div>
    <p className="text-muted-foreground">Nenhuma notinha cadastrada</p>
    <p className="text-sm text-muted-foreground mt-1">
      Crie notinhas para controlar parcelas
    </p>
  </div>
);

const ListView = ({ 
  installments, 
  onDelete 
}: { 
  installments: Installment[];
  onDelete: (id: string) => void;
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleStatus = async (installment: Installment) => {
    const newStatus = installment.status === 'paid' ? 'pending' : 'paid';
    
    const { error } = await supabase
      .from('installments')
      .update({ status: newStatus })
      .eq('id', installment.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      toast({
        title: newStatus === 'paid' ? "Recebido! ✓" : "Marcado como pendente",
      });
    }
  };

  return (
    <div className="space-y-2">
      {installments.map((installment) => (
        <div key={installment.id} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleStatus(installment)}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                installment.status === 'paid'
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              )}
            >
              {installment.status === 'paid' ? (
                <Check className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{installment.customer_name}</p>
              <p className="text-xs text-muted-foreground">
                Parcela {installment.current_installment}/{installment.total_installments}
                {' • '}
                {format(new Date(installment.due_date), "dd/MM/yyyy")}
              </p>
            </div>
            <div className="text-right mr-2">
              <p className={cn(
                "font-semibold",
                installment.status === 'paid' 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : "text-amber-600 dark:text-amber-400"
              )}>
                {formatCurrency(Number(installment.total_value))}
              </p>
              <p className="text-xs text-muted-foreground">
                {installment.status === 'paid' ? 'Recebido' : 'Pendente'}
              </p>
            </div>
            <button
              onClick={() => onDelete(installment.id)}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remover notinha"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const CalendarView = ({ 
  installments, 
  currentMonth, 
  onMonthChange 
}: { 
  installments: Installment[]; 
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}) => {
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getInstallmentsForDay = (day: Date) => {
    return installments.filter(i => 
      isSameDay(new Date(i.due_date), day)
    );
  };

  const prevMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={prevMonth}>
          ←
        </Button>
        <span className="font-medium">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          →
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
          <div key={i} className="p-2 text-muted-foreground font-medium">
            {day}
          </div>
        ))}
        
        {/* Empty cells for days before the first day of month */}
        {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="p-2" />
        ))}
        
        {days.map((day) => {
          const dayInstallments = getInstallmentsForDay(day);
          const hasPending = dayInstallments.some(i => i.status === 'pending');
          const hasPaid = dayInstallments.some(i => i.status === 'paid');
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 rounded-lg relative",
                dayInstallments.length > 0 && "font-medium"
              )}
            >
              <span>{format(day, 'd')}</span>
              {dayInstallments.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-1">
                  {hasPending && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                  {hasPaid && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notinhas;
