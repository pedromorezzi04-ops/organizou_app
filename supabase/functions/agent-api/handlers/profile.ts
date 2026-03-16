import { createAuthenticatedClient } from '../utils/supabase.ts';
import { successResponse, errorResponse } from '../utils/response.ts';
import { validateHexColor } from '../utils/validation.ts';

export async function handleProfileGet(
  _params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  const supabase = createAuthenticatedClient(token);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, business_name, primary_color, logo_url, tax_regime, tax_rate, mei_fixed_value, created_at, updated_at')
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao buscar perfil');
  return successResponse(data);
}

export async function handleProfileUpdate(
  params: Record<string, unknown>,
  _userId: string,
  token: string
): Promise<Response> {
  if (params.primary_color !== undefined) {
    const colorErr = validateHexColor(params.primary_color, 'primary_color');
    if (colorErr) return errorResponse('VALIDATION_ERROR', colorErr);
  }

  const updates: Record<string, unknown> = {};
  if (params.business_name !== undefined) {
    updates.business_name = (params.business_name as string).trim();
  }
  if (params.primary_color !== undefined) {
    updates.primary_color = params.primary_color;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse('VALIDATION_ERROR', 'Nenhum campo para atualizar fornecido');
  }

  const supabase = createAuthenticatedClient(token);
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .select('id, business_name, primary_color, logo_url, tax_regime, tax_rate, mei_fixed_value, created_at, updated_at')
    .single();

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao atualizar perfil');
  return successResponse(data);
}
