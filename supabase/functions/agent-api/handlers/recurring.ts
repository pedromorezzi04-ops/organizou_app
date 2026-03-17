import { createAuthenticatedClient } from '../utils/supabase.ts';
import { successResponse, errorResponse } from '../utils/response.ts';
import {
  validateRequired,
  validatePositiveNumber,
  validateUUID,
  validateIntegerRange,
} from '../utils/validation.ts';

export async function handleRecurringList(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const supabase = createAuthenticatedClient(token);
  let query = supabase.from('recurring_expenses').select('*', { count: 'exact' });

  if (params.is_active !== undefined) {
    query = query.eq('is_active', params.is_active as boolean);
  }

  if (params.category !== undefined) {
    query = query.eq('category', params.category as string);
  }

  const validOrderBy = ['description', 'amount', 'due_day'];
  const orderBy = (params.order_by as string) || 'description';
  const orderDir = (params.order_dir as string) || 'asc';

  if (!validOrderBy.includes(orderBy)) {
    return errorResponse('VALIDATION_ERROR', `order_by deve ser um de: ${validOrderBy.join(', ')}`);
  }

  query = query.order(orderBy, { ascending: orderDir === 'asc' });

  const { data, error, count } = await query;
  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao buscar despesas recorrentes');
  return successResponse(data, { count: count ?? 0 });
}

export async function handleRecurringGet(
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
    .from('recurring_expenses')
    .select('*')
    .eq('id', params.id as string)
    .maybeSingle();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao buscar despesa recorrente');
  if (!data) return errorResponse('NOT_FOUND', 'Despesa recorrente não encontrada');
  return successResponse(data);
}

export async function handleRecurringCreate(
  params: Record<string, unknown>,
  userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['description', 'amount', 'due_day']);
  if (err) return errorResponse('VALIDATION_ERROR', err);

  const amountErr = validatePositiveNumber(params.amount, 'amount');
  if (amountErr) return errorResponse('VALIDATION_ERROR', amountErr);

  const dueDayErr = validateIntegerRange(params.due_day, 1, 31, 'due_day');
  if (dueDayErr) return errorResponse('VALIDATION_ERROR', dueDayErr);

  if (typeof params.description !== 'string' || params.description.trim() === '') {
    return errorResponse('VALIDATION_ERROR', "O campo 'description' não pode ser vazio");
  }

  const supabase = createAuthenticatedClient(token);
  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({
      user_id: userId,
      description: (params.description as string).trim(),
      amount: params.amount,
      due_day: params.due_day,
      category: params.category ?? null,
      is_active: params.is_active !== undefined ? params.is_active : true,
    })
    .select()
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao criar despesa recorrente');
  return successResponse(data);
}

export async function handleRecurringUpdate(
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

  if (params.due_day !== undefined) {
    const dueDayErr = validateIntegerRange(params.due_day, 1, 31, 'due_day');
    if (dueDayErr) return errorResponse('VALIDATION_ERROR', dueDayErr);
  }

  const supabase = createAuthenticatedClient(token);

  const { data: existing } = await supabase
    .from('recurring_expenses')
    .select('id')
    .eq('id', params.id as string)
    .maybeSingle();

  if (!existing) return errorResponse('NOT_FOUND', 'Despesa recorrente não encontrada');

  const updates: Record<string, unknown> = {};
  if (params.description !== undefined) updates.description = (params.description as string).trim();
  if (params.amount !== undefined) updates.amount = params.amount;
  if (params.due_day !== undefined) updates.due_day = params.due_day;
  if (params.category !== undefined) updates.category = params.category;
  if (params.is_active !== undefined) updates.is_active = params.is_active;

  const { data, error } = await supabase
    .from('recurring_expenses')
    .update(updates)
    .eq('id', params.id as string)
    .select()
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao atualizar despesa recorrente');
  return successResponse(data);
}

export async function handleRecurringDelete(
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
    .from('recurring_expenses')
    .select('id')
    .eq('id', params.id as string)
    .maybeSingle();

  if (!existing) return errorResponse('NOT_FOUND', 'Despesa recorrente não encontrada');

  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', params.id as string);

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao deletar despesa recorrente');
  return successResponse({ deleted: true });
}

export async function handleRecurringToggle(
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
    .from('recurring_expenses')
    .select('*')
    .eq('id', params.id as string)
    .maybeSingle();

  if (!existing) return errorResponse('NOT_FOUND', 'Despesa recorrente não encontrada');

  const { data, error } = await supabase
    .from('recurring_expenses')
    .update({ is_active: !existing.is_active })
    .eq('id', params.id as string)
    .select()
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao alternar status da despesa recorrente');
  return successResponse(data);
}
