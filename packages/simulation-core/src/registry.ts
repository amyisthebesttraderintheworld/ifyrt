import type { Strategy, StrategyListItem } from "@ifyrt/contracts";

import { createBreakoutStrategy } from "./strategies/breakout";
import { createBuyAndHoldStrategy } from "./strategies/buy-and-hold";
import { createSmaCrossoverStrategy } from "./strategies/sma-crossover";

export interface StrategyFactoryOptions {
  quantity: number;
}

const strategyDescriptions: StrategyListItem[] = [
  {
    name: "buy-and-hold",
    description: "Opens once and holds until the backtest completes.",
    default_quantity: 0.01
  },
  {
    name: "sma-crossover",
    description: "Buys when the fast moving average crosses above the slow average.",
    default_quantity: 0.01
  },
  {
    name: "breakout",
    description: "Buys breakouts above recent highs and exits below recent lows.",
    default_quantity: 0.01
  }
];

export function createStrategy(name: string, options: StrategyFactoryOptions): Strategy {
  switch (name) {
    case "buy-and-hold":
      return createBuyAndHoldStrategy(options.quantity);
    case "sma-crossover":
      return createSmaCrossoverStrategy(options.quantity);
    case "breakout":
      return createBreakoutStrategy(options.quantity);
    default:
      throw new Error(`Unknown strategy: ${name}`);
  }
}

export function listStrategies(): StrategyListItem[] {
  return strategyDescriptions;
}
