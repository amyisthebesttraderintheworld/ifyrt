import { ifyrtEventSchema, type IfyrtEvent } from "@ifyrt/contracts";
import { createHmacSignature, logInfo, requireEnv } from "@ifyrt/service-core";

const webhookUrl = requireEnv("N8N_WEBHOOK_URL");
const internalWebhookSecret = requireEnv("INTERNAL_WEBHOOK_SECRET");

export async function dispatchEvent(event: IfyrtEvent): Promise<void> {
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
