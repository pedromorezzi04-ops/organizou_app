import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { errorResponse } from '../utils/response.ts';

export interface AuthResult {
  user: { id: string; email?: string };
  token: string;
  response?: Response;
}

export async function authenticate(req: Request): Promise<AuthResult> {
  // HTTP/2 proxies (n8n, nginx) may lowercase headers — check both
  const authHeader =
    req.headers.get('authorization') ??
    req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    console.warn(JSON.stringify({
      middleware: 'auth',
      status: 'missing_token',
      header_present: !!authHeader,
      timestamp: new Date().toISOString(),
    }));
    return {
      user: { id: '' },
      token: '',
      response: errorResponse('AUTH_REQUIRED', 'Token de autenticação ausente'),
    };
  }

  const token = authHeader.slice(7);

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
