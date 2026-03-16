export interface AgentRequest {
  action: string;
  params: Record<string, unknown>;
}

export interface AgentResponse {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    action: string;
    timestamp: string;
    count?: number;
  };
}

export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'SUBSCRIPTION_REQUIRED'
  | 'BLOCKED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'INVALID_ACTION';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  token: string;
  isAdmin: boolean;
  isLegacy: boolean;
  isSubscriptionActive: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  status: 'paid' | 'pending';
  payment_method: string | null;
  category: string | null;
  date: string;
  created_at: string;
}

export interface Installment {
  id: string;
  user_id: string;
  parent_note_id: string;
  client_name: string;
  description: string | null;
  amount: number;
  due_date: string;
  status: 'paid' | 'pending';
  installment_number: number;
  total_installments: number;
  created_at: string;
}

export interface RecurringExpense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  due_day: number;
  is_active: boolean;
  category: string | null;
  created_at: string;
}

export interface TaxPayment {
  id: string;
  user_id: string;
  month: number;
  year: number;
  amount: number;
  status: 'paid' | 'pending';
  created_at: string;
}

export interface Profile {
  id: string;
  business_name: string | null;
  primary_color: string | null;
  logo_url: string | null;
  tax_regime: string | null;
  tax_rate: number | null;
  mei_fixed_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInfo {
  subscription_status: string;
  subscription_expires_at: string | null;
  is_legacy: boolean;
}
