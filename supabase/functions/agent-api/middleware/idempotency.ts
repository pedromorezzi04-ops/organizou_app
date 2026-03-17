import { createAuthenticatedClient } from '../utils/supabase.ts';
import { errorResponse } from '../utils/response.ts';

export interface IdempotencyResult {
  isDuplicate: boolean;
  response?: Response;
}

export async function checkIdempotency(
  req: Request,
  token: string
): Promise<IdempotencyResult> {
  const idempotencyKey = req.headers.get('x-idempotency-key');
  if (!idempotencyKey) {
    return { isDuplicate: false };
  }

  const supabase = createAuthenticatedClient(token);
  const { data: existing } = await supabase
    .from('webhook_logs')
    .select('id')
    .eq('transaction_id', idempotencyKey)
    .eq('status', 'success')
    .maybeSingle();

  if (existing) {
    return {
      isDuplicate: true,
      response: errorResponse('DUPLICATE', 'Esta operação já foi processada'),
    };
  }

  return { isDuplicate: false };
}
