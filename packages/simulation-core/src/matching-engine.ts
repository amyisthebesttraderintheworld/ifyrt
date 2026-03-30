import type { Fill, MarketLevel, MarketSnapshot, OrderSignal } from "@ifyrt/contracts";

import { sortLevels, walkOrderBook } from "./order-book";

function contraBook(signal: OrderSignal, snapshot: MarketSnapshot): MarketLevel[] {
  return signal.side === "buy"
    ? sortLevels(snapshot.order_book.asks, "asc")
    : sortLevels(snapshot.order_book.bids, "desc");
}

export function simulateFill(signal: OrderSignal, snapshot: MarketSnapshot, feeBps: number): Fill {
  const timestamp = snapshot.timestamp;

  if (signal.side === "hold") {
    return {
      side: "buy",
      type: signal.type,
      status: "ignored",
      requested_quantity: signal.quantity,
      filled_quantity: 0,
      requested_price: signal.price,
      fill_price: 0,
      best_price: 0,
      fee: 0,
      slippage: 0,
      timestamp,
      reason: signal.reason ?? "No action requested"
    };
  }

  const book = contraBook(signal, snapshot);
  const bestPrice = book[0]?.[0] ?? 0;

  if (book.length === 0) {
    return {
      side: signal.side,
      type: signal.type,
      status: "rejected",
      requested_quantity: signal.quantity,
      filled_quantity: 0,
      requested_price: signal.price,
      fill_price: 0,
      best_price: 0,
      fee: 0,
      slippage: 0,
      timestamp,
      reason: "No market depth available"
    };
  }

  if (signal.type === "limit" && signal.price !== undefined) {
    const eligibleLevels = book.filter(([price]) =>
      signal.side === "buy" ? price <= signal.price! : price >= signal.price!
    );

    if (eligibleLevels.length === 0) {
      return {
        side: signal.side,
        type: signal.type,
        status: "pending",
        requested_quantity: signal.quantity,
        filled_quantity: 0,
        requested_price: signal.price,
        fill_price: 0,
        best_price: bestPrice,
        fee: 0,
        slippage: 0,
        timestamp,
        reason: "Limit price not crossed"
      };
    }

    const walked = walkOrderBook(eligibleLevels, signal.quantity);
    const fillPrice = walked.averagePrice;
    const fee = (fillPrice * walked.filledQuantity * feeBps) / 10_000;
    const slippage = bestPrice > 0 ? Math.abs(fillPrice - bestPrice) / bestPrice : 0;

    return {
      side: signal.side,
      type: signal.type,
      status: walked.remainingQuantity > 0 ? "partial" : "filled",
      requested_quantity: signal.quantity,
      filled_quantity: walked.filledQuantity,
      requested_price: signal.price,
      fill_price: fillPrice,
      best_price: bestPrice,
      fee,
      slippage,
      timestamp,
      reason: walked.remainingQuantity > 0 ? "Insufficient depth within limit price" : signal.reason
    };
  }

  const walked = walkOrderBook(book, signal.quantity);
  const fillPrice = walked.averagePrice;
  const fee = (fillPrice * walked.filledQuantity * feeBps) / 10_000;
  const slippage = bestPrice > 0 ? Math.abs(fillPrice - bestPrice) / bestPrice : 0;

  return {
    side: signal.side,
    type: signal.type,
    status: walked.remainingQuantity > 0 ? "partial" : "filled",
    requested_quantity: signal.quantity,
    filled_quantity: walked.filledQuantity,
    requested_price: signal.price,
    fill_price: fillPrice,
    best_price: bestPrice,
    fee,
    slippage,
    timestamp,
    reason: walked.remainingQuantity > 0 ? "Insufficient depth in order book" : signal.reason
  };
}
