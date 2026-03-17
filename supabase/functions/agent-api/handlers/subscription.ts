import { createAuthenticatedClient } from '../utils/supabase.ts';
import { successResponse, errorResponse } from '../utils/response.ts';

export async function handleSubscriptionStatus(
  _params: Record<string, unknown>,
  userId: string,
  token: string
): Promise<Response> {
  const supabase = createAuthenticatedClient(token);
  const { data: subInfo, error } = await supabase.rpc('get_subscription_info', { _user_id: userId });

  if (error) return errorResponse('INTERNAL_ERROR', 'Erro ao buscar informações de assinatura');

  const now = new Date();
  const expiresAt = subInfo?.subscription_expires_at ? new Date(subInfo.subscription_expires_at) : null;
  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  let state: string;
  if (subInfo?.is_legacy) {
    state = 'active';
  } else if (subInfo?.subscription_status === 'active' && expiresAt && expiresAt > now) {
    state = daysRemaining <= 7 ? 'expired_critical' : 'active';
  } else if (subInfo?.subscription_status === 'pending') {
    state = 'pending';
  } else {
    state = 'expired';
  }

  return successResponse({
    status: subInfo?.subscription_status ?? null,
    expires_at: subInfo?.subscription_expires_at ?? null,
    days_remaining: daysRemaining,
    is_legacy: subInfo?.is_legacy ?? false,
    state,
  });
}
