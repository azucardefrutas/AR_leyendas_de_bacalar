import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

export function getAdminClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

export function logAdminServiceError({
  functionName = 'adminService',
  step = 'unknown',
  operation = 'unknown',
  table = 'unknown',
  error,
}) {
  if (import.meta.env.DEV) {
    console.error('[AdminService] Error real:', {
      functionName,
      step,
      operation,
      table,
      error,
    });
  }
}

export function friendlyAdminError(error, context = {}) {
  if (!error) return null;
  logAdminServiceError({ ...context, error });
  const adminError = new Error('No pudimos cargar la informacion administrativa. Revisa consola para el detalle tecnico.');
  adminError.supabaseError = error;
  return adminError;
}

async function countRows(client, table, queryBuilder = null, operation = 'count rows') {
  try {
    let query = client.from(table).select('id', { count: 'exact', head: true });
    if (queryBuilder) query = queryBuilder(query);
    const { count, error } = await query;
    if (error) return { count: 0, error, operation, table };
    return { count: count ?? 0, error: null, operation, table };
  } catch (error) {
    return { count: 0, error, operation, table };
  }
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = next.getDate() - day + (day === 0 ? -6 : 1);
  next.setDate(diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function buildWeeklySeries(rows = [], dateField = 'created_at', weeks = 8) {
  const today = new Date();
  const labels = Array.from({ length: weeks }, (_, index) => {
    const date = startOfWeek(today);
    date.setDate(date.getDate() - ((weeks - 1 - index) * 7));
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      value: 0,
    };
  });
  const byKey = new Map(labels.map((item) => [item.key, item]));

  rows.forEach((row) => {
    if (!row?.[dateField]) return;
    const key = startOfWeek(new Date(row[dateField])).toISOString().slice(0, 10);
    const bucket = byKey.get(key);
    if (bucket) bucket.value += 1;
  });

  return labels;
}

function getNumericValue(row, keys = []) {
  const value = keys.map((key) => row?.[key]).find((item) => item !== undefined && item !== null);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function getAdminDashboardStats() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };

  const metricQueries = [
    { key: 'users', table: 'users_profile' },
    { key: 'authors', table: 'creator_profiles' },
    { key: 'pendingApplications', table: 'creator_applications', queryBuilder: (query) => query.eq('status', 'pending') },
    { key: 'publishedLegends', table: 'legends', queryBuilder: (query) => query.eq('status', 'published') },
    { key: 'reviewLegends', table: 'content_reviews', queryBuilder: (query) => query.in('status', ['pending', 'in_review']) },
    { key: 'codeBatches', table: 'code_batches' },
    { key: 'redeemedCodes', table: 'access_codes', queryBuilder: (query) => query.eq('status', 'redeemed') },
    { key: 'generatedCodes', table: 'access_codes' },
    { key: 'simulatedOrders', table: 'orders' },
    { key: 'activeSubscriptions', table: 'subscriptions', queryBuilder: (query) => query.eq('status', 'active') },
  ];

  const metricResults = await Promise.all(
    metricQueries.map((metric) => countRows(client, metric.table, metric.queryBuilder, `count ${metric.key}`)),
  );

  const warnings = metricResults
    .map((result, index) => ({ ...result, key: metricQueries[index].key }))
    .filter((result) => result.error);

  warnings.forEach((warning) => {
    logAdminServiceError({
      functionName: 'getAdminDashboardStats',
      step: warning.operation,
      operation: warning.operation,
      table: warning.table,
      error: warning.error,
    });
  });

  const metrics = Object.fromEntries(
    metricQueries.map((metric, index) => [metric.key, metricResults[index].count]),
  );
  const allMetricsFailed = metricResults.length > 0 && metricResults.every((result) => result.error);

  return {
    data: {
      users: metrics.users,
      authors: metrics.authors,
      pendingApplications: metrics.pendingApplications,
      publishedLegends: metrics.publishedLegends,
      reviewLegends: metrics.reviewLegends,
      codeBatches: metrics.codeBatches,
      redeemedCodes: metrics.redeemedCodes,
      generatedCodes: metrics.generatedCodes,
      simulatedOrders: metrics.simulatedOrders,
      activeSubscriptions: metrics.activeSubscriptions,
    },
    error: allMetricsFailed
      ? friendlyAdminError(warnings[0]?.error, {
        functionName: 'getAdminDashboardStats',
        step: 'all dashboard metric counts failed',
        table: 'dashboard metrics',
      })
      : null,
    warnings,
  };
}

