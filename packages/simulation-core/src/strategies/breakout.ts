import type { Candle, OrderSignal, Position, Strategy } from "@ifyrt/contracts";

export function createBreakoutStrategy(quantity: number, lookback = 10): Strategy {
  return {
    name: "breakout",
    onTick(candles: Candle[], position: Position): OrderSignal {
      if (candles.length <= lookback) {
        return {
          side: "hold",
          type: "market",
          quantity,
          reason: "Waiting for breakout window"
        };
      }

      const history = candles.slice(-(lookback + 1), -1);
      const current = candles.at(-1)!;
      const breakoutHigh = Math.max(...history.map((candle) => candle.high));
      const breakoutLow = Math.min(...history.map((candle) => candle.low));

      if (!position.open && current.close > breakoutHigh) {
        return {
          side: "buy",
          type: "market",
          quantity,
          reason: `Close broke above ${breakoutHigh.toFixed(2)}`
        };
      }

      if (position.open && current.close < breakoutLow) {
        return {
          side: "sell",
          type: "market",
          quantity: position.quantity || quantity,
          reason: `Close broke below ${breakoutLow.toFixed(2)}`
        };
      }

      return {
        side: "hold",
        type: "market",
        quantity,
        reason: "No breakout"
      };
    }
  };
}
