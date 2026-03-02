import { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllTransactions, useAllInstallments } from '@/hooks/useFinancialData';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, FileText, Check, Clock } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), 'dd/MM/yy', { locale: ptBR });
  } catch {
    return '-';
  }
};

const Tabelas = () => {
  const { data: transactions, isLoading: transactionsLoading } = useAllTransactions();
  const { data: installments, isLoading: installmentsLoading } = useAllInstallments();
  const [activeTab, setActiveTab] = useState('entradas');

  const isLoading = transactionsLoading || installmentsLoading;

  const incomeTransactions = transactions?.filter(t => t.type === 'income') || [];
  const expenseTransactions = transactions?.filter(t => t.type === 'expense') || [];

  return (
    <Layout title="Tabelas">
      <div className="space-y-4 pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-12 p-1 glass-strong rounded-2xl shadow-card">
            <TabsTrigger
              value="entradas"
              className="flex-1 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-card"
            >
              Entradas
            </TabsTrigger>
            <TabsTrigger
              value="saidas"
              className="flex-1 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-card"
            >
              Saídas
            </TabsTrigger>
            <TabsTrigger
              value="notinhas"
              className="flex-1 rounded-xl text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-card"
            >
              Notinhas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entradas" className="mt-4 space-y-3 animate-fade-in">
            {isLoading ? (
              <LoadingRows count={4} />
            ) : incomeTransactions.length === 0 ? (
              <TableEmpty icon={TrendingUp} message="Nenhuma entrada registrada" color="emerald" />
            ) : (
              <>
                {incomeTransactions.map((t, i) => (
                  <div
                    key={t.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className={cn(
                      "glass rounded-xl p-3.5 lg:p-4 shadow-card border transition-all duration-200",
                      "hover:shadow-lift hover:-translate-y-0.5",
                      t.status === 'paid' ? "border-emerald/15" : "border-amber/15"
                    )}>
                      <div className="flex items-center gap-3">
                        <StatusDot paid={t.status === 'paid'} />
                        <span className="text-xs text-muted-foreground w-16 shrink-0">{formatDate(t.created_at)}</span>
                        <span className="text-sm font-medium truncate flex-1">{t.description}</span>
                        <span className="text-sm font-semibold text-emerald">{formatCurrency(Number(t.amount))}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <TotalCard
                  total={incomeTransactions.reduce((acc, t) => acc + Number(t.amount), 0)}
                  variant="income"
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="saidas" className="mt-4 space-y-3 animate-fade-in">
            {isLoading ? (
              <LoadingRows count={4} />
            ) : expenseTransactions.length === 0 ? (
              <TableEmpty icon={TrendingDown} message="Nenhuma saída registrada" color="destructive" />
            ) : (
              <>
                {expenseTransactions.map((t, i) => (
                  <div
                    key={t.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className="glass rounded-xl p-3.5 lg:p-4 shadow-card border border-destructive/10 transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5">
                      <div className="flex items-center gap-3">
                        <span className="text-base">{t.category === 'fornecedor' ? '🏭' : t.category === 'insumo' ? '📦' : t.category === 'manutencao' ? '🔧' : '📋'}</span>
                        <span className="text-xs text-muted-foreground w-16 shrink-0">{formatDate(t.created_at)}</span>
                        <span className="text-sm font-medium truncate flex-1">{t.description}</span>
                        <span className="text-sm font-semibold text-destructive">{formatCurrency(Number(t.amount))}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <TotalCard
                  total={expenseTransactions.reduce((acc, t) => acc + Number(t.amount), 0)}
                  variant="expense"
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="notinhas" className="mt-4 space-y-3 animate-fade-in">
            {isLoading ? (
              <LoadingRows count={4} />
            ) : !installments || installments.length === 0 ? (
              <TableEmpty icon={FileText} message="Nenhuma notinha registrada" color="primary" />
            ) : (
              <>
                {installments.map((inst, i) => (
                  <div
                    key={inst.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className={cn(
                      "glass rounded-xl p-3.5 lg:p-4 shadow-card border transition-all duration-200",
                      "hover:shadow-lift hover:-translate-y-0.5",
                      inst.status === 'paid' ? "border-emerald/15" : "border-amber/15"
                    )}>
                      <div className="flex items-center gap-3">
                        <StatusDot paid={inst.status === 'paid'} />
                        <span className="text-xs text-muted-foreground w-16 shrink-0">{formatDate(inst.due_date)}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{inst.customer_name}</span>
                          <span className="text-[11px] text-muted-foreground">{inst.current_installment}/{inst.total_installments}</span>
                        </div>
                        <span className="text-sm font-semibold text-primary">{formatCurrency(Number(inst.total_value))}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <TotalCard
                  total={installments.reduce((acc, i) => acc + Number(i.total_value), 0)}
                  variant="installment"
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

const StatusDot = ({ paid }: { paid: boolean }) => (
  <div className="relative">
    <div className={cn(
      "w-2.5 h-2.5 rounded-full",
      paid ? "bg-emerald" : "bg-amber"
    )} />
    {!paid && (
      <div className="absolute inset-0 rounded-full bg-amber animate-ping opacity-40" />
    )}
  </div>
);

const LoadingRows = ({ count }: { count: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="h-14 rounded-xl" style={{ animationDelay: `${i * 80}ms` }} />
    ))}
  </>
);

const TableEmpty = ({ icon: Icon, message, color }: { icon: React.ElementType; message: string; color: string }) => (
  <div className="text-center py-16 animate-fade-in">
    <div className={cn(
      "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-card",
      color === 'emerald' && "bg-emerald-light text-emerald",
      color === 'destructive' && "bg-destructive/10 text-destructive",
      color === 'primary' && "bg-accent text-accent-foreground",
    )}>
      <Icon className="w-8 h-8" />
    </div>
    <p className="text-muted-foreground">{message}</p>
  </div>
);

const TotalCard = ({ total, variant }: { total: number; variant: 'income' | 'expense' | 'installment' }) => (
  <div className={cn(
    "glass-strong rounded-xl p-4 lg:p-5 shadow-card border animate-fade-in",
    variant === 'income' && "border-emerald/20",
    variant === 'expense' && "border-destructive/20",
    variant === 'installment' && "border-primary/20",
  )}>
    <div className="flex justify-between items-center">
      <span className="text-sm font-medium text-muted-foreground">Total</span>
      <span className={cn(
        "text-lg font-bold",
        variant === 'income' && "text-emerald",
        variant === 'expense' && "text-destructive",
        variant === 'installment' && "text-primary",
      )}>
        {formatCurrency(total)}
      </span>
    </div>
  </div>
);

export default Tabelas;
