import crypto from "node:crypto";

import { type IfyrtEvent } from "@ifyrt/contracts";
import {
  createServiceApp,
  intEnv,
  logError,
  logInfo,
  optionalEnv,
  validationError
} from "@ifyrt/service-core";

import { dispatchEvent } from "./dispatcher";
import { parseTelegramCommand } from "./parser";
import { acknowledgementFor, formatUserError } from "./replies";
import { deleteTelegramMessage, sendTelegramMessage } from "./telegram";
import { telegramUpdateSchema } from "./types";

const serviceName = "ifyrt-bot";
const app = createServiceApp(serviceName);
const port = intEnv("PORT", 3000);
const telegramWebhookSecret = optionalEnv("TELEGRAM_WEBHOOK_SECRET");

async function handleUpdate(updateBody: unknown): Promise<void> {
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
      error: messageText
    });
    await sendTelegramMessage(message.chat.id, formatUserError(messageText)).catch(() => undefined);
  }
}

app.post("/webhooks/telegram", (req, res) => {
  if (telegramWebhookSecret && req.header("x-telegram-bot-api-secret-token") !== telegramWebhookSecret) {
    validationError(res, [{ message: "Invalid Telegram webhook secret" }]);
    return;
  }

  res.status(200).json({ ok: true });
  void handleUpdate(req.body);
});

app.listen(port, () => {
  logInfo(serviceName, "Service listening", { port });
});