export async function getRecentAdminActivity(limit = 8) {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  try {
    const { data, error } = await client
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return {
      data: data ?? [],
      error: error ? friendlyAdminError(error, {
        functionName: 'getRecentAdminActivity',
        step: 'select recent admin activity',
        table: 'admin_audit_logs',
      }) : null,
    };
  } catch (error) {
    return {
      data: [],
      error: friendlyAdminError(error, {
        functionName: 'getRecentAdminActivity',
        step: 'select recent admin activity',
        table: 'admin_audit_logs',
      }),
    };
  }
}

export async function getCodeUsageStats() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: { generated: 0, redeemed: 0, available: 0, weekly: [] }, error: clientError };

  try {
    const { data, error } = await client
      .from('access_codes')
      .select('id, status, created_at, redeemed_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      return {
        data: { generated: 0, redeemed: 0, available: 0, weekly: [] },
        error: friendlyAdminError(error, {
          functionName: 'getCodeUsageStats',
          step: 'select access code usage',
          table: 'access_codes',
        }),
      };
    }

    const rows = data ?? [];
    const redeemedRows = rows.filter((row) => row.status === 'redeemed' || row.redeemed_at);

    return {
      data: {
        generated: rows.length,
        redeemed: redeemedRows.length,
        available: rows.filter((row) => row.status !== 'redeemed').length,
        weekly: buildWeeklySeries(redeemedRows, 'redeemed_at'),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: { generated: 0, redeemed: 0, available: 0, weekly: [] },
      error: friendlyAdminError(error, {
        functionName: 'getCodeUsageStats',
        step: 'select access code usage',
        table: 'access_codes',
      }),
    };
  }
}

export async function getSimulatedSalesSummary() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: { orders: 0, payments: 0, monthlyOrders: 0, total: 0 }, error: clientError };

  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [ordersResult, paymentsResult] = await Promise.all([
      client.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
      client.from('payments').select('*').order('created_at', { ascending: false }).limit(500),
    ]);

    const firstError = ordersResult.error || paymentsResult.error;
    if (firstError) {
      return {
        data: { orders: 0, payments: 0, monthlyOrders: 0, total: 0 },
        error: friendlyAdminError(firstError, {
          functionName: 'getSimulatedSalesSummary',
          step: ordersResult.error ? 'select orders' : 'select payments',
          table: ordersResult.error ? 'orders' : 'payments',
        }),
      };
    }

    const orders = ordersResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const monthlyOrders = orders.filter((order) => order.created_at && new Date(order.created_at) >= currentMonth).length;
    const total = payments.reduce((sum, payment) => sum + getNumericValue(payment, ['amount', 'total', 'amount_total', 'payment_amount']), 0);

    return {
      data: {
        orders: orders.length,
        payments: payments.length,
        monthlyOrders,
        total,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: { orders: 0, payments: 0, monthlyOrders: 0, total: 0 },
      error: friendlyAdminError(error, {
        functionName: 'getSimulatedSalesSummary',
        step: 'select orders and payments',
        table: 'orders/payments',
      }),
    };
  }
}

export async function getSubscriptionSummary() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: { plans: 0, activePlans: 0, subscriptions: 0, activeSubscriptions: 0 }, error: clientError };

  try {
    const [plansResult, subscriptionsResult] = await Promise.all([
      client.from('subscription_plans').select('*').limit(200),
      client.from('subscriptions').select('*').limit(500),
    ]);

    const firstError = plansResult.error || subscriptionsResult.error;
    if (firstError) {
      return {
        data: { plans: 0, activePlans: 0, subscriptions: 0, activeSubscriptions: 0 },
        error: friendlyAdminError(firstError, {
          functionName: 'getSubscriptionSummary',
          step: plansResult.error ? 'select subscription plans' : 'select subscriptions',
          table: plansResult.error ? 'subscription_plans' : 'subscriptions',
        }),
      };
    }

    const plans = plansResult.data ?? [];
    const subscriptions = subscriptionsResult.data ?? [];

    return {
      data: {
        plans: plans.length,
        activePlans: plans.filter((plan) => plan.is_active !== false && plan.status !== 'disabled').length,
        subscriptions: subscriptions.length,
        activeSubscriptions: subscriptions.filter((subscription) => subscription.status === 'active').length,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: { plans: 0, activePlans: 0, subscriptions: 0, activeSubscriptions: 0 },
      error: friendlyAdminError(error, {
        functionName: 'getSubscriptionSummary',
        step: 'select subscriptions summary',
        table: 'subscription_plans/subscriptions',
      }),
    };
  }
}
