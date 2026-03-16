import type { AgentResponse, ErrorCode } from '../types.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-idempotency-key, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const statusMap: Record<ErrorCode, number> = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  SUBSCRIPTION_REQUIRED: 402,
  BLOCKED: 403,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  DUPLICATE: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  INVALID_ACTION: 400,
};

export function successResponse(
  data: unknown,
  meta: { action?: string; count?: number } = {}
): Response {
  const body: AgentResponse = {
    success: true,
    data,
    meta: {
      action: meta.action ?? '',
      timestamp: new Date().toISOString(),
      ...(meta.count !== undefined ? { count: meta.count } : {}),
    },
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  action?: string
): Response {
  const body: AgentResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    meta: {
      action: action ?? '',
      timestamp: new Date().toISOString(),
    },
  };
  return new Response(JSON.stringify(body), {
    status: statusMap[code] ?? 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
