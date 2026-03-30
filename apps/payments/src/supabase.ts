import { optionalEnv } from "@ifyrt/service-core";

import type { PaymentWebhookAction } from "@ifyrt/contracts";

interface SubscriptionLookupRow {
  user_id: string;
  stripe_customer_id?: string | null;
  stripe_sub_id?: string | null;
}

interface UserLookupRow {
  telegram_id: number;
}

export interface PaymentContext {
  user_id?: string;
  telegram_id?: number;
  stripe_customer_id?: string;
  stripe_sub_id?: string;
}

const supabaseUrl = optionalEnv("SUPABASE_URL");
const supabaseServiceKey = optionalEnv("SUPABASE_SERVICE_KEY") ?? optionalEnv("SUPABASE_SERVICE_ROLE_KEY");

function supabaseHeaders(): Record<string, string> {
  return {
    apikey: supabaseServiceKey as string,
    authorization: `Bearer ${supabaseServiceKey as string}`,
    "content-type": "application/json"
  };
}

function queryValue(value: string): string {
  return encodeURIComponent(value);
}

async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase persistence is not configured.");
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      ...supabaseHeaders(),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed with status ${response.status}: ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function findSubscriptionByQuery(query: string): Promise<SubscriptionLookupRow | undefined> {
  const rows = await supabaseRequest<SubscriptionLookupRow[]>(
    `/rest/v1/subscriptions?select=user_id,stripe_customer_id,stripe_sub_id&${query}&limit=1`
  );
  return rows[0];
}

async function resolveTelegramId(userId: string): Promise<number | undefined> {
  const rows = await supabaseRequest<UserLookupRow[]>(
    `/rest/v1/users?select=telegram_id&id=eq.${queryValue(userId)}&limit=1`
  );
  return rows[0]?.telegram_id;
}

export function paymentsPersistenceReady(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

export async function resolvePaymentContext(initial: PaymentContext): Promise<PaymentContext> {
  const context: PaymentContext = { ...initial };

  if (!paymentsPersistenceReady()) {
    return context;
  }

  if (!context.user_id) {
    const subscription =
      (context.stripe_sub_id
        ? await findSubscriptionByQuery(`stripe_sub_id=eq.${queryValue(context.stripe_sub_id)}`)
        : undefined) ??
      (context.stripe_customer_id
        ? await findSubscriptionByQuery(`stripe_customer_id=eq.${queryValue(context.stripe_customer_id)}`)
        : undefined);

    if (subscription) {
      context.user_id = subscription.user_id;
      context.stripe_customer_id ??= subscription.stripe_customer_id ?? undefined;
      context.stripe_sub_id ??= subscription.stripe_sub_id ?? undefined;
    }
  }

  if (!context.telegram_id && context.user_id) {
    context.telegram_id = await resolveTelegramId(context.user_id);
  }

  return context;
}

export async function applyPaymentAction(action: PaymentWebhookAction, context: PaymentContext): Promise<void> {
  if (!paymentsPersistenceReady() || !context.user_id) {
    return;
  }

  const patch: Record<string, unknown> = {};

  switch (action.action) {
    case "subscription.activated":
      patch.tier = "paid";
      patch.trial_start = action.trial_start;
      patch.trial_end = action.trial_end;
      patch.stripe_customer_id = context.stripe_customer_id ?? action.stripe_customer_id ?? null;
      patch.stripe_sub_id = context.stripe_sub_id ?? action.stripe_sub_id ?? null;
      break;
    case "subscription.updated":
    case "payment.succeeded":
      patch.tier = "paid";
      patch.paid_until = action.paid_until ?? null;
      patch.stripe_customer_id = context.stripe_customer_id ?? action.stripe_customer_id ?? null;
      patch.stripe_sub_id = context.stripe_sub_id ?? action.stripe_sub_id ?? null;
      break;
    case "subscription.canceled":
      patch.tier = "free";
      patch.paid_until = null;
      break;
    case "payment.failed":
    case "ignored":
      break;
  }

  if (Object.keys(patch).length > 0) {
    await supabaseRequest(
      `/rest/v1/subscriptions?user_id=eq.${queryValue(context.user_id)}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=minimal"
        },
        body: JSON.stringify(patch)
      }
    );
  }

  await supabaseRequest("/rest/v1/audit_logs", {
    method: "POST",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      user_id: context.user_id,
      event_type: action.audit_event_type,
      actor: "stripe-webhook",
      metadata: {
        raw_event_type: action.raw_event_type,
        stripe_customer_id: context.stripe_customer_id ?? action.stripe_customer_id ?? null,
        stripe_sub_id: context.stripe_sub_id ?? action.stripe_sub_id ?? null,
        action: action.action,
        ...action.metadata
      }
    })
  });
}
