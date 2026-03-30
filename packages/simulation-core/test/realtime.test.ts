import assert from "node:assert/strict";
import test from "node:test";

import type { MarketSnapshot } from "@ifyrt/contracts";

import {
  advanceRealtimeSession,
  createRealtimeSession,
  createStrategy,
  stopRealtimeSession
} from "../src";

const firstSnapshot: MarketSnapshot = {
  exchange: "binance",
  symbol: "BTCUSDT",
  bid: 100,
  ask: 101,
  last: 100.5,
  volume_24h: 10_000,
  timestamp: "2026-01-01T00:00:00.000Z",
  order_book: {
    bids: [[100, 1]],
    asks: [[101, 1]]
  }
};

const secondSnapshot: MarketSnapshot = {
  exchange: "binance",
  symbol: "BTCUSDT",
  bid: 109,
  ask: 110,
  last: 109.5,
  volume_24h: 10_500,
  timestamp: "2026-01-01T00:01:00.000Z",
  order_book: {
    bids: [[109, 1]],
    asks: [[110, 1]]
  }
};

function buildSession() {
  return createRealtimeSession({
    simulation_id: "22222222-2222-4222-8222-222222222222",
    user_id: "11111111-1111-4111-8111-111111111111",
    strategy: "buy-and-hold",
    symbol: "BTCUSDT",
    exchange: "binance",
    trade_quantity: 1,
    initial_cash: 1000,
    fee_bps: 0
  });
}

test("advanceRealtimeSession opens a realtime position and tracks unrealized pnl", () => {
  const strategy = createStrategy("buy-and-hold", { quantity: 1 });
  const session = buildSession();

  const opened = advanceRealtimeSession(session, firstSnapshot, strategy);
  const advanced = advanceRealtimeSession(session, secondSnapshot, strategy);

  assert.equal(opened.status, "running");
  assert.equal(opened.trades.length, 1);
  assert.equal(opened.position.open, true);
  assert.equal(advanced.position.open, true);
  assert.equal(advanced.metrics.unrealized_pnl, 8.5);
  assert.equal(advanced.metrics.current_equity, 1008.5);
});

test("advanceRealtimeSession ignores duplicate snapshots", () => {
  const strategy = createStrategy("buy-and-hold", { quantity: 1 });
  const session = buildSession();

  advanceRealtimeSession(session, firstSnapshot, strategy);
  const duplicate = advanceRealtimeSession(session, firstSnapshot, strategy);

  assert.equal(duplicate.ticks_processed, 1);
  assert.equal(duplicate.trades.length, 1);
  assert.equal(duplicate.fills.length, 1);
});

test("stopRealtimeSession closes the open position and realizes pnl", () => {
  const strategy = createStrategy("buy-and-hold", { quantity: 1 });
  const session = buildSession();

  advanceRealtimeSession(session, firstSnapshot, strategy);
  advanceRealtimeSession(session, secondSnapshot, strategy);
  const stopped = stopRealtimeSession(session, "2026-01-01T00:02:00.000Z");

  assert.equal(stopped.status, "stopped");
  assert.equal(stopped.position.open, false);
  assert.equal(stopped.trades.length, 2);
  assert.equal(stopped.trades.at(-1)?.side, "sell");
  assert.equal(stopped.metrics.realized_pnl, 8);
  assert.equal(stopped.metrics.current_equity, 1008);
});
