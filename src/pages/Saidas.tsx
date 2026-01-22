import { useState } from 'react';
import { Plus, TrendingDown, Repeat, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllTransactions, useRecurringExpenses, Transaction, RecurringExpense } from '@/hooks/useFinancialData';
import { Skeleton } from '@/components/ui/skeleton';
import NewTransactionDialog from '@/components/NewTransactionDialog';
import NewRecurringExpenseDialog from '@/components/NewRecurringExpenseDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const categoryIcons: Record<string, string> = {
  fornecedor: '🏭',
  insumo: '📦',
  manutencao: '🔧',
  outros: '📋',
};

const Saidas = () => {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const { data: transactions, isLoading: transactionsLoading } = useAllTransactions();
  const { data: recurringExpenses, isLoading: recurringLoading } = useRecurringExpenses();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const expenseTransactions = transactions?.filter(t => t.type === 'expense') || [];

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a saída.",
        variant: "destructive",
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: "Saída removida" });
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a despesa fixa.",
        variant: "destructive",
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] });
      toast({ title: "Despesa fixa removida" });
    }
  };

  return (
    <Layout title="Saídas">
      <Tabs defaultValue="variaveis" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="variaveis" className="flex-1">Variáveis</TabsTrigger>
          <TabsTrigger value="fixas" className="flex-1">Fixas</TabsTrigger>
        </TabsList>

        <TabsContent value="variaveis" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gastos do dia a dia</p>
            <Button onClick={() => setTransactionDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Novo
            </Button>
          </div>

          <div className="space-y-2">
            {transactionsLoading ? (
              <>
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </>
            ) : expenseTransactions.length === 0 ? (
              <EmptyState icon={TrendingDown} message="Nenhuma saída registrada" />
            ) : (
              expenseTransactions.map((transaction) => (
                <ExpenseCard 
                  key={transaction.id} 
                  transaction={transaction} 
                  onDelete={handleDeleteTransaction}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="fixas" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Contas mensais</p>
            <Button onClick={() => setRecurringDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Novo
            </Button>
          </div>

          <div className="space-y-2">
            {recurringLoading ? (
              <>
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </>
            ) : recurringExpenses?.length === 0 ? (
              <EmptyState icon={Repeat} message="Nenhuma despesa fixa cadastrada" />
            ) : (
              recurringExpenses?.map((expense) => (
                <RecurringExpenseCard 
                  key={expense.id} 
                  expense={expense} 
                  onDelete={handleDeleteRecurring}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <NewTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        type="expense"
      />
      <NewRecurringExpenseDialog
        open={recurringDialogOpen}
        onOpenChange={setRecurringDialogOpen}
      />
    </Layout>
  );
};

const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType; message: string }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-red-600 dark:text-red-400" />
    </div>
    <p className="text-muted-foreground">{message}</p>
    <p className="text-sm text-muted-foreground mt-1">Toque em "Novo" para adicionar</p>
  </div>
);

const ExpenseCard = ({ 
  transaction, 
  onDelete 
}: { 
  transaction: Transaction;
  onDelete: (id: string) => void;
}) => {
  const emoji = categoryIcons[transaction.category || 'outros'] || '📋';
  
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xl">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{transaction.description}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(transaction.created_at), "dd 'de' MMM", { locale: ptBR })}
          </p>
        </div>
        <div className="text-right mr-2">
          <p className="font-semibold text-red-600 dark:text-red-400">
            -{formatCurrency(Number(transaction.amount))}
          </p>
        </div>
        <button
          onClick={() => onDelete(transaction.id)}
          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Remover saída"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const RecurringExpenseCard = ({ 
  expense, 
  onDelete 
}: { 
  expense: RecurringExpense;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <Repeat className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{expense.name}</p>
          <p className="text-xs text-muted-foreground">
            Vence dia {expense.due_day}
          </p>
        </div>
        <div className="text-right mr-2">
          <p className="font-semibold text-muted-foreground">
            {formatCurrency(Number(expense.amount))}
          </p>
          <p className="text-xs text-muted-foreground">mensal</p>
        </div>
        <button
          onClick={() => onDelete(expense.id)}
          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Remover despesa fixa"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Saidas;
