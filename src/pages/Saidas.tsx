import { useState } from 'react';
import { Plus, TrendingDown, Repeat, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllTransactions, useRecurringExpenses, Transaction, RecurringExpense } from '@/hooks/useFinancialData';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
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
      toast({ title: "Erro", description: "Não foi possível remover a saída.", variant: "destructive" });
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
      toast({ title: "Erro", description: "Não foi possível remover a despesa fixa.", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] });
      toast({ title: "Despesa fixa removida" });
    }
  };

  return (
    <Layout title="Saídas">
      <Tabs defaultValue="variaveis" className="space-y-4">
        {/* Modern iOS-style tabs */}
        <TabsList className="w-full h-12 p-1 glass-strong rounded-2xl shadow-card">
          <TabsTrigger
            value="variaveis"
            className="flex-1 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-card data-[state=active]:text-foreground"
          >
            Variáveis
          </TabsTrigger>
          <TabsTrigger
            value="fixas"
            className="flex-1 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-card data-[state=active]:text-foreground"
          >
            Fixas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="variaveis" className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gastos do dia a dia</p>
            <Button onClick={() => setTransactionDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Novo
            </Button>
          </div>

          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {transactionsLoading ? (
              [0, 1, 2].map(i => (
                <Skeleton key={i} className="h-[72px] rounded-xl" style={{ animationDelay: `${i * 100}ms` }} />
              ))
            ) : expenseTransactions.length === 0 ? (
              <EmptyState icon={TrendingDown} message="Nenhuma saída registrada" />
            ) : (
              expenseTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
                >
                  <ExpenseCard transaction={transaction} onDelete={handleDeleteTransaction} />
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="fixas" className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Contas mensais</p>
            <Button onClick={() => setRecurringDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Novo
            </Button>
          </div>

          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {recurringLoading ? (
              [0, 1].map(i => (
                <Skeleton key={i} className="h-[72px] rounded-xl" style={{ animationDelay: `${i * 100}ms` }} />
              ))
            ) : recurringExpenses?.length === 0 ? (
              <EmptyState icon={Repeat} message="Nenhuma despesa fixa cadastrada" />
            ) : (
              recurringExpenses?.map((expense, index) => (
                <div
                  key={expense.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
                >
                  <RecurringExpenseCard expense={expense} onDelete={handleDeleteRecurring} />
                </div>
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
  <div className="text-center py-16 animate-fade-in">
    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-destructive to-destructive/60 rounded-3xl flex items-center justify-center mb-4 shadow-lift">
      <Icon className="w-10 h-10 text-destructive-foreground" />
    </div>
    <p className="font-medium text-foreground">{message}</p>
    <p className="text-sm text-muted-foreground mt-1">Toque em "Novo" para adicionar</p>
  </div>
);

const ExpenseCard = ({
  transaction,
  onDelete,
}: {
  transaction: Transaction;
  onDelete: (id: string) => void;
}) => {
  const emoji = categoryIcons[transaction.category || 'outros'] || '📋';

  return (
    <div className={cn(
      "glass rounded-xl p-4 lg:p-5 shadow-card border border-destructive/10 transition-all duration-200",
      "hover:shadow-lift hover:-translate-y-0.5 active:scale-[0.98]"
    )}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-xl">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-foreground">{transaction.description}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(transaction.created_at), "dd 'de' MMM", { locale: ptBR })}
          </p>
        </div>
        <div className="text-right mr-1">
          <p className="font-semibold text-destructive">
            -{formatCurrency(Number(transaction.amount))}
          </p>
        </div>
        <button
          onClick={() => onDelete(transaction.id)}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
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
  onDelete,
}: {
  expense: RecurringExpense;
  onDelete: (id: string) => void;
}) => (
  <div className={cn(
    "glass rounded-xl p-4 lg:p-5 shadow-card border border-border/50 transition-all duration-200",
    "hover:shadow-lift hover:-translate-y-0.5 active:scale-[0.98]"
  )}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
        <Repeat className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-foreground">{expense.name}</p>
        <p className="text-xs text-muted-foreground">Vence dia {expense.due_day}</p>
      </div>
      <div className="text-right mr-1">
        <p className="font-semibold text-muted-foreground">{formatCurrency(Number(expense.amount))}</p>
        <p className="text-[11px] text-muted-foreground">mensal</p>
      </div>
      <button
        onClick={() => onDelete(expense.id)}
        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        aria-label="Remover despesa fixa"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default Saidas;
