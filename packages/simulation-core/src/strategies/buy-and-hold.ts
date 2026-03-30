import type { Candle, OrderSignal, Position, Strategy } from "@ifyrt/contracts";

export function createBuyAndHoldStrategy(quantity: number): Strategy {
  return {
    name: "buy-and-hold",
    onTick(candles: Candle[], position: Position): OrderSignal {
      if (candles.length === 1 && !position.open) {
        return {
          side: "buy",
          type: "market",
          quantity,
          reason: "Open long position on first candle"
        };
      }

      return {
        side: "hold",
        type: "market",
        quantity,
        reason: "Hold until completion"
      };
    }
  };
}
