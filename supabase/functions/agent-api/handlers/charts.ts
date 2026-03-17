import { createAuthenticatedClient } from '../utils/supabase.ts';
import { successResponse, errorResponse } from '../utils/response.ts';
import { getMonthRange, getMonthLabel, getCurrentMonthYear } from '../utils/date.ts';
import { validateRequired, validateEnum } from '../utils/validation.ts';

export async function handleChartsMonthlyOverview(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const numMonths = Math.min(Number(params.num_months) || 6, 24);
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const supabase = createAuthenticatedClient(token);

  const monthList: Array<{ m: number; y: number }> = [];
  for (let i = numMonths - 1; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) { m += 12; y--; }
    monthList.push({ m, y });
  }

  const results = await Promise.all(
    monthList.map(async ({ m, y }) => {
      const { start, end } = getMonthRange(m, y);

      const [incomeRes, expenseRes] = await Promise.all([
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
      ]);

      const income = (incomeRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);
      const expense = (expenseRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);

      return {
        month: m,
        year: y,
        label: getMonthLabel(m, y),
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100,
        balance: Math.round((income - expense) * 100) / 100,
      };
    })
  );

  return successResponse(results, { count: results.length });
}

export async function handleChartsByCategory(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['type']);
  if (err) return errorResponse('VALIDATION_ERROR', err);

  const typeErr = validateEnum(params.type, ['income', 'expense'], 'type');
  if (typeErr) return errorResponse('VALIDATION_ERROR', typeErr);

  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const month = (params.month as number) || currentMonth;
  const year = (params.year as number) || currentYear;
  const { start, end } = getMonthRange(month, year);

  const supabase = createAuthenticatedClient(token);
  const { data, error } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('type', params.type as string)
    .gte('date', start)
    .lte('date', end);

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao buscar dados por categoria');

  const categoryMap = new Map<string, number>();
  let total = 0;

  for (const t of data ?? []) {
    const cat = (t.category as string) || 'Sem categoria';
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Number(t.amount));
    total += Number(t.amount);
  }

  const results = Array.from(categoryMap.entries())
    .map(([category, catTotal]) => ({
      category,
      total: Math.round(catTotal * 100) / 100,
      percentage: total > 0 ? Math.round((catTotal / total) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return successResponse(results, { count: results.length });
}

export async function handleChartsEvolution(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const typeErr = validateRequired(params, ['type']);
  if (typeErr) return errorResponse('VALIDATION_ERROR', typeErr);

  const typeValErr = validateEnum(params.type, ['income', 'expense', 'balance'], 'type');
  if (typeValErr) return errorResponse('VALIDATION_ERROR', typeValErr);

  const typeVal = params.type as string;
  const numMonths = Math.min(Number(params.num_months) || 6, 24);
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const supabase = createAuthenticatedClient(token);

  const monthList: Array<{ m: number; y: number }> = [];
  for (let i = numMonths - 1; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) { m += 12; y--; }
    monthList.push({ m, y });
  }

  const results = await Promise.all(
    monthList.map(async ({ m, y }) => {
      const { start, end } = getMonthRange(m, y);

      let value = 0;

      if (typeVal === 'income' || typeVal === 'balance') {
        const { data: incomeData } = await supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'income')
          .eq('status', 'paid')
          .gte('date', start)
          .lte('date', end);
        value += (incomeData ?? []).reduce((s, t) => s + Number(t.amount), 0);
      }

      if (typeVal === 'expense' || typeVal === 'balance') {
        const { data: expenseData } = await supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'expense')
          .eq('status', 'paid')
          .gte('date', start)
          .lte('date', end);
        const expenseSum = (expenseData ?? []).reduce((s, t) => s + Number(t.amount), 0);
        if (typeVal === 'expense') value = expenseSum;
        else value -= expenseSum;
      }

      return {
        month: m,
        year: y,
        label: getMonthLabel(m, y),
        value: Math.round(value * 100) / 100,
      };
    })
  );

  return successResponse(results, { count: results.length });
}
