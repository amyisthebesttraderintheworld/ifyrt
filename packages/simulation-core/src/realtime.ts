import crypto from "node:crypto";

import type {
  Candle,
  Exchange,
  Fill,
  MarketSnapshot,
  OrderSignal,
  Position,
  SimulatedTrade,
  Strategy
} from "@ifyrt/contracts";

import { simulateFill } from "./matching-engine";

export type RealtimeSimulationStatus = "running" | "stopped";

export interface RealtimeSimulationMetrics {
  starting_cash: number;
  current_cash: number;
  current_equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  current_pnl_pct: number;
  total_trades: number;
  win_rate: number;
  max_drawdown_pct: number;
}

export interface RealtimeSimulationSummary {
  simulation_id: string;
  user_id: string;
  strategy: string;
  symbol: string;
  exchange: Exchange;
  status: RealtimeSimulationStatus;
  started_at: string;
  stopped_at?: string;
  last_tick_at?: string;
  ticks_processed: number;
  position: Position;
  metrics: RealtimeSimulationMetrics;
  trades: SimulatedTrade[];
  fills: Fill[];
  last_signal?: OrderSignal;
}

export interface RealtimeSimulationSessionConfig {
  simulation_id?: string;
  user_id: string;
  strategy: string;
  symbol: string;
  exchange: Exchange;
  started_at?: string;
  initial_cash?: number;
  fee_bps?: number;
  trade_quantity: number;
  max_candles?: number;
}

export interface RealtimeSimulationSession {
  simulation_id: string;
  user_id: string;
  strategy: string;
  symbol: string;
  exchange: Exchange;
  status: RealtimeSimulationStatus;
  started_at: string;
  stopped_at?: string;
  last_tick_at?: string;
  ticks_processed: number;
  trade_quantity: number;
  initial_cash: number;
  cash: number;
  fee_bps: number;
  peak_equity: number;
  max_drawdown_pct: number;
  realized_pnl: number;
  max_candles: number;
  position: Position;
  trades: SimulatedTrade[];
  fills: Fill[];
  candle_history: Candle[];
  last_signal?: OrderSignal;
  last_snapshot?: MarketSnapshot;
}

function markToMarket(position: Position, lastPrice: number): number {
  if (!position.open || !position.entry_price) {
    return 0;
  }

  return (lastPrice - position.entry_price) * position.quantity;
}

function portfolioEquity(session: RealtimeSimulationSession, lastPrice: number): number {
  return session.cash + (session.position.open ? session.position.quantity * lastPrice : 0);
}

function updateDrawdown(session: RealtimeSimulationSession, currentEquity: number): void {
  session.peak_equity = Math.max(session.peak_equity, currentEquity);

  if (session.peak_equity === 0) {
    return;
  }

  const drawdownPct = ((session.peak_equity - currentEquity) / session.peak_equity) * 100;
  session.max_drawdown_pct = Math.max(session.max_drawdown_pct, drawdownPct);
}

function snapshotToCandle(snapshot: MarketSnapshot, previousCandle?: Candle): Candle {
  const open = previousCandle?.close ?? snapshot.last;

  return {
    open,
    high: Math.max(open, snapshot.ask, snapshot.bid, snapshot.last),
    low: Math.min(open, snapshot.ask, snapshot.bid, snapshot.last),
    close: snapshot.last,
    volume: snapshot.volume_24h,
    timestamp: snapshot.timestamp
  };
}

function pushTrade(
  session: RealtimeSimulationSession,
  side: "buy" | "sell",
  fill: Fill,
  pnl: number
): void {
  session.trades.push({
    trade_id: crypto.randomUUID(),
    simulation_id: session.simulation_id,
    user_id: session.user_id,
    strategy: session.strategy,
    symbol: session.symbol,
    exchange: session.exchange,
    side,
    type: fill.type,
    quantity: fill.filled_quantity,
    fill_price: fill.fill_price,
    fee: fill.fee,
    slippage: fill.slippage,
    pnl,
    executed_at: fill.timestamp
  });
}

function updateMetricsForSnapshot(session: RealtimeSimulationSession, snapshot: MarketSnapshot): void {
  session.position.unrealized_pnl = markToMarket(session.position, snapshot.last);
  updateDrawdown(session, portfolioEquity(session, snapshot.last));
}

function currentMetrics(session: RealtimeSimulationSession): RealtimeSimulationMetrics {
  const lastPrice = session.last_snapshot?.last ?? session.position.entry_price ?? 0;
  const currentEquity = portfolioEquity(session, lastPrice);
  const closedTrades = session.trades.filter((trade) => trade.side === "sell");
  const profitableTrades = closedTrades.filter((trade) => trade.pnl > 0);

  return {
    starting_cash: session.initial_cash,
    current_cash: session.cash,
    current_equity: currentEquity,
    realized_pnl: session.realized_pnl,
    unrealized_pnl: session.position.unrealized_pnl,
    current_pnl_pct: session.initial_cash === 0 ? 0 : ((currentEquity - session.initial_cash) / session.initial_cash) * 100,
    total_trades: session.trades.length,
    win_rate: closedTrades.length === 0 ? 0 : profitableTrades.length / closedTrades.length,
    max_drawdown_pct: session.max_drawdown_pct
  };
}

export function summarizeRealtimeSession(session: RealtimeSimulationSession): RealtimeSimulationSummary {
  return {
    simulation_id: session.simulation_id,
    user_id: session.user_id,
    strategy: session.strategy,
    symbol: session.symbol,
    exchange: session.exchange,
    status: session.status,
    started_at: session.started_at,
    stopped_at: session.stopped_at,
    last_tick_at: session.last_tick_at,
    ticks_processed: session.ticks_processed,
    position: { ...session.position },
    metrics: currentMetrics(session),
    trades: [...session.trades],
    fills: [...session.fills],
    last_signal: session.last_signal ? { ...session.last_signal } : undefined
  };
}

