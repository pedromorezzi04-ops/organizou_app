import { createAuthenticatedClient } from '../utils/supabase.ts';
import { successResponse, errorResponse } from '../utils/response.ts';
import {
  validateRequired,
  validatePositiveNumber,
  validateEnum,
  validateISODate,
  validateUUID,
  validateIntegerRange,
} from '../utils/validation.ts';

export async function handleInstallmentsList(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const supabase = createAuthenticatedClient(token);
  let query = supabase.from('installments').select('*', { count: 'exact' });

  if (params.client_name !== undefined) {
    query = query.ilike('client_name', `%${params.client_name}%`);
  }

  if (params.status !== undefined) {
    const err = validateEnum(params.status, ['paid', 'pending'], 'status');
    if (err) return errorResponse('VALIDATION_ERROR', err);
    query = query.eq('status', params.status as string);
  }

  if (params.parent_note_id !== undefined) {
    const err = validateUUID(params.parent_note_id, 'parent_note_id');
    if (err) return errorResponse('VALIDATION_ERROR', err);
    query = query.eq('parent_note_id', params.parent_note_id as string);
  }

  if (params.due_date_from !== undefined) {
    const err = validateISODate(params.due_date_from, 'due_date_from');
    if (err) return errorResponse('VALIDATION_ERROR', err);
    query = query.gte('due_date', params.due_date_from as string);
  }

  if (params.due_date_to !== undefined) {
    const err = validateISODate(params.due_date_to, 'due_date_to');
    if (err) return errorResponse('VALIDATION_ERROR', err);
    query = query.lte('due_date', params.due_date_to as string);
  }

  if (params.month !== undefined && params.year !== undefined) {
    const month = Number(params.month);
    const year = Number(params.year);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('due_date', start).lte('due_date', end);
  }

  const validOrderBy = ['due_date', 'client_name', 'amount'];
  const orderBy = (params.order_by as string) || 'due_date';
  const orderDir = (params.order_dir as string) || 'asc';

  if (!validOrderBy.includes(orderBy)) {
    return errorResponse('VALIDATION_ERROR', `order_by deve ser um de: ${validOrderBy.join(', ')}`);
  }

  query = query.order(orderBy, { ascending: orderDir === 'asc' });

  const limit = Math.min(Number(params.limit) || 50, 200);
  const offset = Number(params.offset) || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao buscar parcelas');
  return successResponse(data, { count: count ?? 0 });
}

export async function handleInstallmentsGet(
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
    .from('installments')
    .select('*')
    .eq('id', params.id as string)
    .maybeSingle();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao buscar parcela');
  if (!data) return errorResponse('NOT_FOUND', 'Parcela não encontrada');
  return successResponse(data);
}

export async function handleInstallmentsCreate(
  params: Record<string, unknown>,
  userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['client_name', 'total_amount', 'num_installments', 'first_due_date']);
  if (err) return errorResponse('VALIDATION_ERROR', err);

  const amountErr = validatePositiveNumber(params.total_amount, 'total_amount');
  if (amountErr) return errorResponse('VALIDATION_ERROR', amountErr);

  const numErr = validateIntegerRange(params.num_installments, 1, 48, 'num_installments');
  if (numErr) return errorResponse('VALIDATION_ERROR', numErr);

  const dateErr = validateISODate(params.first_due_date, 'first_due_date');
  if (dateErr) return errorResponse('VALIDATION_ERROR', dateErr);

  if (params.status !== undefined) {
    const statusErr = validateEnum(params.status, ['paid', 'pending'], 'status');
    if (statusErr) return errorResponse('VALIDATION_ERROR', statusErr);
  }

  const totalAmount = params.total_amount as number;
  const numInstallments = params.num_installments as number;
  const baseAmount = Math.round((totalAmount / numInstallments) * 100) / 100;
  const parentNoteId = crypto.randomUUID();

  // Parse as UTC to avoid timezone shifting the day
  const firstDueDate = new Date((params.first_due_date as string) + 'T12:00:00Z');

  const installmentsToCreate = [];
  let sumSoFar = 0;

  for (let i = 0; i < numInstallments; i++) {
    const isLast = i === numInstallments - 1;
    const amount = isLast
      ? Math.round((totalAmount - sumSoFar) * 100) / 100
      : baseAmount;
    sumSoFar += amount;

    const dueDate = new Date(firstDueDate);
    dueDate.setUTCMonth(dueDate.getUTCMonth() + i);

    installmentsToCreate.push({
      user_id: userId,
      parent_note_id: parentNoteId,
      client_name: (params.client_name as string).trim(),
      description: params.description ? (params.description as string).trim() : null,
      amount,
      due_date: dueDate.toISOString().split('T')[0],
      status: params.status ?? 'pending',
      installment_number: i + 1,
      total_installments: numInstallments,
    });
  }

  const supabase = createAuthenticatedClient(token);
  const { data, error } = await supabase
    .from('installments')
    .insert(installmentsToCreate)
    .select();

  if (error) {
    console.error(JSON.stringify({ action: 'installments.create', error: error.message }));
    return errorResponse('INTERNAL_ERROR', 'Erro ao criar parcelas');
  }

  return successResponse({ installments: data, parent_note_id: parentNoteId }, { count: data.length });
}

