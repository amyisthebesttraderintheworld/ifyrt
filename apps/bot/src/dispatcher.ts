import { ifyrtEventSchema, type IfyrtEvent } from "@ifyrt/contracts";
import { createHmacSignature, logInfo, optionalEnv } from "@ifyrt/service-core";

function dispatchConfig() {
  const webhookUrl = optionalEnv("N8N_WEBHOOK_URL");
  const internalWebhookSecret = optionalEnv("INTERNAL_WEBHOOK_SECRET");

  if (!webhookUrl) {
    throw new Error("Missing required environment variable: N8N_WEBHOOK_URL");
  }

  if (!internalWebhookSecret) {
    throw new Error("Missing required environment variable: INTERNAL_WEBHOOK_SECRET");
  }

  return {
    webhookUrl,
    internalWebhookSecret
  };
}

export async function dispatchEvent(event: IfyrtEvent): Promise<void> {
  const { webhookUrl, internalWebhookSecret } = dispatchConfig();
  const payload = ifyrtEventSchema.parse(event);
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ifyrt-signature": createHmacSignature(payload, internalWebhookSecret)
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`n8n dispatch failed with status ${response.status}`);
  }

  logInfo("ifyrt-bot", "Dispatched event to n8n", {
    event_id: payload.event_id,
    event_type: payload.event_type
  });
}