export function createRealtimeSession(config: RealtimeSimulationSessionConfig): RealtimeSimulationSession {
  const startedAt = config.started_at ?? new Date().toISOString();
  const initialCash = config.initial_cash ?? 10_000;

  return {
    simulation_id: config.simulation_id ?? crypto.randomUUID(),
    user_id: config.user_id,
    strategy: config.strategy,
    symbol: config.symbol,
    exchange: config.exchange,
    status: "running",
    started_at: startedAt,
    ticks_processed: 0,
    trade_quantity: config.trade_quantity,
    initial_cash: initialCash,
    cash: initialCash,
    fee_bps: config.fee_bps ?? 10,
    peak_equity: initialCash,
    max_drawdown_pct: 0,
    realized_pnl: 0,
    max_candles: config.max_candles ?? 250,
    position: {
      open: false,
      side: null,
      entry_price: null,
      quantity: 0,
      unrealized_pnl: 0
    },
    trades: [],
    fills: [],
    candle_history: []
  };
}

export function advanceRealtimeSession(
  session: RealtimeSimulationSession,
  snapshot: MarketSnapshot,
  strategy: Strategy
): RealtimeSimulationSummary {
  if (session.status !== "running") {
    throw new Error(`Simulation ${session.simulation_id} is not running.`);
  }

  if (snapshot.exchange !== session.exchange || snapshot.symbol !== session.symbol) {
    throw new Error(`Snapshot ${snapshot.exchange}:${snapshot.symbol} does not match simulation ${session.exchange}:${session.symbol}.`);
  }

  if (session.last_snapshot?.timestamp === snapshot.timestamp) {
    return summarizeRealtimeSession(session);
  }

  const candle = snapshotToCandle(snapshot, session.candle_history.at(-1));
  session.candle_history.push(candle);
  if (session.candle_history.length > session.max_candles) {
    session.candle_history.shift();
  }

  session.last_snapshot = snapshot;
  session.last_tick_at = snapshot.timestamp;
  session.ticks_processed += 1;
  session.position.unrealized_pnl = markToMarket(session.position, snapshot.last);

  const signal = strategy.onTick(session.candle_history, session.position);
  session.last_signal = signal;

  if (signal.side === "hold") {
    updateMetricsForSnapshot(session, snapshot);
    return summarizeRealtimeSession(session);
  }

  const fill = simulateFill(signal, snapshot, session.fee_bps);
  session.fills.push(fill);

  if (fill.status === "rejected" || fill.status === "pending" || fill.status === "ignored" || fill.filled_quantity === 0) {
    updateMetricsForSnapshot(session, snapshot);
    return summarizeRealtimeSession(session);
  }

  const tradeSide = signal.side;
  const fillValue = fill.fill_price * fill.filled_quantity;

  if (tradeSide === "buy") {
    if (session.position.open) {
      updateMetricsForSnapshot(session, snapshot);
      return summarizeRealtimeSession(session);
    }

    const totalCost = fillValue + fill.fee;
    if (totalCost > session.cash) {
      updateMetricsForSnapshot(session, snapshot);
      return summarizeRealtimeSession(session);
    }

    session.cash -= totalCost;
    session.position = {
      open: true,
      side: "long",
      entry_price: fill.fill_price,
      quantity: fill.filled_quantity,
      unrealized_pnl: 0
    };
    pushTrade(session, "buy", fill, 0);
  } else {
    if (!session.position.open || !session.position.entry_price) {
      updateMetricsForSnapshot(session, snapshot);
      return summarizeRealtimeSession(session);
    }

    const pnl = (fill.fill_price - session.position.entry_price) * fill.filled_quantity - fill.fee;
    session.cash += fillValue - fill.fee;
    session.realized_pnl += pnl;
    pushTrade(session, "sell", fill, pnl);
    session.position = {
      open: false,
      side: null,
      entry_price: null,
      quantity: 0,
      unrealized_pnl: 0
    };
  }

  updateMetricsForSnapshot(session, snapshot);
  return summarizeRealtimeSession(session);
}

export function stopRealtimeSession(
  session: RealtimeSimulationSession,
  stoppedAt = new Date().toISOString()
): RealtimeSimulationSummary {
  if (session.status === "stopped") {
    return summarizeRealtimeSession(session);
  }

  if (session.position.open && session.last_snapshot && session.position.entry_price) {
    const exitFill = simulateFill(
      {
        side: "sell",
        type: "market",
        quantity: session.position.quantity,
        reason: "Close position on realtime simulation stop"
      },
      {
        ...session.last_snapshot,
        timestamp: stoppedAt
      },
      session.fee_bps
    );

    session.fills.push(exitFill);

    if (exitFill.filled_quantity > 0) {
      const pnl = (exitFill.fill_price - session.position.entry_price) * exitFill.filled_quantity - exitFill.fee;
      session.cash += exitFill.fill_price * exitFill.filled_quantity - exitFill.fee;
      session.realized_pnl += pnl;
      pushTrade(session, "sell", exitFill, pnl);
      session.position = {
        open: false,
        side: null,
        entry_price: null,
        quantity: 0,
        unrealized_pnl: 0
      };
      session.last_signal = {
        side: "sell",
        type: "market",
        quantity: exitFill.filled_quantity,
        reason: "Close position on realtime simulation stop"
      };
    }
  }

  session.status = "stopped";
  session.stopped_at = stoppedAt;

  if (session.last_snapshot) {
    updateMetricsForSnapshot(session, session.last_snapshot);
  }

  return summarizeRealtimeSession(session);
}
