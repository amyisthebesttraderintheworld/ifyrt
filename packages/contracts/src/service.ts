import { z } from "zod";

import { fillSchema, orderSignalSchema } from "./execution";
import { exchangeSchema, subscriptionTierSchema } from "./events";

export const serviceHealthSchema = z.object({
  service: z.string(),
  status: z.enum(["ok", "degraded"]),
  timestamp: z.string().datetime(),
  details: z.record(z.unknown()).optional()
});
export type ServiceHealth = z.infer<typeof serviceHealthSchema>;

export const simulationStartRequestSchema = z.object({
  user_id: z.string().uuid(),
  strategy: z.string().min(1),
  symbol: z.string().min(2),
  exchange: exchangeSchema
});
export type SimulationStartRequest = z.infer<typeof simulationStartRequestSchema>;

export const simulationStopRequestSchema = z.object({
  simulation_id: z.string().uuid(),
  user_id: z.string().uuid()
});
export type SimulationStopRequest = z.infer<typeof simulationStopRequestSchema>;

export const liveSessionControlRequestSchema = z.object({
  user_id: z.string().uuid(),
  exchange: exchangeSchema,
  symbol: z.string().min(2),
  strategy: z.string().min(1),
  tier: subscriptionTierSchema,
  key_reference: z.string().min(1).optional()
});
export type LiveSessionControlRequest = z.infer<typeof liveSessionControlRequestSchema>;

export const liveOrderRequestSchema = z.object({
  context: z.object({
    user_id: z.string().uuid(),
    live_session_id: z.string().uuid(),
    exchange: exchangeSchema,
    symbol: z.string().min(2)
  }),
  signal: orderSignalSchema,
  key_reference: z.string().min(1)
});
export type LiveOrderRequest = z.infer<typeof liveOrderRequestSchema>;

export const liveOrderResponseSchema = z.object({
  accepted: z.boolean(),
  reason: z.string().optional(),
  fill: fillSchema.optional()
});
export type LiveOrderResponse = z.infer<typeof liveOrderResponseSchema>;

export const copySignalSchema = z.object({
  signal_id: z.string().uuid().optional(),
  leader_id: z.string().uuid(),
  strategy: z.string().min(1),
  symbol: z.string().min(2),
  exchange: exchangeSchema,
  side: z.enum(["buy", "sell", "hold"]),
  signal_type: z.enum(["market", "limit"]),
  price: z.number().positive().optional(),
  quantity: z.number().positive()
});
export type CopySignal = z.infer<typeof copySignalSchema>;

export const copyFollowerSchema = z.object({
  follower_id: z.string().uuid(),
  mode: z.enum(["sim", "live"]),
  active: z.boolean().default(true),
  has_session: z.boolean().default(true),
  allow_copy: z.boolean().default(true)
});
export type CopyFollower = z.infer<typeof copyFollowerSchema>;

export const copyFanoutRequestSchema = z.object({
  signal: copySignalSchema,
  followers: z.array(copyFollowerSchema).min(1)
});
export type CopyFanoutRequest = z.infer<typeof copyFanoutRequestSchema>;

export const copyExecutionPlanSchema = z.object({
  follower_id: z.string().uuid(),
  mode: z.enum(["sim", "live"]),
  status: z.enum(["pending", "skipped"]),
  reason: z.string().optional()
});
export type CopyExecutionPlan = z.infer<typeof copyExecutionPlanSchema>;

export const copyFanoutResponseSchema = z.object({
  signal: copySignalSchema,
  planned: z.array(copyExecutionPlanSchema)
});
export type CopyFanoutResponse = z.infer<typeof copyFanoutResponseSchema>;

export const strategyListItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  default_quantity: z.number().positive()
});
export type StrategyListItem = z.infer<typeof strategyListItemSchema>;
