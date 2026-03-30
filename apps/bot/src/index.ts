import crypto from "node:crypto";

import express from "express";

import { type IfyrtEvent } from "@ifyrt/contracts";
import {
  createServiceApp,
  intEnv,
  logError,
  logInfo,
  optionalEnv,
  renderLandingPage,
  renderPrivacyPage,
  renderTermsPage,
  validationError
} from "@ifyrt/service-core";

import { dispatchEvent } from "./dispatcher";
import { parseTelegramCommand } from "./parser";
import { acknowledgementFor, formatUserError } from "./replies";
import { deleteTelegramMessage, sendTelegramMessage } from "./telegram";
import { telegramUpdateSchema } from "./types";

const serviceName = "ifyrt-bot";
const app = createServiceApp(serviceName);
app.use("/assets", express.static("../../assets"));
const port = intEnv("PORT", 3000);
const telegramWebhookSecret = optionalEnv("TELEGRAM_WEBHOOK_SECRET");
const n8nWebhookUrl = optionalEnv("N8N_WEBHOOK_URL");
const internalWebhookSecret = optionalEnv("INTERNAL_WEBHOOK_SECRET");
const stripePublicPaymentLinkUrl = optionalEnv("STRIPE_PUBLIC_PAYMENT_LINK_URL");
const ifyrtBotUrl = optionalEnv("IFYRT_BOT_URL") ?? "https://t.me/IFYRTbot";
const supportEmail = optionalEnv("SUPPORT_EMAIL") ?? "support@ifyrt.app";

async function handleUpdate(updateBody: unknown): Promise<void> {
  logInfo(serviceName, "Received Telegram update", { body: JSON.stringify(updateBody) });
  const parsedUpdate = telegramUpdateSchema.safeParse(updateBody);
  if (!parsedUpdate.success) {
    throw new Error("Invalid Telegram payload");
  }

  const message = parsedUpdate.data.message ?? parsedUpdate.data.edited_message;
  if (!message?.text || !message.from) {
    return;
  }

  const isSensitiveCommand = message.text.trim().toLowerCase().startsWith("/setkey");

  try {
    const parsedCommand = parseTelegramCommand(message.text, message.chat);

    if (parsedCommand.deleteMessage) {
      await deleteTelegramMessage(message.chat.id, message.message_id);
    }

    const event: IfyrtEvent = {
      event_id: crypto.randomUUID(),
      event_type: parsedCommand.eventType,
      timestamp: new Date().toISOString(),
      source: "telegram",
      user: {
        telegram_id: message.from.id,
        username: message.from.username ?? null,
        first_name: message.from.first_name
      },
      payload: parsedCommand.payload,
      raw_text: parsedCommand.eventType === "key.submit" ? "[REDACTED /setkey]" : message.text,
      chat_id: message.chat.id,
      message_id: message.message_id
    };

    await Promise.all([
      dispatchEvent(event),
      sendTelegramMessage(message.chat.id, acknowledgementFor(parsedCommand.eventType))
    ]);
  } catch (error) {
    if (isSensitiveCommand) {
      await deleteTelegramMessage(message.chat.id, message.message_id).catch(() => undefined);
    }

    const messageText = error instanceof Error ? error.message : "Something went wrong while parsing the command.";
    logError(serviceName, "Failed to process Telegram update", {
      chat_id: message.chat.id,
      message_id: message.message_id,
      error: messageText,
      stack: error instanceof Error ? error.stack : undefined
    });
    await sendTelegramMessage(message.chat.id, formatUserError(messageText)).catch(() => undefined);
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

app.post("/webhooks/telegram", (req, res) => {
  if (telegramWebhookSecret && req.header("x-telegram-bot-api-secret-token") !== telegramWebhookSecret) {
    validationError(res, [{ message: "Invalid Telegram webhook secret" }]);
    return;
  }

  res.status(200).json({ ok: true });
  void handleUpdate(req.body);
});

app.get("/health/details", (_req, res) => {
  res.json({
    service: serviceName,
    status: n8nWebhookUrl && internalWebhookSecret ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    details: {
      n8n_dispatch_ready: Boolean(n8nWebhookUrl && internalWebhookSecret),
      n8n_webhook_url_configured: Boolean(n8nWebhookUrl),
      internal_webhook_secret_configured: Boolean(internalWebhookSecret),
      telegram_webhook_secret_configured: Boolean(telegramWebhookSecret),
      landing_payment_link_ready: Boolean(stripePublicPaymentLinkUrl)
    }
  });
});

app.listen(port, () => {
  logInfo(serviceName, "Service listening", {
    port,
    n8n_dispatch_ready: Boolean(n8nWebhookUrl && internalWebhookSecret)
  });
});
