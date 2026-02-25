import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, Clock, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import Layout from '@/components/Layout';
import SummaryCard from '@/components/SummaryCard';
import { useDashboardSummary, useMonthlyTransactions } from '@/hooks/useFinancialData';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { startOfMonth, endOfMonth, eachWeekOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';

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

const PaymentChecker = () => {
  const [checking, setChecking] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const { refresh } = useSubscription();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!user) return;

    // Subscribe to realtime changes on the user's profile
    const channel = supabase
      .channel('payment-check')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord.subscription_status === 'active') {
            setConfirmed(true);
            setChecking(false);
            localStorage.removeItem('cakto_pending');
            toast.success('Pagamento confirmado! Acesso liberado.');
            refresh();
            setTimeout(() => {
              setSearchParams({}, { replace: true });
            }, 2000);
          }
        }
      )
      .subscribe();

    // Also poll every 10s as fallback
    const pollInterval = setInterval(async () => {
      const { data } = await supabase.rpc('get_subscription_info', { _user_id: user.id });
      if (data?.[0]?.subscription_status === 'active') {
        setConfirmed(true);
        setChecking(false);
        localStorage.removeItem('cakto_pending');
        toast.success('Pagamento confirmado! Acesso liberado.');
        refresh();
        clearInterval(pollInterval);
        setTimeout(() => setSearchParams({}, { replace: true }), 2000);
      }
    }, 10000);

    // Timeout after 120s
    const timeout = setTimeout(() => {
      setChecking(false);
      localStorage.removeItem('cakto_pending');
      toast.info('Se já pagou, aguarde alguns minutos. Seu acesso será liberado automaticamente.');
      setSearchParams({}, { replace: true });
    }, 120000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [user, refresh, setSearchParams]);

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center space-y-4 animate-in fade-in zoom-in">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Pagamento Confirmado!</h2>
          <p className="text-muted-foreground">Seu acesso foi liberado.</p>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Processando seu pagamento...</h2>
          <p className="text-sm text-muted-foreground">Seu acesso será liberado em instantes.</p>
        </div>
      </div>
    );
  }

  return null;
};

const Dashboard = () => {
  const { summary, isLoading } = useDashboardSummary();
  const { data: transactions } = useMonthlyTransactions();
  const [searchParams] = useSearchParams();
  const isCheckingPayment = searchParams.get('status') === 'checking' || localStorage.getItem('cakto_pending') === 'true';

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
      {isCheckingPayment && <PaymentChecker />}
      <div className="space-y-5">
        {/* Hero card: Sobrou no mês */}
        <div className={cn(
          "rounded-2xl p-6 text-primary-foreground relative overflow-hidden",
          "bg-gradient-to-br from-primary via-primary/90 to-emerald",
          "shadow-lift animate-fade-in"
        )}>
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
                  <Bar dataKey="income" fill="hsl(var(--emerald))" radius={[4, 4, 0, 0]} opacity={0.85} />
                  <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.65} />
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
