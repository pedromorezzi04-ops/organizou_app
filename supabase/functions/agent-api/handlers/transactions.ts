import { createAuthenticatedClient } from '../utils/supabase.ts';
import { successResponse, errorResponse } from '../utils/response.ts';
import {
  validateRequired,
  validatePositiveNumber,
  validateEnum,
  validateISODate,
  validateUUID,
} from '../utils/validation.ts';

export async function handleTransactionsList(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const supabase = createAuthenticatedClient(token);
  let query = supabase.from('transactions').select('*', { count: 'exact' });

  if (params.type !== undefined) {
    const err = validateEnum(params.type, ['income', 'expense'], 'type');
    if (err) return errorResponse('VALIDATION_ERROR', err);
    query = query.eq('type', params.type as string);
  }

  if (params.status !== undefined) {
    const err = validateEnum(params.status, ['paid', 'pending'], 'status');
    if (err) return errorResponse('VALIDATION_ERROR', err);
    query = query.eq('status', params.status as string);
  }

  if (params.category !== undefined) {
    query = query.eq('category', params.category as string);
  }

  if (params.date_from !== undefined) {
    const err = validateISODate(params.date_from, 'date_from');
    if (err) return errorResponse('VALIDATION_ERROR', err);
    query = query.gte('date', params.date_from as string);
  }

  if (params.date_to !== undefined) {
    const err = validateISODate(params.date_to, 'date_to');
    if (err) return errorResponse('VALIDATION_ERROR', err);
    query = query.lte('date', params.date_to as string);
  }

  if (params.search !== undefined) {
    query = query.ilike('description', `%${params.search}%`);
  }

  if (params.payment_method !== undefined) {
    query = query.eq('payment_method', params.payment_method as string);
  }

  const validOrderBy = ['date', 'amount', 'created_at'];
  const orderBy = (params.order_by as string) || 'date';
  const orderDir = (params.order_dir as string) || 'desc';

  if (!validOrderBy.includes(orderBy)) {
    return errorResponse('VALIDATION_ERROR', `order_by deve ser um de: ${validOrderBy.join(', ')}`);
  }

  query = query.order(orderBy, { ascending: orderDir === 'asc' });

  const limit = Math.min(Number(params.limit) || 50, 200);
  const offset = Number(params.offset) || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error(JSON.stringify({ action: 'transactions.list', error: error.message }));
    return errorResponse('INTERNAL_ERROR', 'Erro ao buscar transações');
  }

  return successResponse(data, { count: count ?? 0 });
}

export async function handleTransactionsGet(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['id']);
  if (err) return errorResponse('VALIDATION_ERROR', err);
  const uuidErr = validateUUID(params.id, 'id');
  if (uuidErr) return errorResponse('VALIDATION_ERROR', uuidErr);

  const supabase = createAuthenticatedClient(token);
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', params.id as string)
    .maybeSingle();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao buscar transação');
  if (!data) return errorResponse('NOT_FOUND', 'Transação não encontrada');
  return successResponse(data);
}

export async function handleTransactionsCreate(
  params: Record<string, unknown>,
  userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['type', 'description', 'amount']);
  if (err) return errorResponse('VALIDATION_ERROR', err);

  const typeErr = validateEnum(params.type, ['income', 'expense'], 'type');
  if (typeErr) return errorResponse('VALIDATION_ERROR', typeErr);

  const amountErr = validatePositiveNumber(params.amount, 'amount');
  if (amountErr) return errorResponse('VALIDATION_ERROR', amountErr);

  if (typeof params.description !== 'string' || params.description.trim() === '') {
    return errorResponse('VALIDATION_ERROR', "O campo 'description' não pode ser vazio");
  }

  if (params.date !== undefined) {
    const dateErr = validateISODate(params.date, 'date');
    if (dateErr) return errorResponse('VALIDATION_ERROR', dateErr);
  }

  if (params.status !== undefined) {
    const statusErr = validateEnum(params.status, ['paid', 'pending'], 'status');
    if (statusErr) return errorResponse('VALIDATION_ERROR', statusErr);
  }

  const supabase = createAuthenticatedClient(token);
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: params.type,
      description: (params.description as string).trim(),
      amount: params.amount,
      status: params.status ?? 'pending',
      payment_method: params.payment_method ?? null,
      category: params.category ?? null,
      date: params.date ?? new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    console.error(JSON.stringify({ action: 'transactions.create', error: error.message }));
    return errorResponse('INTERNAL_ERROR', 'Erro ao criar transação');
  }

  return successResponse(data);
}

export async function handleTransactionsUpdate(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['id']);
  if (err) return errorResponse('VALIDATION_ERROR', err);
  const uuidErr = validateUUID(params.id, 'id');
  if (uuidErr) return errorResponse('VALIDATION_ERROR', uuidErr);

  if (params.amount !== undefined) {
    const amountErr = validatePositiveNumber(params.amount, 'amount');
    if (amountErr) return errorResponse('VALIDATION_ERROR', amountErr);
  }

  if (params.status !== undefined) {
    const statusErr = validateEnum(params.status, ['paid', 'pending'], 'status');
    if (statusErr) return errorResponse('VALIDATION_ERROR', statusErr);
  }

  if (params.date !== undefined) {
    const dateErr = validateISODate(params.date, 'date');
    if (dateErr) return errorResponse('VALIDATION_ERROR', dateErr);
  }

  const supabase = createAuthenticatedClient(token);

  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', params.id as string)
    .maybeSingle();

  if (!existing) return errorResponse('NOT_FOUND', 'Transação não encontrada');

  const updates: Record<string, unknown> = {};
  if (params.description !== undefined) updates.description = (params.description as string).trim();
  if (params.amount !== undefined) updates.amount = params.amount;
  if (params.status !== undefined) updates.status = params.status;
  if (params.payment_method !== undefined) updates.payment_method = params.payment_method;
  if (params.category !== undefined) updates.category = params.category;
  if (params.date !== undefined) updates.date = params.date;

  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', params.id as string)
    .select()
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao atualizar transação');
  return successResponse(data);
}

export async function handleTransactionsDelete(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['id']);
  if (err) return errorResponse('VALIDATION_ERROR', err);
  const uuidErr = validateUUID(params.id, 'id');
  if (uuidErr) return errorResponse('VALIDATION_ERROR', uuidErr);

  const supabase = createAuthenticatedClient(token);

  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', params.id as string)
    .maybeSingle();

  if (!existing) return errorResponse('NOT_FOUND', 'Transação não encontrada');

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', params.id as string);

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao deletar transação');
  return successResponse({ deleted: true });
}

export async function handleTransactionsUpdateStatus(
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
    .from('transactions')
    .select('id')
    .eq('id', params.id as string)
    .maybeSingle();

  if (!existing) return errorResponse('NOT_FOUND', 'Transação não encontrada');

  const { data, error } = await supabase
    .from('transactions')
    .update({ status: params.status })
    .eq('id', params.id as string)
    .select()
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao atualizar status da transação');
  return successResponse(data);
}
