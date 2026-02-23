import { TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';
import Layout from '@/components/Layout';
import SummaryCard from '@/components/SummaryCard';
import { useDashboardSummary, useMonthlyTransactions } from '@/hooks/useFinancialData';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { startOfMonth, endOfMonth, eachWeekOfInterval, parseISO, isWithinInterval } from 'date-fns';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg border px-3 py-2 shadow-lift text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-muted-foreground">
            {p.dataKey === 'income' ? 'Entradas' : 'Saídas'}:
          </span>
          <span className="font-bold text-foreground tabular-nums">
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { summary, isLoading } = useDashboardSummary();
  const { data: transactions } = useMonthlyTransactions();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 0 }
  );

  const weeklyData = weeks.map((weekStart, index) => {
    const weekEnd = index < weeks.length - 1 ? weeks[index + 1] : monthEnd;
    const weekTx = transactions?.filter((t) => {
      const date = parseISO(t.created_at);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    }) || [];

    return {
      week: `Sem ${index + 1}`,
      income: weekTx.filter(t => t.type === 'income' && t.status === 'paid').reduce((a, t) => a + Number(t.amount), 0),
      expense: weekTx.filter(t => t.type === 'expense' && t.status === 'paid').reduce((a, t) => a + Number(t.amount), 0),
    };
  });

  return (
    <Layout>
      <div className="space-y-5">
        {/* Hero card: Sobrou no mês */}
        <div className={cn(
          "rounded-2xl p-6 text-primary-foreground relative overflow-hidden",
          "bg-gradient-to-br from-primary via-primary/90 to-emerald",
          "shadow-lift animate-fade-in"
        )}>
          {/* Subtle decorative circle */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary-foreground/5" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-primary-foreground/5" />

          <p className="text-sm font-medium opacity-90 relative z-10">Sobrou no mês</p>
          {isLoading ? (
            <Skeleton className="h-10 w-40 bg-primary-foreground/20 mt-1" />
          ) : (
            <p className={cn(
              "text-3xl font-bold mt-1 tabular-nums relative z-10",
              summary.sobrou < 0 && "text-red-200"
            )}>
              {formatCurrency(summary.sobrou)}
            </p>
          )}
          <p className="text-xs opacity-75 mt-2 relative z-10">
            {summary.sobrou >= 0 ? "Continue assim! 🎉" : "Atenção aos gastos 📊"}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          {isLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[88px] rounded-xl" />)
          ) : (
            <>
              <SummaryCard title="Entrou no mês" value={summary.entrou} icon={<TrendingUp className="w-4.5 h-4.5" />} variant="income" index={0} />
              <SummaryCard title="Saiu no mês" value={summary.saiu} icon={<TrendingDown className="w-4.5 h-4.5" />} variant="expense" index={1} />
              <SummaryCard title="Falta receber" value={summary.faltaReceber} icon={<Clock className="w-4.5 h-4.5" />} variant="pending" index={2} />
              <SummaryCard title="Previsto" value={summary.previsto} icon={<Calendar className="w-4.5 h-4.5" />} variant="forecast" index={3} />
            </>
          )}
        </div>

        {/* Weekly chart */}
        {!isLoading && weeklyData.some(w => w.income > 0 || w.expense > 0) && (
          <div className="bg-card shadow-card border border-border rounded-xl p-4 animate-slide-up" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
            <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Fluxo semanal do mês
            </p>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barGap={3} barCategoryGap="20%">
                  <XAxis
                    dataKey="week"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', radius: 4 }} />
                  <Bar
                    dataKey="income"
                    fill="hsl(var(--emerald))"
                    radius={[4, 4, 0, 0]}
                    opacity={0.85}
                  />
                  <Bar
                    dataKey="expense"
                    fill="hsl(var(--destructive))"
                    radius={[4, 4, 0, 0]}
                    opacity={0.65}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-5 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald opacity-85" />
                <span className="text-xs text-muted-foreground font-medium">Entradas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-destructive opacity-65" />
                <span className="text-xs text-muted-foreground font-medium">Saídas</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
