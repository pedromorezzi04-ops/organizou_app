import { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllTransactions, useAllInstallments } from '@/hooks/useFinancialData';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const Tabelas = () => {
  const { data: transactions, isLoading: transactionsLoading } = useAllTransactions();
  const { data: installments, isLoading: installmentsLoading } = useAllInstallments();
  const [activeTab, setActiveTab] = useState('entradas');

  const isLoading = transactionsLoading || installmentsLoading;

  const incomeTransactions = transactions?.filter((t) => t.type === 'income') || [];
  const expenseTransactions = transactions?.filter((t) => t.type === 'expense') || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  if (isLoading) {
    return (
      <Layout title="Tabelas">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Tabelas">
      <div className="space-y-4 pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="entradas">Entradas</TabsTrigger>
            <TabsTrigger value="saidas">Saídas</TabsTrigger>
            <TabsTrigger value="notinhas">Notinhas</TabsTrigger>
          </TabsList>

          <TabsContent value="entradas" className="mt-4">
            <div className="rounded-md border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Descrição</TableHead>
                    <TableHead className="font-semibold text-right">Valor</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeTransactions.length > 0 ? (
                    incomeTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs">{formatDate(t.created_at)}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{t.description}</TableCell>
                        <TableCell className="text-xs text-right font-medium text-green-600">
                          {formatCurrency(Number(t.amount))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={t.status === 'paid' ? 'default' : 'secondary'}
                            className={cn(
                              'text-xs',
                              t.status === 'paid' 
                                ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                            )}
                          >
                            {t.status === 'paid' ? 'Recebido' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma entrada registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {incomeTransactions.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-700">Total</span>
                  <span className="text-lg font-bold text-green-700">
                    {formatCurrency(incomeTransactions.reduce((acc, t) => acc + Number(t.amount), 0))}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="saidas" className="mt-4">
            <div className="rounded-md border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Descrição</TableHead>
                    <TableHead className="font-semibold">Categoria</TableHead>
                    <TableHead className="font-semibold text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseTransactions.length > 0 ? (
                    expenseTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs">{formatDate(t.created_at)}</TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate">{t.description}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-xs">
                            {t.category || 'Outros'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium text-red-600">
                          {formatCurrency(Number(t.amount))}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma saída registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {expenseTransactions.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-red-700">Total</span>
                  <span className="text-lg font-bold text-red-700">
                    {formatCurrency(expenseTransactions.reduce((acc, t) => acc + Number(t.amount), 0))}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notinhas" className="mt-4">
            <div className="rounded-md border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Vencimento</TableHead>
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">Parcela</TableHead>
                    <TableHead className="font-semibold text-right">Valor</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments && installments.length > 0 ? (
                    installments.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="text-xs">{formatDate(i.due_date)}</TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate">{i.customer_name}</TableCell>
                        <TableCell className="text-xs">
                          {i.current_installment}/{i.total_installments}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium text-blue-600">
                          {formatCurrency(Number(i.total_value))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={i.status === 'paid' ? 'default' : 'secondary'}
                            className={cn(
                              'text-xs',
                              i.status === 'paid' 
                                ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                            )}
                          >
                            {i.status === 'paid' ? 'Recebido' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma notinha registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {installments && installments.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-700">Total</span>
                  <span className="text-lg font-bold text-blue-700">
                    {formatCurrency(installments.reduce((acc, i) => acc + Number(i.total_value), 0))}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Tabelas;
