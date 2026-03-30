import Stripe from "stripe";

import type { PaymentWebhookAction } from "@ifyrt/contracts";

interface StripeMetadataCarrier {
  metadata?: Record<string, string> | null;
}

interface StripeSubscriptionLike extends StripeMetadataCarrier {
  id: string;
  customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null;
  current_period_end?: number;
}

interface StripeInvoiceLike extends StripeMetadataCarrier {
  customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null;
  subscription?: string | Stripe.Subscription | null;
  lines?: {
    data?: Array<{
      period?: {
        end?: number;
      };
    }>;
  };
  subscription_details?: {
    metadata?: Record<string, string> | null;
  } | null;
}

function addDays(now: Date, days: number): Date {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoOrUndefined(value: number | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value * 1000).toISOString();
}

function metadataValue(metadata: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = metadata[key];
    if (value) {
      return value;
    }
  }

  return undefined;
}

function parseTelegramId(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function mergeMetadata(...sources: Array<Record<string, string> | null | undefined>): Record<string, string> {
  return Object.assign({}, ...sources.filter((source): source is Record<string, string> => Boolean(source)));
}

function stripeCustomerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string | undefined {
  return typeof value === "string" ? value : value?.id;
}

function stripeSubscriptionId(value: string | Stripe.Subscription | null | undefined): string | undefined {
  return typeof value === "string" ? value : value?.id;
}

export function normalizeStripeEvent(event: Stripe.Event, now = new Date()): PaymentWebhookAction {
  const auditEventType = `stripe.${event.type}`;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = mergeMetadata(session.metadata);
      return {
        action: "subscription.activated",
        raw_event_type: event.type,
        audit_event_type: auditEventType,
        user_id: metadataValue(metadata, "user_id", "ifyrt_user_id"),
        telegram_id: parseTelegramId(metadataValue(metadata, "telegram_id")),
        tier: "paid",
        trial_start: now.toISOString(),
        trial_end: addDays(now, 7).toISOString(),
        stripe_customer_id: stripeCustomerId(session.customer),
        stripe_sub_id: typeof session.subscription === "string" ? session.subscription : undefined,
        notify_message:
          "Payment received. Your Ifyrt subscription is being activated now.\n\nUse /strategies to get started or /help to see all commands.",
        metadata
      };
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as StripeSubscriptionLike;
      const metadata = mergeMetadata(subscription.metadata);
      return {
        action: "subscription.updated",
        raw_event_type: event.type,
        audit_event_type: auditEventType,
        user_id: metadataValue(metadata, "user_id", "ifyrt_user_id"),
        telegram_id: parseTelegramId(metadataValue(metadata, "telegram_id")),
        tier: "paid",
        paid_until: toIsoOrUndefined(subscription.current_period_end),
        stripe_customer_id: stripeCustomerId(subscription.customer),
        stripe_sub_id: subscription.id,
        metadata
      };
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as StripeSubscriptionLike;
      const metadata = mergeMetadata(subscription.metadata);
      return {
        action: "subscription.canceled",
        raw_event_type: event.type,
        audit_event_type: auditEventType,
        user_id: metadataValue(metadata, "user_id", "ifyrt_user_id"),
        telegram_id: parseTelegramId(metadataValue(metadata, "telegram_id")),
        tier: "free",
        paid_until: null,
        stripe_customer_id: stripeCustomerId(subscription.customer),
        stripe_sub_id: subscription.id,
        notify_message:
          "Your Ifyrt subscription has ended.\n\nBacktesting remains free. Use /subscribe to reactivate full access.",
        metadata
      };
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as StripeInvoiceLike;
      const metadata = mergeMetadata(invoice.subscription_details?.metadata, invoice.metadata);
      return {
        action: "payment.failed",
        raw_event_type: event.type,
        audit_event_type: auditEventType,
        user_id: metadataValue(metadata, "user_id", "ifyrt_user_id"),
        telegram_id: parseTelegramId(metadataValue(metadata, "telegram_id")),
        stripe_customer_id: stripeCustomerId(invoice.customer),
        stripe_sub_id: stripeSubscriptionId(invoice.subscription),
        notify_message:
          "Payment failed for your Ifyrt subscription.\n\nUpdate your payment method to keep access.",
        metadata
      };
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as StripeInvoiceLike;
      const metadata = mergeMetadata(invoice.subscription_details?.metadata, invoice.metadata);
      return {
        action: "payment.succeeded",
        raw_event_type: event.type,
        audit_event_type: auditEventType,
        user_id: metadataValue(metadata, "user_id", "ifyrt_user_id"),
        telegram_id: parseTelegramId(metadataValue(metadata, "telegram_id")),
        tier: "paid",
        paid_until: toIsoOrUndefined(invoice.lines?.data?.[0]?.period?.end),
        stripe_customer_id: stripeCustomerId(invoice.customer),
        stripe_sub_id: stripeSubscriptionId(invoice.subscription),
        metadata
      };
    }
    default:
      return {
        action: "ignored",
        raw_event_type: event.type,
        audit_event_type: auditEventType,
        metadata: {
          event_id: event.id
        }
      };
  }
}
