import crypto from "node:crypto";

import type {
  BacktestRequest,
  BacktestResult,
  Candle,
  Fill,
  MarketSnapshot,
  Position,
  SimulatedTrade,
  Strategy
} from "@ifyrt/contracts";

import { simulateFill } from "./matching-engine";

interface PortfolioState {
  cash: number;
  position: Position;
  realizedPnl: number;
  peakEquity: number;
  maxDrawdownPct: number;
}

function buildSyntheticSnapshotFromCandle(exchange: BacktestRequest["exchange"], symbol: string, candle: Candle): MarketSnapshot {
  const spread = Math.max(candle.close * 0.0005, 0.01);
  const mid = candle.close;
  const asks = [1, 2, 3, 4, 5].map((step) => [mid + spread * step, 0.5] as [number, number]);
  const bids = [1, 2, 3, 4, 5].map((step) => [mid - spread * step, 0.5] as [number, number]);

  return {
    exchange,
    symbol,
    bid: bids[0][0],
    ask: asks[0][0],
    last: candle.close,
    volume_24h: candle.volume,
    timestamp: candle.timestamp,
    order_book: {
      bids,
      asks
    }
  };
}

function markToMarket(position: Position, lastPrice: number): number {
  if (!position.open || !position.entry_price) {
    return 0;
  }

  return (lastPrice - position.entry_price) * position.quantity;
}

function portfolioEquity(state: PortfolioState, lastPrice: number): number {
  return state.cash + (state.position.open ? state.position.quantity * lastPrice : 0);
}

function updateDrawdown(state: PortfolioState, currentEquity: number): void {
  state.peakEquity = Math.max(state.peakEquity, currentEquity);

  if (state.peakEquity === 0) {
    return;
  }

  const drawdownPct = ((state.peakEquity - currentEquity) / state.peakEquity) * 100;
  state.maxDrawdownPct = Math.max(state.maxDrawdownPct, drawdownPct);
}

