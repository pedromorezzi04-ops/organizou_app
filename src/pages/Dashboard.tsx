import { TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';
import Layout from '@/components/Layout';
import SummaryCard from '@/components/SummaryCard';
import { useDashboardSummary } from '@/hooks/useFinancialData';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const Dashboard = () => {
  const { summary, isLoading } = useDashboardSummary();

  return (
    <Layout title="Início">
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

        {/* Dica rápida */}
        <div className="rounded-xl bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            💡 <span className="font-medium">Dica:</span> Cadastre suas despesas fixas para ter uma visão mais precisa do seu saldo.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
