import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  status: 'paid' | 'pending';
  category: string | null;
  due_date: string | null;
  payment_method: string | null;
  installment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Installment {
  id: string;
  user_id: string;
  customer_name: string;
  total_value: number;
  current_installment: number;
  total_installments: number;
  parent_note_id: string | null;
  due_date: string;
  status: 'paid' | 'pending';
  created_at: string;
  updated_at: string;
}

export const useMonthlyTransactions = () => {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['transactions', 'monthly', user?.id, monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });
};

export const useAllTransactions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transactions', 'all', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });
};

export const useRecurringExpenses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recurring_expenses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .order('due_day', { ascending: true });

      if (error) throw error;
      return data as RecurringExpense[];
    },
    enabled: !!user,
  });
};

export const useMonthlyInstallments = () => {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['installments', 'monthly', user?.id, monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Installment[];
    },
    enabled: !!user,
  });
};

export const useAllInstallments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['installments', 'all', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Installment[];
    },
    enabled: !!user,
  });
};

export const useFutureInstallments = () => {
  const { user } = useAuth();
  const now = new Date();
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['installments', 'future', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .gt('due_date', monthEnd)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Installment[];
    },
    enabled: !!user,
  });
};

export const useDashboardSummary = () => {
  const { data: transactions, isLoading: transactionsLoading } = useMonthlyTransactions();
  const { data: installments, isLoading: installmentsLoading } = useMonthlyInstallments();
  const { data: futureInstallments, isLoading: futureLoading } = useFutureInstallments();

  const isLoading = transactionsLoading || installmentsLoading || futureLoading;

  const summary = {
    entrou: 0,
    saiu: 0,
    faltaReceber: 0,
    previsto: 0,
    sobrou: 0,
  };

  if (transactions) {
    summary.entrou = transactions
      .filter(t => t.type === 'income' && t.status === 'paid')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    summary.saiu = transactions
      .filter(t => t.type === 'expense' && t.status === 'paid')
      .reduce((acc, t) => acc + Number(t.amount), 0);
  }

  if (installments) {
    summary.faltaReceber = installments
      .filter(i => i.status === 'pending')
      .reduce((acc, i) => acc + Number(i.total_value), 0);
  }

  if (futureInstallments) {
    summary.previsto = futureInstallments
      .reduce((acc, i) => acc + Number(i.total_value), 0);
  }

  summary.sobrou = summary.entrou - summary.saiu;

  return { summary, isLoading };
};
