import { z } from "zod";

import { exchangeSchema } from "./events";

export const marketLevelSchema = z.tuple([z.number(), z.number().nonnegative()]);
export type MarketLevel = z.infer<typeof marketLevelSchema>;

export const orderBookSchema = z.object({
  bids: z.array(marketLevelSchema),
  asks: z.array(marketLevelSchema)
});
export type OrderBook = z.infer<typeof orderBookSchema>;

export const marketSnapshotSchema = z.object({
  id: z.string().uuid().optional(),
  exchange: exchangeSchema,
  symbol: z.string().min(2),
  bid: z.number().positive(),
  ask: z.number().positive(),
  last: z.number().positive(),
  volume_24h: z.number().nonnegative(),
  timestamp: z.string().datetime(),
  order_book: orderBookSchema
});
export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;

export const candleSchema = z.object({
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative(),
  timestamp: z.string().datetime()
});
export type Candle = z.infer<typeof candleSchema>;
