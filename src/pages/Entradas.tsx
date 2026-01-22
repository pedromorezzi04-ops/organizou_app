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
      toast({
        title: "Entrada removida",
      });
    }
  };

  return (
    <Layout title="Entradas">
      <div className="space-y-4">
        {/* Header com botão de adicionar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Registre tudo que entrou
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo
          </Button>
        </div>

        {/* Lista de transações */}
        <div className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </>
          ) : incomeTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-muted-foreground">Nenhuma entrada registrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Toque em "Novo" para adicionar
              </p>
            </div>
          ) : (
            incomeTransactions.map((transaction) => (
              <TransactionCard 
                key={transaction.id} 
                transaction={transaction} 
                onDelete={handleDelete}
              />
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
  onDelete 
}: { 
  transaction: Transaction;
  onDelete: (id: string) => void;
}) => {
  const isPaid = transaction.status === 'paid';
  
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          isPaid 
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        )}>
          {isPaid ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{transaction.description}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(transaction.created_at), "dd 'de' MMM", { locale: ptBR })}
            {transaction.payment_method && ` • ${transaction.payment_method}`}
          </p>
        </div>
        <div className="text-right mr-2">
          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(Number(transaction.amount))}
          </p>
          <p className="text-xs text-muted-foreground">
            {isPaid ? 'Recebido' : 'Pendente'}
          </p>
        </div>
        <button
          onClick={() => onDelete(transaction.id)}
          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Remover entrada"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Entradas;
