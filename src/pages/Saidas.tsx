import { useState } from 'react';
import { Plus, TrendingDown, Repeat } from 'lucide-react';
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

  const expenseTransactions = transactions?.filter(t => t.type === 'expense') || [];

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
                <ExpenseCard key={transaction.id} transaction={transaction} />
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
                <RecurringExpenseCard key={expense.id} expense={expense} />
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

const ExpenseCard = ({ transaction }: { transaction: Transaction }) => {
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
        <div className="text-right">
          <p className="font-semibold text-red-600 dark:text-red-400">
            -{formatCurrency(Number(transaction.amount))}
          </p>
        </div>
      </div>
    </div>
  );
};

const RecurringExpenseCard = ({ expense }: { expense: RecurringExpense }) => {
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
        <div className="text-right">
          <p className="font-semibold text-muted-foreground">
            {formatCurrency(Number(expense.amount))}
          </p>
          <p className="text-xs text-muted-foreground">mensal</p>
        </div>
      </div>
    </div>
  );
};

export default Saidas;
