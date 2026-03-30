import type { Candle, OrderSignal, Position, Strategy } from "@ifyrt/contracts";

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function createSmaCrossoverStrategy(quantity: number, fastPeriod = 5, slowPeriod = 20): Strategy {
  return {
    name: "sma-crossover",
    onTick(candles: Candle[], position: Position): OrderSignal {
      if (candles.length < slowPeriod) {
        return {
          side: "hold",
          type: "market",
          quantity,
          reason: "Waiting for enough candles"
        };
      }

      const closes = candles.map((candle) => candle.close);
      const fast = average(closes.slice(-fastPeriod));
      const slow = average(closes.slice(-slowPeriod));

      if (!position.open && fast > slow) {
        return {
          side: "buy",
          type: "market",
          quantity,
          reason: `Fast SMA ${fast.toFixed(2)} crossed above slow SMA ${slow.toFixed(2)}`
        };
      }

      if (position.open && fast < slow) {
        return {
          side: "sell",
          type: "market",
          quantity: position.quantity || quantity,
          reason: `Fast SMA ${fast.toFixed(2)} crossed below slow SMA ${slow.toFixed(2)}`
        };
      }

      return {
        side: "hold",
        type: "market",
        quantity,
        reason: "Trend unchanged"
      };
    }
  };
}
