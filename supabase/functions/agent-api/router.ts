import { errorResponse } from './utils/response.ts';

import {
  handleTransactionsList,
  handleTransactionsGet,
  handleTransactionsCreate,
  handleTransactionsUpdate,
  handleTransactionsDelete,
  handleTransactionsUpdateStatus,
} from './handlers/transactions.ts';

import {
  handleInstallmentsList,
  handleInstallmentsGet,
  handleInstallmentsCreate,
  handleInstallmentsUpdate,
  handleInstallmentsDelete,
  handleInstallmentsDeleteGroup,
  handleInstallmentsUpdateStatus,
} from './handlers/installments.ts';

import {
  handleRecurringList,
  handleRecurringGet,
  handleRecurringCreate,
  handleRecurringUpdate,
  handleRecurringDelete,
  handleRecurringToggle,
} from './handlers/recurring.ts';

import {
  handleTaxesConfigGet,
  handleTaxesConfigUpdate,
  handleTaxesCalculate,
  handleTaxesUpdateStatus,
  handleTaxesListPayments,
} from './handlers/taxes.ts';

import {
  handleDashboardSummary,
  handleDashboardWeeklyChart,
} from './handlers/dashboard.ts';

import {
  handleChartsMonthlyOverview,
  handleChartsByCategory,
  handleChartsEvolution,
} from './handlers/charts.ts';

import {
  handleProfileGet,
  handleProfileUpdate,
} from './handlers/profile.ts';

import {
  handleSubscriptionStatus,
} from './handlers/subscription.ts';

type HandlerFn = (
  params: Record<string, unknown>,
  userId: string,
  token: string
) => Promise<Response>;

const routeMap: Record<string, HandlerFn> = {
  // Transactions
  'transactions.list': handleTransactionsList,
  'transactions.get': handleTransactionsGet,
  'transactions.create': handleTransactionsCreate,
  'transactions.update': handleTransactionsUpdate,
  'transactions.delete': handleTransactionsDelete,
  'transactions.update_status': handleTransactionsUpdateStatus,

  // Installments
  'installments.list': handleInstallmentsList,
  'installments.get': handleInstallmentsGet,
  'installments.create': handleInstallmentsCreate,
  'installments.update': handleInstallmentsUpdate,
  'installments.delete': handleInstallmentsDelete,
  'installments.delete_group': handleInstallmentsDeleteGroup,
  'installments.update_status': handleInstallmentsUpdateStatus,

  // Recurring
  'recurring.list': handleRecurringList,
  'recurring.get': handleRecurringGet,
  'recurring.create': handleRecurringCreate,
  'recurring.update': handleRecurringUpdate,
  'recurring.delete': handleRecurringDelete,
  'recurring.toggle': handleRecurringToggle,

  // Taxes
  'taxes.config_get': handleTaxesConfigGet,
  'taxes.config_update': handleTaxesConfigUpdate,
  'taxes.calculate': handleTaxesCalculate,
  'taxes.update_status': handleTaxesUpdateStatus,
  'taxes.list_payments': handleTaxesListPayments,

  // Dashboard
  'dashboard.summary': handleDashboardSummary,
  'dashboard.weekly_chart': handleDashboardWeeklyChart,

  // Charts
  'charts.monthly_overview': handleChartsMonthlyOverview,
  'charts.by_category': handleChartsByCategory,
  'charts.evolution': handleChartsEvolution,

  // Profile
  'profile.get': handleProfileGet,
  'profile.update': handleProfileUpdate,

  // Subscription
  'subscription.status': handleSubscriptionStatus,
};

export function route(
  action: string,
  params: Record<string, unknown>,
  userId: string,
  token: string
): Promise<Response> {
  const handler = routeMap[action];
  if (!handler) {
    return Promise.resolve(
      errorResponse('INVALID_ACTION', `Ação '${action}' não reconhecida`)
    );
  }
  return handler(params, userId, token);
}
