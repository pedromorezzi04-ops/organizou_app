import { createAuthenticatedClient } from '../utils/supabase.ts';
import { successResponse, errorResponse } from '../utils/response.ts';
import {
  validateRequired,
  validateEnum,
  validateUUID,
  validateIntegerRange,
} from '../utils/validation.ts';

export async function handleTaxesConfigGet(
  _params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const supabase = createAuthenticatedClient(token);
  const { data, error } = await supabase
    .from('profiles')
    .select('tax_regime, tax_rate, mei_fixed_value')
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao buscar configuração tributária');
  return successResponse(data);
}

export async function handleTaxesConfigUpdate(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['tax_regime']);
  if (err) return errorResponse('VALIDATION_ERROR', err);

  const regimeErr = validateEnum(params.tax_regime, ['MEI', 'ME'], 'tax_regime');
  if (regimeErr) return errorResponse('VALIDATION_ERROR', regimeErr);

  if (params.tax_regime === 'MEI') {
    if (params.mei_fixed_value === undefined || params.mei_fixed_value === null) {
      return errorResponse('VALIDATION_ERROR', "O campo 'mei_fixed_value' é obrigatório para MEI");
    }
    if (typeof params.mei_fixed_value !== 'number' || params.mei_fixed_value <= 0) {
      return errorResponse('VALIDATION_ERROR', "O campo 'mei_fixed_value' deve ser um número maior que zero");
    }
  }

  if (params.tax_regime === 'ME') {
    if (params.tax_rate === undefined || params.tax_rate === null) {
      return errorResponse('VALIDATION_ERROR', "O campo 'tax_rate' é obrigatório para ME");
    }
    if (typeof params.tax_rate !== 'number' || params.tax_rate < 0.01 || params.tax_rate > 100) {
      return errorResponse('VALIDATION_ERROR', "O campo 'tax_rate' deve ser um percentual entre 0.01 e 100");
    }
  }

  const supabase = createAuthenticatedClient(token);
  const updates: Record<string, unknown> = { tax_regime: params.tax_regime };
  if (params.tax_rate !== undefined) updates.tax_rate = params.tax_rate;
  if (params.mei_fixed_value !== undefined) updates.mei_fixed_value = params.mei_fixed_value;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .select('tax_regime, tax_rate, mei_fixed_value')
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao atualizar configuração tributária');
  return successResponse(data);
}

export async function handleTaxesCalculate(
  params: Record<string, unknown>,
  userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['month', 'year']);
  if (err) return errorResponse('VALIDATION_ERROR', err);

  const monthErr = validateIntegerRange(params.month, 1, 12, 'month');
  if (monthErr) return errorResponse('VALIDATION_ERROR', monthErr);

  if (typeof params.year !== 'number' || params.year < 2000 || params.year > 2100) {
    return errorResponse('VALIDATION_ERROR', "O campo 'year' deve ser um ano válido entre 2000 e 2100");
  }

  const month = params.month as number;
  const year = params.year as number;
  const supabase = createAuthenticatedClient(token);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tax_regime, tax_rate, mei_fixed_value')
    .single();

  if (profileError || !profile) {
    return errorResponse('INTERNAL_ERROR', 'Erro ao buscar configuração tributária');
  }

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  let calculatedAmount = 0;
  let revenue: number | null = null;

  if (profile.tax_regime === 'MEI') {
    calculatedAmount = profile.mei_fixed_value ?? 0;
  } else if (profile.tax_regime === 'ME') {
    const { data: incomeData, error: incomeError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('type', 'income')
      .eq('status', 'paid')
      .gte('date', monthStart)
      .lte('date', monthEnd);

    if (incomeError) return errorResponse('INTERNAL_ERROR', 'Erro ao calcular faturamento');

    revenue = (incomeData ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
    calculatedAmount = Math.round(revenue * ((profile.tax_rate ?? 0) / 100) * 100) / 100;
  }

  const { data: existingPayment } = await supabase
    .from('tax_payments')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  let payment = existingPayment;
  if (!payment) {
    const { data: newPayment, error: createError } = await supabase
      .from('tax_payments')
      .insert({
        user_id: userId,
        month,
        year,
        amount: calculatedAmount,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) return errorResponse('INTERNAL_ERROR', 'Erro ao criar registro de imposto');
    payment = newPayment;
  }

  return successResponse({
    month,
    year,
    regime: profile.tax_regime,
    ...(revenue !== null ? { revenue } : {}),
    calculated_amount: calculatedAmount,
    payment_status: payment.status,
    payment_id: payment.id,
  });
}

export async function handleTaxesUpdateStatus(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['id', 'status']);
  if (err) return errorResponse('VALIDATION_ERROR', err);
  const uuidErr = validateUUID(params.id, 'id');
  if (uuidErr) return errorResponse('VALIDATION_ERROR', uuidErr);
  const statusErr = validateEnum(params.status, ['paid', 'pending'], 'status');
  if (statusErr) return errorResponse('VALIDATION_ERROR', statusErr);

  const supabase = createAuthenticatedClient(token);

  const { data: existing } = await supabase
    .from('tax_payments')
    .select('id')
    .eq('id', params.id as string)
    .maybeSingle();

  if (!existing) return errorResponse('NOT_FOUND', 'Pagamento de imposto não encontrado');

  const { data, error } = await supabase
    .from('tax_payments')
    .update({ status: params.status })
    .eq('id', params.id as string)
    .select()
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao atualizar status do imposto');
  return successResponse(data);
}

export async function handleTaxesListPayments(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['year']);
  if (err) return errorResponse('VALIDATION_ERROR', err);

  if (typeof params.year !== 'number') {
    return errorResponse('VALIDATION_ERROR', "O campo 'year' deve ser um número");
  }

  const supabase = createAuthenticatedClient(token);
  let query = supabase
    .from('tax_payments')
    .select('*', { count: 'exact' })
    .eq('year', params.year as number)
    .order('month', { ascending: true });

  if (params.status !== undefined) {
    const statusErr = validateEnum(params.status, ['paid', 'pending'], 'status');
    if (statusErr) return errorResponse('VALIDATION_ERROR', statusErr);
    query = query.eq('status', params.status as string);
  }

  const { data, error, count } = await query;
  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao buscar pagamentos de impostos');
  return successResponse(data, { count: count ?? 0 });
}
