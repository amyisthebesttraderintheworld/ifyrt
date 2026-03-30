import express from "express";
import Stripe from "stripe";

import {
  billingPortalSessionRequestSchema,
  checkoutSessionRequestSchema
} from "@ifyrt/contracts";
import {
  intEnv,
  logError,
  logInfo,
  optionalEnv,
  requestSignatureIsValid,
  validationError
} from "@ifyrt/service-core";

import { renderLandingPage, renderPrivacyPage, renderTermsPage } from "./landing";
import { normalizeStripeEvent } from "./stripe";
import { applyPaymentAction, paymentsPersistenceReady, resolvePaymentContext } from "./supabase";

const serviceName = "ifyrt-payments";
const stripeSecretKey = optionalEnv("STRIPE_SECRET_KEY");
const stripeWebhookSecret = optionalEnv("STRIPE_WEBHOOK_SECRET");
const stripePriceId = optionalEnv("STRIPE_PRICE_ID");
const stripeSuccessUrl = optionalEnv("STRIPE_SUCCESS_URL", "https://ifyrt.app/subscribed?session_id={CHECKOUT_SESSION_ID}");
const stripeCancelUrl = optionalEnv("STRIPE_CANCEL_URL", "https://ifyrt.app/#pricing");
const stripePortalReturnUrl = optionalEnv("STRIPE_PORTAL_RETURN_URL", "https://ifyrt.app/dashboard");
const stripePublicPaymentLinkUrl = optionalEnv("STRIPE_PUBLIC_PAYMENT_LINK_URL");
const ifyrtBotUrl = optionalEnv("IFYRT_BOT_URL") ?? "https://t.me/IFYRTbot";
const supportEmail = optionalEnv("SUPPORT_EMAIL") ?? "support@ifyrt.app";
const internalWebhookSecret = optionalEnv("INTERNAL_WEBHOOK_SECRET");
const telegramBotToken = optionalEnv("TELEGRAM_BOT_TOKEN");
const port = intEnv("PORT", 3005);
const app = express();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : undefined;

async function sendTelegramNotification(chatId: number, text: string): Promise<void> {
  if (!telegramBotToken) {
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with status ${response.status}`);
  }
}

app.get("/", (_req, res) => {
  res.type("html").send(
    renderLandingPage({
      botUrl: ifyrtBotUrl,
      stripeUrl: stripePublicPaymentLinkUrl,
      supportEmail
    })
  );
});

app.get("/terms", (_req, res) => {
  res.type("html").send(
    renderTermsPage({
      supportEmail
    })
  );
});

app.get("/privacy", (_req, res) => {
  res.type("html").send(
    renderPrivacyPage({
      supportEmail
    })
  );
});

app.get("/health", (_req, res) => {
  res.json({
    service: serviceName,
    status: stripe && stripeWebhookSecret ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    details: {
      stripe_ready: Boolean(stripe && stripeWebhookSecret)
    }
  });
});

app.get("/health/details", (_req, res) => {
  res.json({
    service: serviceName,
    status: stripe && stripeWebhookSecret ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    details: {
      stripe_ready: Boolean(stripe && stripeWebhookSecret),
      checkout_ready: Boolean(stripe && stripePriceId),
      billing_portal_ready: Boolean(stripe),
      internal_auth_ready: Boolean(internalWebhookSecret),
      persistence_ready: paymentsPersistenceReady(),
      telegram_notifications_ready: Boolean(telegramBotToken),
      landing_payment_link_ready: Boolean(stripePublicPaymentLinkUrl)
    }
  });
});

const internalRouter = express.Router();
internalRouter.use(express.json({ limit: "1mb" }));
internalRouter.use((req, res, next) => {
  if (!requestSignatureIsValid(req, internalWebhookSecret)) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  next();
});

internalRouter.post("/checkout/sessions", async (req, res) => {
  if (!stripe) {
    res.status(503).json({ error: "stripe_not_configured" });
    return;
  }

  const parsed = checkoutSessionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  const priceId = parsed.data.price_id ?? stripePriceId;
  if (!priceId) {
    res.status(503).json({ error: "stripe_price_not_configured" });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: parsed.data.success_url ?? stripeSuccessUrl,
      cancel_url: parsed.data.cancel_url ?? stripeCancelUrl,
      customer_email: parsed.data.email,
      allow_promotion_codes: true,
      metadata: {
        user_id: parsed.data.user_id,
        telegram_id: String(parsed.data.telegram_id)
      },
      subscription_data: {
        metadata: {
          user_id: parsed.data.user_id,
          telegram_id: String(parsed.data.telegram_id)
        },
        ...(parsed.data.trial_days > 0 ? { trial_period_days: parsed.data.trial_days } : {})
      }
    });

    logInfo(serviceName, "Stripe checkout session created", {
      user_id: parsed.data.user_id,
      telegram_id: parsed.data.telegram_id,
      session_id: session.id
    });

    if (!session.url) {
      res.status(502).json({ error: "stripe_checkout_missing_url" });
      return;
    }

    res.json({
      session_id: session.id,
      url: session.url,
      expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : undefined
    });
  } catch (error) {
    logError(serviceName, "Stripe checkout session creation failed", {
      error: error instanceof Error ? error.message : "unknown_error"
    });
    res.status(502).json({ error: "stripe_checkout_failed" });
  }
});

internalRouter.post("/billing/portal", async (req, res) => {
  if (!stripe) {
    res.status(503).json({ error: "stripe_not_configured" });
    return;
  }

  const parsed = billingPortalSessionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: parsed.data.stripe_customer_id,
      return_url: parsed.data.return_url ?? stripePortalReturnUrl
    });

    logInfo(serviceName, "Stripe billing portal session created", {
      user_id: parsed.data.user_id,
      stripe_customer_id: parsed.data.stripe_customer_id
    });

    res.json({
      url: session.url
    });
  } catch (error) {
    logError(serviceName, "Stripe billing portal session creation failed", {
      error: error instanceof Error ? error.message : "unknown_error"
    });
    res.status(502).json({ error: "stripe_portal_failed" });
  }
});

app.use(internalRouter);

app.post("/stripe/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!stripe || !stripeWebhookSecret) {
    res.status(503).json({
      error: "stripe_not_configured"
    });
    return;
  }

  const signature = req.header("stripe-signature");
  if (!signature) {
    res.status(400).json({
      error: "missing_signature"
    });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (error) {
    logError(serviceName, "Stripe webhook verification failed", {
      error: error instanceof Error ? error.message : "unknown_error"
    });
    res.status(400).json({
      error: "invalid_signature"
    });
    return;
  }

  res.json({
    accepted: true,
    id: event.id,
    type: event.type
  });

  void (async () => {
    const action = normalizeStripeEvent(event);
    const context = await resolvePaymentContext({
      user_id: action.user_id,
      telegram_id: action.telegram_id,
      stripe_customer_id: action.stripe_customer_id,
      stripe_sub_id: action.stripe_sub_id
    });

    await applyPaymentAction(action, context);

    if (action.notify_message && context.telegram_id) {
      await sendTelegramNotification(context.telegram_id, action.notify_message);
    }

    logInfo(serviceName, "Stripe webhook processed", {
      id: event.id,
      type: event.type,
      action: action.action,
      user_id: context.user_id,
      telegram_id: context.telegram_id
    });
  })().catch((error) => {
    logError(serviceName, "Stripe webhook processing failed", {
      error: error instanceof Error ? error.message : "unknown_error",
      stripe_event_type: event.type,
      stripe_event_id: event.id
    });
  });
});

app.listen(port, () => {
  logInfo(serviceName, "Service listening", { port });
});
