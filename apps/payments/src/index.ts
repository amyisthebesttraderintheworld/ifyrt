import express from "express";
import Stripe from "stripe";

import { intEnv, logError, logInfo, optionalEnv } from "@ifyrt/service-core";

const serviceName = "ifyrt-payments";
const stripeSecretKey = optionalEnv("STRIPE_SECRET_KEY");
const stripeWebhookSecret = optionalEnv("STRIPE_WEBHOOK_SECRET");
const port = intEnv("PORT", 3005);
const app = express();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : undefined;

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

  try {
    const event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
    logInfo(serviceName, "Stripe webhook received", {
      type: event.type,
      id: event.id
    });

    res.json({
      accepted: true,
      type: event.type,
      id: event.id
    });
  } catch (error) {
    logError(serviceName, "Stripe webhook verification failed", {
      error: error instanceof Error ? error.message : "unknown_error"
    });
    res.status(400).json({
      error: "invalid_signature"
    });
  }
});

app.listen(port, () => {
  logInfo(serviceName, "Service listening", { port });
});
