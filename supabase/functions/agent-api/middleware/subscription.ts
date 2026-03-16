import { createAuthenticatedClient } from '../utils/supabase.ts';
import { errorResponse } from '../utils/response.ts';

const SUBSCRIPTION_FREE_ACTIONS = ['subscription.status', 'profile.get'];

export interface SubscriptionCheckResult {
  blocked: boolean;
  response?: Response;
  isAdmin: boolean;
  isLegacy: boolean;
}

export async function checkSubscription(
  userId: string,
  token: string,
  action: string
): Promise<SubscriptionCheckResult> {
  const supabase = createAuthenticatedClient(token);

  const { data: blocked } = await supabase.rpc('is_user_blocked', { _user_id: userId });
  if (blocked) {
    return {
      blocked: true,
      response: errorResponse('BLOCKED', 'Sua conta está bloqueada. Entre em contato com o suporte.'),
      isAdmin: false,
      isLegacy: false,
    };
  }

  const [{ data: isAdmin }, { data: subInfo }] = await Promise.all([
    supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
    supabase.rpc('get_subscription_info', { _user_id: userId }),
  ]);

  const isLegacy = subInfo?.is_legacy === true;
  const isActive =
    subInfo?.subscription_status === 'active' &&
    subInfo?.subscription_expires_at != null &&
    new Date(subInfo.subscription_expires_at) > new Date();

  if (!isAdmin && !isLegacy && !isActive) {
    if (!SUBSCRIPTION_FREE_ACTIONS.includes(action)) {
      return {
        blocked: true,
        response: errorResponse(
          'SUBSCRIPTION_REQUIRED',
          'Assinatura inativa. Renove para continuar.'
        ),
        isAdmin: !!isAdmin,
        isLegacy,
      };
    }
  }

  return { blocked: false, isAdmin: !!isAdmin, isLegacy };
}
