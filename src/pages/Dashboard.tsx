import { TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';
import Layout from '@/components/Layout';
import SummaryCard from '@/components/SummaryCard';
import { useDashboardSummary, useMonthlyTransactions } from '@/hooks/useFinancialData';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts';
import { startOfMonth, endOfMonth, eachWeekOfInterval, format, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const Dashboard = () => {
  const { summary, isLoading } = useDashboardSummary();
  const { data: transactions } = useMonthlyTransactions();

  // Prepare weekly data for the mini chart
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 0 }
  );

  const weeklyData = weeks.map((weekStart, index) => {
    const weekEnd = index < weeks.length - 1 ? weeks[index + 1] : monthEnd;
    
    const weekTransactions = transactions?.filter((t) => {
      const date = parseISO(t.created_at);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    }) || [];

    const income = weekTransactions
      .filter((t) => t.type === 'income' && t.status === 'paid')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const expense = weekTransactions
      .filter((t) => t.type === 'expense' && t.status === 'paid')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    return {
      week: `S${index + 1}`,
      income,
      expense,
    };
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Destaque: Sobrou no Mês */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
          <p className="text-sm font-medium opacity-90">Sobrou no mês</p>
          {isLoading ? (
            <Skeleton className="h-10 w-40 bg-primary-foreground/20 mt-1" />
          ) : (
            <p className={cn(
              "text-3xl font-bold mt-1",
              summary.sobrou < 0 && "text-red-200"
            )}>
              {formatCurrency(summary.sobrou)}
            </p>
          )}
          <p className="text-xs opacity-75 mt-2">
            {summary.sobrou >= 0 
              ? "Continue assim! 🎉" 
              : "Atenção aos gastos 📊"}
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 gap-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </>
          ) : (
            <>
              <SummaryCard
                title="Entrou no mês"
                value={summary.entrou}
                icon={<TrendingUp className="w-5 h-5" />}
                variant="income"
              />
              <SummaryCard
                title="Saiu no mês"
                value={summary.saiu}
                icon={<TrendingDown className="w-5 h-5" />}
                variant="expense"
              />
              <SummaryCard
                title="Falta receber"
                value={summary.faltaReceber}
                icon={<Clock className="w-5 h-5" />}
                variant="pending"
              />
              <SummaryCard
                title="Previsto"
                value={summary.previsto}
                icon={<Calendar className="w-5 h-5" />}
                variant="forecast"
              />
            </>
          )}
        </div>


        {/* Mini Bar Chart - Fluxo Semanal */}
        {!isLoading && weeklyData.some(w => w.income > 0 || w.expense > 0) && (
          <div className="rounded-xl bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-3">Fluxo semanal do mês</p>
            <div className="h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barGap={2}>
                  <XAxis 
                    dataKey="week" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Bar 
                    dataKey="income" 
                    fill="hsl(142, 76%, 36%)" 
                    radius={[2, 2, 0, 0]} 
                    opacity={0.7}
                  />
                  <Bar 
                    dataKey="expense" 
                    fill="hsl(0, 84%, 60%)" 
                    radius={[2, 2, 0, 0]} 
                    opacity={0.7}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm bg-[hsl(142,76%,36%)] opacity-70" />
                <span className="text-[10px] text-muted-foreground">Entradas</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm bg-[hsl(0,84%,60%)] opacity-70" />
                <span className="text-[10px] text-muted-foreground">Saídas</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
