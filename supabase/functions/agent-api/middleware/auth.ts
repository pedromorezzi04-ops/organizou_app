import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { errorResponse } from '../utils/response.ts';

export interface AuthResult {
  user: { id: string; email?: string };
  token: string;
  response?: Response;
}

export async function authenticate(req: Request, bodyToken?: string): Promise<AuthResult> {
  // Log all incoming headers for debugging
  console.log(JSON.stringify({
    middleware: 'auth',
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString(),
  }));

  // Token resolution order:
  // 1. Authorization header (standard)
  // 2. x-auth-token header (custom fallback)
  // 3. auth_token from body (when gateway strips Authorization)
  const authHeader =
    req.headers.get('authorization') ??
    req.headers.get('Authorization') ??
    req.headers.get('x-auth-token');

  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (authHeader) {
    token = authHeader; // x-auth-token sem prefixo Bearer
  } else if (bodyToken) {
    token = bodyToken;
  }

  if (!token) {
    console.warn(JSON.stringify({
      middleware: 'auth',
      status: 'missing_token',
      timestamp: new Date().toISOString(),
    }));
    return {
      user: { id: '' },
      token: '',
      response: errorResponse('AUTH_REQUIRED', 'Token de autenticação ausente'),
    };
  }

  // Clean client — no user headers injected — standard Supabase pattern for JWT validation
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.warn(JSON.stringify({
      middleware: 'auth',
      status: 'invalid_token',
      error: error?.message ?? 'no user returned',
      timestamp: new Date().toISOString(),
    }));
    return {
      user: { id: '' },
      token: '',
      response: errorResponse('AUTH_REQUIRED', 'Token inválido ou expirado'),
    };
  }

  return { user: { id: user.id, email: user.email ?? undefined }, token };
}