export function simulateBacktest(request: BacktestRequest, strategy: Strategy): BacktestResult {
  const simulationId = request.simulation_id ?? crypto.randomUUID();
  const fills: Fill[] = [];
  const trades: SimulatedTrade[] = [];
  const state: PortfolioState = {
    cash: request.initial_cash,
    position: {
      open: false,
      side: null,
      entry_price: null,
      quantity: 0,
      unrealized_pnl: 0
    },
    realizedPnl: 0,
    peakEquity: request.initial_cash,
    maxDrawdownPct: 0
  };

  let lastSignal: BacktestResult["last_signal"];

  request.candles.forEach((candle, index) => {
    const candleHistory = request.candles.slice(0, index + 1);
    const snapshot = request.snapshots?.[index] ?? buildSyntheticSnapshotFromCandle(request.exchange, request.symbol, candle);
    state.position.unrealized_pnl = markToMarket(state.position, snapshot.last);

    const signal = strategy.onTick(candleHistory, state.position);
    lastSignal = signal;

    if (signal.side === "hold") {
      const equity = portfolioEquity(state, snapshot.last);
      updateDrawdown(state, equity);
      return;
    }

    const fill = simulateFill(signal, snapshot, request.fee_bps);
    fills.push(fill);

    if (fill.status === "rejected" || fill.status === "pending" || fill.status === "ignored" || fill.filled_quantity === 0) {
      const equity = portfolioEquity(state, snapshot.last);
      updateDrawdown(state, equity);
      return;
    }

    const tradeSide = signal.side;
    const fillValue = fill.fill_price * fill.filled_quantity;
    const tradeId = crypto.randomUUID();
    let pnl = 0;

    if (tradeSide === "buy") {
      if (state.position.open) {
        const equity = portfolioEquity(state, snapshot.last);
        updateDrawdown(state, equity);
        return;
      }

      const totalCost = fillValue + fill.fee;
      if (totalCost > state.cash) {
        const equity = portfolioEquity(state, snapshot.last);
        updateDrawdown(state, equity);
        return;
      }

      state.cash -= totalCost;
      state.position = {
        open: true,
        side: "long",
        entry_price: fill.fill_price,
        quantity: fill.filled_quantity,
        unrealized_pnl: 0
      };
    } else {
      if (!state.position.open || !state.position.entry_price) {
        const equity = portfolioEquity(state, snapshot.last);
        updateDrawdown(state, equity);
        return;
      }

      const grossProceeds = fillValue;
      pnl = (fill.fill_price - state.position.entry_price) * fill.filled_quantity - fill.fee;
      state.cash += grossProceeds - fill.fee;
      state.realizedPnl += pnl;
      state.position = {
        open: false,
        side: null,
        entry_price: null,
        quantity: 0,
        unrealized_pnl: 0
      };
    }

    trades.push({
      trade_id: tradeId,
      simulation_id: simulationId,
      user_id: request.user_id,
      strategy: strategy.name,
      symbol: request.symbol,
      exchange: request.exchange,
      side: tradeSide,
      type: fill.type,
      quantity: fill.filled_quantity,
      fill_price: fill.fill_price,
      fee: fill.fee,
      slippage: fill.slippage,
      pnl,
      executed_at: fill.timestamp
    });

    state.position.unrealized_pnl = markToMarket(state.position, snapshot.last);
    const equity = portfolioEquity(state, snapshot.last);
    updateDrawdown(state, equity);
  });

  const finalCandle = request.candles.at(-1)!;
  const finalSnapshot =
    request.snapshots?.at(-1) ?? buildSyntheticSnapshotFromCandle(request.exchange, request.symbol, finalCandle);

  if (request.close_on_complete && state.position.open) {
    const exitFill = simulateFill(
      {
        side: "sell",
        type: "market",
        quantity: state.position.quantity,
        reason: "Auto-close at end of backtest"
      },
      finalSnapshot,
      request.fee_bps
    );
    fills.push(exitFill);

    if (state.position.entry_price && exitFill.filled_quantity > 0) {
      const pnl = (exitFill.fill_price - state.position.entry_price) * exitFill.filled_quantity - exitFill.fee;
      state.cash += exitFill.fill_price * exitFill.filled_quantity - exitFill.fee;
      state.realizedPnl += pnl;
      trades.push({
        trade_id: crypto.randomUUID(),
        simulation_id: simulationId,
        user_id: request.user_id,
        strategy: strategy.name,
        symbol: request.symbol,
        exchange: request.exchange,
        side: "sell",
        type: exitFill.type,
        quantity: exitFill.filled_quantity,
        fill_price: exitFill.fill_price,
        fee: exitFill.fee,
        slippage: exitFill.slippage,
        pnl,
        executed_at: exitFill.timestamp
      });
      state.position = {
        open: false,
        side: null,
        entry_price: null,
        quantity: 0,
        unrealized_pnl: 0
      };
    }
  }

  const endingEquity = portfolioEquity(state, finalSnapshot.last);
  const profitableTrades = trades.filter((trade) => trade.pnl > 0).length;
  const closedTrades = trades.filter((trade) => trade.side === "sell").length;

  return {
    simulation_id: simulationId,
    strategy: strategy.name,
    symbol: request.symbol,
    exchange: request.exchange,
    status: "completed",
    metrics: {
      starting_cash: request.initial_cash,
      ending_cash: state.cash,
      ending_equity: endingEquity,
      realized_pnl: state.realizedPnl,
      unrealized_pnl: state.position.unrealized_pnl,
      total_trades: trades.length,
      win_rate: closedTrades === 0 ? 0 : profitableTrades / closedTrades,
      max_drawdown_pct: state.maxDrawdownPct
    },
    trades,
    final_position: state.position,
    last_signal: lastSignal,
    fills
  };
}
