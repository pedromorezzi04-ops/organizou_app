import { useState } from 'react';
import { Plus, TrendingUp, Check, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useAllTransactions, Transaction } from '@/hooks/useFinancialData';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import NewTransactionDialog from '@/components/NewTransactionDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const Entradas = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: transactions, isLoading } = useAllTransactions();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const incomeTransactions = transactions?.filter(t => t.type === 'income') || [];

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a entrada.",
        variant: "destructive",
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: "Entrada removida" });
    }
  };

  return (
    <Layout title="Entradas">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Registre tudo que entrou
          </p>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo
          </Button>
        </div>

        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {isLoading ? (
            <>
              {[0, 1, 2].map(i => (
                <Skeleton key={i} className="h-[72px] rounded-xl" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </>
          ) : incomeTransactions.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald to-emerald/60 rounded-3xl flex items-center justify-center mb-4 shadow-lift">
                <TrendingUp className="w-10 h-10 text-primary-foreground" />
              </div>
              <p className="font-medium text-foreground">Nenhuma entrada registrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Toque em "Novo" para adicionar sua primeira venda
              </p>
            </div>
          ) : (
            incomeTransactions.map((transaction, index) => (
              <div
                key={transaction.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
              >
                <TransactionCard
                  transaction={transaction}
                  onDelete={handleDelete}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <NewTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type="income"
      />
    </Layout>
  );
};

const TransactionCard = ({
  transaction,
  onDelete,
}: {
  transaction: Transaction;
  onDelete: (id: string) => void;
}) => {
  const isPaid = transaction.status === 'paid';

  return (
    <div className={cn(
      "glass rounded-xl p-4 lg:p-5 shadow-card transition-all duration-200",
      "hover:shadow-lift hover:-translate-y-0.5 active:scale-[0.98]",
      "border",
      isPaid ? "border-emerald/20" : "border-amber/20"
    )}>
      <div className="flex items-center gap-3">
        {/* Status indicator with glow */}
        <div className={cn(
          "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all",
          isPaid
            ? "bg-emerald-light text-emerald"
            : "bg-amber-light text-amber"
        )}>
          {isPaid ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          {/* Glow effect */}
          <div className={cn(
            "absolute inset-0 rounded-xl opacity-40 blur-md -z-10",
            isPaid ? "bg-emerald" : "bg-amber animate-pulse"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-foreground">{transaction.description}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(transaction.created_at), "dd 'de' MMM", { locale: ptBR })}
            {transaction.payment_method && ` • ${transaction.payment_method}`}
          </p>
        </div>

        <div className="text-right mr-1">
          <p className="font-semibold text-emerald">
            {formatCurrency(Number(transaction.amount))}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isPaid ? 'Recebido' : 'Pendente'}
          </p>
        </div>

        <button
          onClick={() => onDelete(transaction.id)}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          aria-label="Remover entrada"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Entradas;
