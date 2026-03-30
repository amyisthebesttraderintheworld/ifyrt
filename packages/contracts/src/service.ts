import { z } from "zod";

import { fillSchema, orderSignalSchema } from "./execution";
import { exchangeSchema, subscriptionTierSchema } from "./events";

export const liveSessionStatusSchema = z.enum(["active", "stopped", "circuit_broken"]);
export type LiveSessionStatus = z.infer<typeof liveSessionStatusSchema>;

export const circuitBreakerStateSchema = z.object({
  user_id: z.string().uuid(),
  active: z.boolean(),
  reason: z.string().optional(),
  drawdown_pct: z.number().nonnegative().optional(),
  triggered_at: z.string().datetime().optional(),
  reset_at: z.string().datetime().optional()
});
export type CircuitBreakerState = z.infer<typeof circuitBreakerStateSchema>;

export const liveSessionSchema = z.object({
  session_id: z.string().uuid(),
  user_id: z.string().uuid(),
  exchange: exchangeSchema,
  symbol: z.string().min(2),
  strategy: z.string().min(1),
  status: liveSessionStatusSchema,
  started_at: z.string().datetime(),
  stopped_at: z.string().datetime().optional(),
  stop_reason: z.string().optional(),
  key_reference: z.string().min(1)
});
export type LiveSession = z.infer<typeof liveSessionSchema>;

export const subscriptionSummarySchema = z.object({
  tier: subscriptionTierSchema,
  trial_end: z.string().datetime().nullable().optional(),
  paid_until: z.string().datetime().nullable().optional(),
  stripe_customer_id: z.string().nullable().optional(),
  stripe_sub_id: z.string().nullable().optional()
});
export type SubscriptionSummary = z.infer<typeof subscriptionSummarySchema>;

export const statusSimulationSummarySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["backtest", "realtime", "copy"]),
  status: z.enum(["queued", "running", "completed", "failed", "stopped"]),
  strategy: z.string().min(1),
  symbol: z.string().min(2),
  exchange: exchangeSchema,
  created_at: z.string().datetime(),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  result: z.record(z.unknown()).nullable().optional()
});
export type StatusSimulationSummary = z.infer<typeof statusSimulationSummarySchema>;

export const statusCopySubscriptionSchema = z.object({
  id: z.string().uuid(),
  leader_id: z.string().uuid(),
  leader_username: z.string().nullable().optional(),
  mode: z.enum(["sim", "live"]),
  active: z.boolean(),
  created_at: z.string().datetime()
});
export type StatusCopySubscription = z.infer<typeof statusCopySubscriptionSchema>;

export const statusTradeSummarySchema = z.object({
  id: z.string().uuid(),
  is_live: z.boolean(),
  symbol: z.string().min(2),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit"]),
  fill_price: z.number().nonnegative(),
  pnl: z.number().nullable().optional(),
  executed_at: z.string().datetime()
});
export type StatusTradeSummary = z.infer<typeof statusTradeSummarySchema>;

export const userStatusSnapshotSchema = z.object({
  subscription: subscriptionSummarySchema.nullable().optional(),
  active_simulation: statusSimulationSummarySchema.nullable().optional(),
  active_live_session: z
    .object({
      id: z.string().uuid(),
      exchange: exchangeSchema,
      symbol: z.string().min(2),
      strategy: z.string().min(1),
      status: liveSessionStatusSchema,
      started_at: z.string().datetime(),
      stopped_at: z.string().datetime().nullable().optional(),
      stop_reason: z.string().nullable().optional()
    })
    .nullable()
    .optional(),
  copy_subscriptions: z.array(statusCopySubscriptionSchema).default([]),
  recent_backtest: statusSimulationSummarySchema.nullable().optional(),
  trade_count: z.number().int().nonnegative().optional(),
  last_trade: statusTradeSummarySchema.nullable().optional()
});
export type UserStatusSnapshot = z.infer<typeof userStatusSnapshotSchema>;

export const serviceHealthSchema = z.object({
  service: z.string(),
  status: z.enum(["ok", "degraded"]),
  timestamp: z.string().datetime(),
  details: z.record(z.unknown()).optional()
});
export type ServiceHealth = z.infer<typeof serviceHealthSchema>;

export const statusSnapshotRequestSchema = z.object({
  user_id: z.string().uuid()
});
export type StatusSnapshotRequest = z.infer<typeof statusSnapshotRequestSchema>;

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

export const liveSessionEnableRequestSchema = z.object({
  user_id: z.string().uuid(),
  exchange: exchangeSchema,
  symbol: z.string().min(2),
  strategy: z.string().min(1),
  tier: subscriptionTierSchema,
  key_reference: z.string().min(1)
});
export type LiveSessionEnableRequest = z.infer<typeof liveSessionEnableRequestSchema>;

export const liveSessionControlRequestSchema = liveSessionEnableRequestSchema;
export type LiveSessionControlRequest = LiveSessionEnableRequest;

export const liveSessionDisableRequestSchema = z.object({
  user_id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  reason: z.string().min(1).optional()
});
export type LiveSessionDisableRequest = z.infer<typeof liveSessionDisableRequestSchema>;

