import { createAuthenticatedClient } from '../utils/supabase.ts';
import { errorResponse } from '../utils/response.ts';

export interface AuthResult {
  user: { id: string; email?: string };
  token: string;
  response?: Response;
}

export async function authenticate(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      user: { id: '' },
      token: '',
      response: errorResponse('AUTH_REQUIRED', 'Token de autenticação ausente'),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createAuthenticatedClient(token);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      user: { id: '' },
      token: '',
      response: errorResponse('AUTH_REQUIRED', 'Token inválido ou expirado'),
    };
  }

  return { user: { id: user.id, email: user.email ?? undefined }, token };
}
