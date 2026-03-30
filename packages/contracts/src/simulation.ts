import { z } from "zod";

import { fillSchema, orderSignalSchema, positionSchema } from "./execution";
import { candleSchema, marketSnapshotSchema } from "./market";

export const backtestRequestSchema = z.object({
  user_id: z.string().uuid(),
  simulation_id: z.string().uuid().optional(),
  strategy: z.string().min(1),
  symbol: z.string().min(2),
  exchange: z.enum(["binance", "bybit"]),
  candles: z.array(candleSchema).min(1),
  snapshots: z.array(marketSnapshotSchema).optional(),
  initial_cash: z.number().positive().default(10000),
  fee_bps: z.number().nonnegative().default(10),
  latency_ms: z.number().nonnegative().default(0),
  trade_quantity: z.number().positive().default(0.01),
  close_on_complete: z.boolean().default(true)
});
export type BacktestRequest = z.infer<typeof backtestRequestSchema>;

export const simulatedTradeSchema = z.object({
  trade_id: z.string().uuid(),
  simulation_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  strategy: z.string(),
  symbol: z.string(),
  exchange: z.enum(["binance", "bybit"]),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit"]),
  quantity: z.number().positive(),
  fill_price: z.number().positive(),
  fee: z.number().nonnegative(),
  slippage: z.number().nonnegative(),
  pnl: z.number(),
  executed_at: z.string().datetime()
});
export type SimulatedTrade = z.infer<typeof simulatedTradeSchema>;

export const backtestMetricsSchema = z.object({
  starting_cash: z.number().positive(),
  ending_cash: z.number(),
  ending_equity: z.number(),
  realized_pnl: z.number(),
  unrealized_pnl: z.number(),
  total_trades: z.number().int().nonnegative(),
  win_rate: z.number().min(0).max(1),
  max_drawdown_pct: z.number().min(0)
});
export type BacktestMetrics = z.infer<typeof backtestMetricsSchema>;

export const backtestResultSchema = z.object({
  simulation_id: z.string().uuid(),
  strategy: z.string(),
  symbol: z.string(),
  exchange: z.enum(["binance", "bybit"]),
  status: z.enum(["completed", "failed"]),
  metrics: backtestMetricsSchema,
  trades: z.array(simulatedTradeSchema),
  final_position: positionSchema,
  last_signal: orderSignalSchema.optional(),
  fills: z.array(fillSchema)
});
export type BacktestResult = z.infer<typeof backtestResultSchema>;

export interface Strategy {
  name: string;
  onTick(candles: z.infer<typeof candleSchema>[], position: z.infer<typeof positionSchema>): z.infer<typeof orderSignalSchema>;
}