export async function handleInstallmentsUpdate(
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

  if (params.due_date !== undefined) {
    const dateErr = validateISODate(params.due_date, 'due_date');
    if (dateErr) return errorResponse('VALIDATION_ERROR', dateErr);
  }

  if (params.status !== undefined) {
    const statusErr = validateEnum(params.status, ['paid', 'pending'], 'status');
    if (statusErr) return errorResponse('VALIDATION_ERROR', statusErr);
  }

  const supabase = createAuthenticatedClient(token);

  const { data: existing } = await supabase
    .from('installments')
    .select('id')
    .eq('id', params.id as string)
    .maybeSingle();

  if (!existing) return errorResponse('NOT_FOUND', 'Parcela não encontrada');

  const updates: Record<string, unknown> = {};
  if (params.client_name !== undefined) updates.client_name = (params.client_name as string).trim();
  if (params.description !== undefined) updates.description = params.description;
  if (params.amount !== undefined) updates.amount = params.amount;
  if (params.due_date !== undefined) updates.due_date = params.due_date;
  if (params.status !== undefined) updates.status = params.status;

  const { data, error } = await supabase
    .from('installments')
    .update(updates)
    .eq('id', params.id as string)
    .select()
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao atualizar parcela');
  return successResponse(data);
}

export async function handleInstallmentsDelete(
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
    .from('installments')
    .select('id')
    .eq('id', params.id as string)
    .maybeSingle();

  if (!existing) return errorResponse('NOT_FOUND', 'Parcela não encontrada');

  const { error } = await supabase
    .from('installments')
    .delete()
    .eq('id', params.id as string);

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao deletar parcela');
  return successResponse({ deleted: true });
}

export async function handleInstallmentsDeleteGroup(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const err = validateRequired(params, ['parent_note_id']);
  if (err) return errorResponse('VALIDATION_ERROR', err);
  const uuidErr = validateUUID(params.parent_note_id, 'parent_note_id');
  if (uuidErr) return errorResponse('VALIDATION_ERROR', uuidErr);

  const supabase = createAuthenticatedClient(token);
  const { error } = await supabase
    .from('installments')
    .delete()
    .eq('parent_note_id', params.parent_note_id as string);

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao deletar grupo de parcelas');
  return successResponse({ deleted: true });
}

export async function handleInstallmentsUpdateStatus(
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
    .from('installments')
    .select('id')
    .eq('id', params.id as string)
    .maybeSingle();

  if (!existing) return errorResponse('NOT_FOUND', 'Parcela não encontrada');

  const { data, error } = await supabase
    .from('installments')
    .update({ status: params.status })
    .eq('id', params.id as string)
    .select()
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao atualizar status da parcela');
  return successResponse(data);
}
