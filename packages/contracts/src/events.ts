import { z } from "zod";

export const exchangeSchema = z.enum(["binance", "bybit"]);
export type Exchange = z.infer<typeof exchangeSchema>;

export const subscriptionTierSchema = z.enum(["free", "trial", "paid"]);
export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;

export const eventTypeSchema = z.enum([
  "user.start",
  "user.help",
  "backtest.request",
  "simulation.start",
  "simulation.stop",
  "user.status",
  "live.enable",
  "live.disable",
  "copy.start",
  "copy.stop",
  "subscription.view",
  "dashboard.request",
  "strategy.list",
  "key.submit"
]);
export type EventType = z.infer<typeof eventTypeSchema>;

export const telegramUserSchema = z.object({
  telegram_id: z.number().int().nonnegative(),
  username: z.string().nullable(),
  first_name: z.string().min(1)
});
export type TelegramUser = z.infer<typeof telegramUserSchema>;

export const backtestPayloadSchema = z.object({
  strategy: z.string().min(1),
  symbol: z.string().min(2),
  exchange: exchangeSchema.default("binance"),
  from: z.string().datetime(),
  to: z.string().datetime(),
  interval: z.string().default("1h")
});

export const simulationStartPayloadSchema = z.object({
  strategy: z.string().min(1),
  symbol: z.string().min(2),
  exchange: exchangeSchema.default("binance")
});

export const copyStartPayloadSchema = z.object({
  leader: z.string().min(1),
  mode: z.enum(["sim", "live"]).default("sim")
});

export const copyStopPayloadSchema = z.object({
  leader: z.string().min(1).optional()
});

export const keySubmitPayloadSchema = z.object({
  exchange: exchangeSchema,
  api_key: z.string().min(1),
  api_secret: z.string().min(1),
  label: z.string().min(1).optional()
});

export const ifyrtEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: eventTypeSchema,
  timestamp: z.string().datetime(),
  source: z.literal("telegram"),
  user: telegramUserSchema,
  payload: z.record(z.unknown()),
  raw_text: z.string(),
  chat_id: z.number().int(),
  message_id: z.number().int()
});
export type IfyrtEvent = z.infer<typeof ifyrtEventSchema>;

export type EventPayloadMap = {
  "user.start": Record<string, never>;
  "user.help": Record<string, never>;
  "backtest.request": z.infer<typeof backtestPayloadSchema>;
  "simulation.start": z.infer<typeof simulationStartPayloadSchema>;
  "simulation.stop": Record<string, never>;
  "user.status": Record<string, never>;
  "live.enable": Record<string, never>;
  "live.disable": Record<string, never>;
  "copy.start": z.infer<typeof copyStartPayloadSchema>;
  "copy.stop": z.infer<typeof copyStopPayloadSchema>;
  "subscription.view": Record<string, never>;
  "dashboard.request": Record<string, never>;
  "strategy.list": Record<string, never>;
  "key.submit": z.infer<typeof keySubmitPayloadSchema>;
};
