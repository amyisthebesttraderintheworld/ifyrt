import type { MarketLevel } from "@ifyrt/contracts";

export interface OrderBookWalkResult {
  averagePrice: number;
  bestPrice: number;
  filledQuantity: number;
  remainingQuantity: number;
}

export function sortLevels(levels: MarketLevel[], direction: "asc" | "desc"): MarketLevel[] {
  const modifier = direction === "asc" ? 1 : -1;
  return [...levels].sort((left, right) => (left[0] - right[0]) * modifier);
}

export function walkOrderBook(levels: MarketLevel[], quantity: number): OrderBookWalkResult {
  let remainingQuantity = quantity;
  let totalCost = 0;
  let filledQuantity = 0;

  for (const [price, size] of levels) {
    if (remainingQuantity <= 0) {
      break;
    }

    const executedQuantity = Math.min(size, remainingQuantity);
    remainingQuantity -= executedQuantity;
    filledQuantity += executedQuantity;
    totalCost += executedQuantity * price;
  }

  return {
    averagePrice: filledQuantity > 0 ? totalCost / filledQuantity : 0,
    bestPrice: levels[0]?.[0] ?? 0,
    filledQuantity,
    remainingQuantity
  };
}
