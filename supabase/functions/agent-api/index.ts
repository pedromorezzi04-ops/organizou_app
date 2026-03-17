import { corsHeaders, errorResponse } from './utils/response.ts';
import { authenticate } from './middleware/auth.ts';
import { checkSubscription } from './middleware/subscription.ts';
import { checkRateLimit } from './middleware/rate-limit.ts';
import { checkIdempotency } from './middleware/idempotency.ts';
import { route } from './router.ts';

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('INVALID_ACTION', 'Método não permitido. Use POST.');
  }

  // Parse body
  let body: { action?: unknown; params?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Body JSON inválido');
  }

  if (typeof body.action !== 'string' || body.action.trim() === '') {
    return errorResponse('VALIDATION_ERROR', "O campo 'action' é obrigatório e deve ser uma string");
  }

  const action = body.action.trim();
  const params =
    body.params !== null &&
    typeof body.params === 'object' &&
    !Array.isArray(body.params)
      ? (body.params as Record<string, unknown>)
      : {};

  // 1. Authenticate
  const authResult = await authenticate(req);
  if (authResult.response) return authResult.response;

  const { user, token } = authResult;

  // 2. Rate limiting
  if (!checkRateLimit(user.id)) {
    console.warn(
      JSON.stringify({
        action,
        user_id: user.id,
        timestamp: new Date().toISOString(),
        status: 'rate_limited',
      })
    );
    return errorResponse('RATE_LIMITED', 'Muitas requisições. Aguarde um momento.');
  }

  // 3. Idempotency
  const idempotencyResult = await checkIdempotency(req, token);
  if (idempotencyResult.response) return idempotencyResult.response;

  // 4. Subscription & blocking check
  const subResult = await checkSubscription(user.id, token, action);
  if (subResult.response) return subResult.response;

  // Structured log
  console.log(
    JSON.stringify({
      action,
      user_id: user.id,
      timestamp: new Date().toISOString(),
      status: 'processing',
    })
  );

  // 5. Route to handler
  try {
    const response = await route(action, params, user.id, token);
    return response;
  } catch (err) {
    console.error(
      JSON.stringify({
        action,
        user_id: user.id,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: String(err),
      })
    );
    return errorResponse('INTERNAL_ERROR', 'Erro interno no servidor');
  }
});