export const liveSessionEnableResponseSchema = z.object({
  accepted: z.boolean(),
  reason: z.string().optional(),
  session: liveSessionSchema.optional(),
  circuit_breaker: circuitBreakerStateSchema.optional()
});
export type LiveSessionEnableResponse = z.infer<typeof liveSessionEnableResponseSchema>;

export const liveSessionDisableResponseSchema = z.object({
  accepted: z.boolean(),
  reason: z.string().optional(),
  session: liveSessionSchema.optional(),
  circuit_breaker: circuitBreakerStateSchema.optional()
});
export type LiveSessionDisableResponse = z.infer<typeof liveSessionDisableResponseSchema>;

export const circuitBreakerTriggerRequestSchema = z.object({
  user_id: z.string().uuid(),
  reason: z.string().min(1),
  drawdown_pct: z.number().nonnegative().optional()
});
export type CircuitBreakerTriggerRequest = z.infer<typeof circuitBreakerTriggerRequestSchema>;

export const circuitBreakerResetRequestSchema = z.object({
  user_id: z.string().uuid(),
  reason: z.string().min(1).optional()
});
export type CircuitBreakerResetRequest = z.infer<typeof circuitBreakerResetRequestSchema>;

export const circuitBreakerResponseSchema = z.object({
  accepted: z.boolean(),
  breaker: circuitBreakerStateSchema,
  session: liveSessionSchema.optional()
});
export type CircuitBreakerResponse = z.infer<typeof circuitBreakerResponseSchema>;

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
  fill: fillSchema.optional(),
  session: liveSessionSchema.optional(),
  circuit_breaker: circuitBreakerStateSchema.optional()
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
  tier: subscriptionTierSchema.default("free"),
  live_mode_enabled: z.boolean().default(false),
  has_session: z.boolean().default(true),
  allow_copy: z.boolean().default(true),
  circuit_breaker_active: z.boolean().default(false)
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
  planned: z.array(copyExecutionPlanSchema),
  active_routes: z.number().int().nonnegative().optional()
});
export type CopyFanoutResponse = z.infer<typeof copyFanoutResponseSchema>;

export const copyStopRequestSchema = z.object({
  follower_id: z.string().uuid(),
  leader_id: z.string().uuid().optional(),
  reason: z.string().min(1).optional()
});
export type CopyStopRequest = z.infer<typeof copyStopRequestSchema>;

export const copyStopResponseSchema = z.object({
  accepted: z.boolean(),
  stopped_routes: z.number().int().nonnegative(),
  follower_id: z.string().uuid(),
  leader_id: z.string().uuid().optional(),
  reason: z.string().optional()
});
export type CopyStopResponse = z.infer<typeof copyStopResponseSchema>;

export const strategyListItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  default_quantity: z.number().positive()
});
export type StrategyListItem = z.infer<typeof strategyListItemSchema>;

export const dashboardLinkRequestSchema = z.object({
  user_id: z.string().uuid(),
  tier: subscriptionTierSchema,
  return_path: z.string().optional()
});
export type DashboardLinkRequest = z.infer<typeof dashboardLinkRequestSchema>;

export const dashboardLinkResponseSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  url: z.string().url().optional()
});
export type DashboardLinkResponse = z.infer<typeof dashboardLinkResponseSchema>;

export const checkoutSessionRequestSchema = z.object({
  user_id: z.string().uuid(),
  telegram_id: z.number().int().nonnegative(),
  email: z.string().email().optional(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  price_id: z.string().min(1).optional(),
  trial_days: z.number().int().min(0).max(30).default(7)
});
export type CheckoutSessionRequest = z.infer<typeof checkoutSessionRequestSchema>;

export const checkoutSessionResponseSchema = z.object({
  session_id: z.string(),
  url: z.string().url(),
  expires_at: z.string().datetime().optional()
});
export type CheckoutSessionResponse = z.infer<typeof checkoutSessionResponseSchema>;

export const billingPortalSessionRequestSchema = z.object({
  user_id: z.string().uuid(),
  stripe_customer_id: z.string().min(1),
  return_url: z.string().url().optional()
});
export type BillingPortalSessionRequest = z.infer<typeof billingPortalSessionRequestSchema>;

export const billingPortalSessionResponseSchema = z.object({
  url: z.string().url()
});
export type BillingPortalSessionResponse = z.infer<typeof billingPortalSessionResponseSchema>;

export const paymentWebhookActionSchema = z.object({
  action: z.enum([
    "subscription.activated",
    "subscription.updated",
    "subscription.canceled",
    "payment.failed",
    "payment.succeeded",
    "ignored"
  ]),
  raw_event_type: z.string(),
  audit_event_type: z.string(),
  user_id: z.string().uuid().optional(),
  telegram_id: z.number().int().nonnegative().optional(),
  tier: subscriptionTierSchema.optional(),
  trial_start: z.string().datetime().optional(),
  trial_end: z.string().datetime().nullable().optional(),
  paid_until: z.string().datetime().nullable().optional(),
  stripe_customer_id: z.string().optional(),
  stripe_sub_id: z.string().optional(),
  notify_message: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});
export type PaymentWebhookAction = z.infer<typeof paymentWebhookActionSchema>;
