import { createAuthenticatedClient } from '../utils/supabase.ts';
import { successResponse, errorResponse } from '../utils/response.ts';
import { getMonthRange, getWeekRanges, getCurrentMonthYear } from '../utils/date.ts';

export async function handleDashboardSummary(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const month = (params.month as number) || currentMonth;
  const year = (params.year as number) || currentYear;

  const { start, end } = getMonthRange(month, year);
  const supabase = createAuthenticatedClient(token);

  const [incomePaidRes, expensePaidRes, pendingInstRes, futureRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'income')
      .eq('status', 'paid')
      .gte('date', start)
      .lte('date', end),
    supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'expense')
      .eq('status', 'paid')
      .gte('date', start)
      .lte('date', end),
    supabase
      .from('installments')
      .select('amount')
      .eq('status', 'pending')
      .gte('due_date', start)
      .lte('due_date', end),
    supabase
      .from('installments')
      .select('amount')
      .eq('status', 'pending')
      .gt('due_date', end),
  ]);

  if (incomePaidRes.error || expensePaidRes.error) {
    return errorResponse('INTERNAL_ERROR', 'Erro ao calcular resumo');
  }

  const income_paid = (incomePaidRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const expense_paid = (expensePaidRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const pending_receivable = (pendingInstRes.data ?? []).reduce((s, i) => s + Number(i.amount), 0);
  const future_expected = (futureRes.data ?? []).reduce((s, i) => s + Number(i.amount), 0);
  const balance = income_paid - expense_paid;

  return successResponse({
    month,
    year,
    income_paid: Math.round(income_paid * 100) / 100,
    expense_paid: Math.round(expense_paid * 100) / 100,
    pending_receivable: Math.round(pending_receivable * 100) / 100,
    future_expected: Math.round(future_expected * 100) / 100,
    balance: Math.round(balance * 100) / 100,
  });
}

export async function handleDashboardWeeklyChart(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const month = (params.month as number) || currentMonth;
  const year = (params.year as number) || currentYear;

  const weekRanges = getWeekRanges(month, year);
  const supabase = createAuthenticatedClient(token);

  const results = await Promise.all(
    weekRanges.map(async (w) => {
      const [incomeRes, expenseRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'income')
          .eq('status', 'paid')
          .gte('date', w.start)
          .lte('date', w.end),
        supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'expense')
          .eq('status', 'paid')
          .gte('date', w.start)
          .lte('date', w.end),
      ]);

      const income = (incomeRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);
      const expense = (expenseRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);

      return {
        week: w.week,
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100,
      };
    })
  );

  return successResponse(results, { count: results.length });
}
