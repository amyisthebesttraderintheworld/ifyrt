import { logInfo, requireEnv } from "@ifyrt/service-core";

const telegramBotToken = requireEnv("TELEGRAM_BOT_TOKEN");
const telegramBaseUrl = `https://api.telegram.org/bot${telegramBotToken}`;

async function telegramRequest<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${telegramBaseUrl}/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Telegram API ${method} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text
  });

  logInfo("ifyrt-bot", "Sent Telegram reply", { chat_id: chatId });
}

export async function deleteTelegramMessage(chatId: number, messageId: number): Promise<void> {
  await telegramRequest("deleteMessage", {
    chat_id: chatId,
    message_id: messageId
  });

  logInfo("ifyrt-bot", "Deleted Telegram message", { chat_id: chatId, message_id: messageId });
}
