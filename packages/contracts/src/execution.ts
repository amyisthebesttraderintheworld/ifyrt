import { z } from "zod";

import { exchangeSchema } from "./events";

export const signalSideSchema = z.enum(["buy", "sell", "hold"]);
export type SignalSide = z.infer<typeof signalSideSchema>;

export const orderTypeSchema = z.enum(["market", "limit"]);
export type OrderType = z.infer<typeof orderTypeSchema>;

export const fillStatusSchema = z.enum([
  "filled",
  "partial",
  "pending",
  "rejected",
  "ignored"
]);
export type FillStatus = z.infer<typeof fillStatusSchema>;

export const orderSignalSchema = z.object({
  side: signalSideSchema,
  type: orderTypeSchema,
  price: z.number().positive().optional(),
  quantity: z.number().positive(),
  reason: z.string().optional()
});
export type OrderSignal = z.infer<typeof orderSignalSchema>;

export const positionSchema = z.object({
  open: z.boolean(),
  side: z.enum(["long", "short"]).nullable(),
  entry_price: z.number().positive().nullable(),
  quantity: z.number().nonnegative(),
  unrealized_pnl: z.number()
});
export type Position = z.infer<typeof positionSchema>;

export const executionContextSchema = z.object({
  symbol: z.string().min(2),
  exchange: exchangeSchema,
  user_id: z.string().uuid(),
  simulation_id: z.string().uuid().optional(),
  live_session_id: z.string().uuid().optional()
});
export type ExecutionContext = z.infer<typeof executionContextSchema>;

export const fillSchema = z.object({
  side: signalSideSchema,
  type: orderTypeSchema,
  status: fillStatusSchema,
  requested_quantity: z.number().positive(),
  filled_quantity: z.number().nonnegative(),
  requested_price: z.number().positive().optional(),
  fill_price: z.number().nonnegative(),
  best_price: z.number().nonnegative(),
  fee: z.number().nonnegative(),
  slippage: z.number().nonnegative(),
  timestamp: z.string().datetime(),
  reason: z.string().optional()
});
export type Fill = z.infer<typeof fillSchema>;
