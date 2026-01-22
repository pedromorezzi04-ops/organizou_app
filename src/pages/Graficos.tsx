import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllTransactions, useAllInstallments } from '@/hooks/useFinancialData';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

const COLORS = {
  income: 'hsl(142, 76%, 36%)',
  expense: 'hsl(0, 84%, 60%)',
  pending: 'hsl(45, 93%, 47%)',
  forecast: 'hsl(217, 91%, 60%)',
};

const chartConfig = {
  income: {
    label: 'Entradas',
    color: COLORS.income,
  },
  expense: {
    label: 'Saídas',
    color: COLORS.expense,
  },
  pending: {
    label: 'Pendente',
    color: COLORS.pending,
  },
  forecast: {
    label: 'Previsto',
    color: COLORS.forecast,
  },
};

const Graficos = () => {
  const { data: transactions, isLoading: transactionsLoading } = useAllTransactions();
  const { data: installments, isLoading: installmentsLoading } = useAllInstallments();
  const [activeTab, setActiveTab] = useState('overview');

  const isLoading = transactionsLoading || installmentsLoading;

  // Prepare monthly data for last 6 months
  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date(),
  });

  const monthlyData = last6Months.map((month) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthKey = format(month, 'MMM', { locale: ptBR });

    const monthTransactions = transactions?.filter((t) => {
      const date = parseISO(t.created_at);
      return date >= monthStart && date <= monthEnd;
    }) || [];

    const monthInstallments = installments?.filter((i) => {
      const date = parseISO(i.due_date);
      return date >= monthStart && date <= monthEnd;
    }) || [];

    const income = monthTransactions
      .filter((t) => t.type === 'income' && t.status === 'paid')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const expense = monthTransactions
      .filter((t) => t.type === 'expense' && t.status === 'paid')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const pendingInstallments = monthInstallments
      .filter((i) => i.status === 'pending')
      .reduce((acc, i) => acc + Number(i.total_value), 0);

    const paidInstallments = monthInstallments
      .filter((i) => i.status === 'paid')
      .reduce((acc, i) => acc + Number(i.total_value), 0);

    return {
      month: monthKey,
      income,
      expense,
      pending: pendingInstallments,
      received: paidInstallments,
      balance: income - expense,
    };
  });

  // Category breakdown for expenses
  const categoryData = transactions
    ?.filter((t) => t.type === 'expense' && t.category)
    .reduce((acc, t) => {
      const category = t.category || 'Outros';
      acc[category] = (acc[category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>) || {};

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  const PIE_COLORS = [
    'hsl(217, 91%, 60%)',
    'hsl(142, 76%, 36%)',
    'hsl(45, 93%, 47%)',
    'hsl(0, 84%, 60%)',
    'hsl(280, 65%, 60%)',
    'hsl(180, 70%, 45%)',
  ];

  // Payment method breakdown
  const paymentMethodData = transactions
    ?.filter((t) => t.type === 'income' && t.payment_method)
    .reduce((acc, t) => {
      const method = t.payment_method || 'Outros';
      acc[method] = (acc[method] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>) || {};

  const paymentPieData = Object.entries(paymentMethodData).map(([name, value]) => ({
    name,
    value,
  }));

  // Summary totals
  const totalIncome = transactions
    ?.filter((t) => t.type === 'income' && t.status === 'paid')
    .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

  const totalExpense = transactions
    ?.filter((t) => t.type === 'expense' && t.status === 'paid')
    .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

  const totalPending = installments
    ?.filter((i) => i.status === 'pending')
    .reduce((acc, i) => acc + Number(i.total_value), 0) || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <Layout title="Gráficos">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Gráficos">
      <div className="space-y-4 pb-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700">Total Entradas</span>
              </div>
              <p className="text-lg font-bold text-green-700 mt-1">
                {formatCurrency(totalIncome)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-700">Total Saídas</span>
              </div>
              <p className="text-lg font-bold text-red-700 mt-1">
                {formatCurrency(totalExpense)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-yellow-700">A Receber</span>
              </div>
              <p className="text-lg font-bold text-yellow-700 mt-1">
                {formatCurrency(totalPending)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700">Saldo</span>
              </div>
              <p className={`text-lg font-bold mt-1 ${totalIncome - totalExpense >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="forecast">Previsão</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Bar Chart - Income vs Expense */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Entradas vs Saídas (Últimos 6 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={monthlyData} accessibilityLayer>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="income" fill={COLORS.income} radius={[4, 4, 0, 0]} name="Entradas" />
                    <Bar dataKey="expense" fill={COLORS.expense} radius={[4, 4, 0, 0]} name="Saídas" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Line Chart - Balance Evolution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Evolução do Saldo</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <AreaChart data={monthlyData} accessibilityLayer>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.forecast} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.forecast} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke={COLORS.forecast}
                      fill="url(#balanceGradient)"
                      strokeWidth={2}
                      name="Saldo"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4 mt-4">
            {/* Pie Chart - Expense Categories */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Saídas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <PieChart accessibilityLayer>
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Nenhuma saída categorizada
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart - Payment Methods */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Entradas por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentPieData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <PieChart accessibilityLayer>
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Pie
                        data={paymentPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {paymentPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Nenhuma entrada com método de pagamento
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast" className="space-y-4 mt-4">
            {/* Installments Forecast */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Notinhas por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={monthlyData} accessibilityLayer>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="received" fill={COLORS.income} radius={[4, 4, 0, 0]} name="Recebido" />
                    <Bar dataKey="pending" fill={COLORS.pending} radius={[4, 4, 0, 0]} name="Pendente" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Future Installments */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Previsão de Recebimentos</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <LineChart data={monthlyData} accessibilityLayer>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Line
                      type="monotone"
                      dataKey="pending"
                      stroke={COLORS.pending}
                      strokeWidth={2}
                      dot={{ fill: COLORS.pending }}
                      name="A Receber"
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Graficos;
