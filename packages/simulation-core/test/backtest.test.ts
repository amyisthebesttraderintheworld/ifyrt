import assert from "node:assert/strict";
import test from "node:test";

import type { BacktestRequest, MarketSnapshot } from "@ifyrt/contracts";

import { createStrategy, simulateBacktest, simulateFill } from "../src";

const baseRequest: BacktestRequest = {
  user_id: "11111111-1111-4111-8111-111111111111",
  strategy: "buy-and-hold",
  symbol: "BTCUSDT",
  exchange: "binance",
  initial_cash: 10_000,
  fee_bps: 10,
  latency_ms: 0,
  trade_quantity: 0.01,
  close_on_complete: true,
  candles: [
    {
      open: 10_000,
      high: 10_050,
      low: 9_950,
      close: 10_010,
      volume: 1000,
      timestamp: "2026-01-01T00:00:00.000Z"
    },
    {
      open: 10_010,
      high: 10_200,
      low: 10_000,
      close: 10_150,
      volume: 1100,
      timestamp: "2026-01-01T01:00:00.000Z"
    }
  ]
};

test("simulateFill walks through order book depth deterministically", () => {
  const snapshot: MarketSnapshot = {
    exchange: "binance",
    symbol: "BTCUSDT",
    bid: 100,
    ask: 101,
    last: 100.5,
    volume_24h: 10_000,
    timestamp: "2026-01-01T00:00:00.000Z",
    order_book: {
      bids: [
        [100, 0.5],
        [99.5, 2]
      ],
      asks: [
        [101, 0.5],
        [101.5, 1]
      ]
    }
  };

  const fill = simulateFill(
    {
      side: "buy",
      type: "market",
      quantity: 1,
      reason: "Depth walk"
    },
    snapshot,
    10
  );

  assert.equal(fill.status, "filled");
  assert.equal(fill.filled_quantity, 1);
  assert.equal(fill.fill_price, 101.25);
  assert.equal(fill.best_price, 101);
});

test("simulateBacktest produces stable results for the same input", () => {
  const strategy = createStrategy(baseRequest.strategy, {
    quantity: baseRequest.trade_quantity
  });

  const first = simulateBacktest(baseRequest, strategy);
  const second = simulateBacktest(baseRequest, strategy);

  assert.equal(first.metrics.realized_pnl, second.metrics.realized_pnl);
  assert.equal(first.trades.length, second.trades.length);
  assert.equal(first.fills.length, second.fills.length);
  assert.equal(first.metrics.ending_equity, second.metrics.ending_equity);
});
