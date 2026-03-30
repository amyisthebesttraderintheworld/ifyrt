import WebSocket from "ws";

import type { MarketSnapshot } from "@ifyrt/contracts";
import { createServiceApp, csvEnv, intEnv, logError, logInfo } from "@ifyrt/service-core";

const serviceName = "ifyrt-market-ingestor";
const port = intEnv("PORT", 3003);
const symbols = csvEnv("MARKET_SYMBOLS", ["btcusdt"]);
const app = createServiceApp(serviceName);
const latestSnapshots = new Map<string, MarketSnapshot>();
let lastMessageAt: string | null = null;
let socket: WebSocket | undefined;

function normalizeSymbol(symbol: string): string {
  return symbol.replace(/[\/_-]/g, "").toUpperCase();
}

function startStream(): void {
  if (symbols.length === 0) {
    return;
  }

  const streamPath = symbols.map((symbol) => `${symbol.toLowerCase()}@bookTicker`).join("/");
  socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streamPath}`);

  socket.on("open", () => {
    logInfo(serviceName, "Connected to Binance bookTicker stream", { symbols });
  });

  socket.on("message", (rawMessage) => {
    try {
      const parsed = JSON.parse(rawMessage.toString()) as {
        data?: {
          s: string;
          b: string;
          B: string;
          a: string;
          A: string;
        };
      };
      const message = parsed.data;
      if (!message) {
        return;
      }

      const bid = Number(message.b);
      const ask = Number(message.a);
      const bidSize = Number(message.B);
      const askSize = Number(message.A);
      const snapshot: MarketSnapshot = {
        exchange: "binance",
        symbol: normalizeSymbol(message.s),
        bid,
        ask,
        last: (bid + ask) / 2,
        volume_24h: 0,
        timestamp: new Date().toISOString(),
        order_book: {
          bids: [[bid, bidSize]],
          asks: [[ask, askSize]]
        }
      };

      latestSnapshots.set(snapshot.symbol, snapshot);
      lastMessageAt = snapshot.timestamp;
    } catch (error) {
      logError(serviceName, "Failed to parse market stream payload", {
        error: error instanceof Error ? error.message : "unknown_error"
      });
    }
  });

  socket.on("close", () => {
    logError(serviceName, "Market stream disconnected, retrying in 5s");
    setTimeout(startStream, 5000);
  });

  socket.on("error", (error) => {
    logError(serviceName, "Market stream error", {
      error: error instanceof Error ? error.message : "unknown_error"
    });
  });
}

app.get("/health/details", (_req, res) => {
  res.json({
    service: serviceName,
    status: lastMessageAt ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    details: {
      symbols: Array.from(latestSnapshots.keys()),
      last_message_at: lastMessageAt
    }
  });
});

app.get("/snapshots/latest", (_req, res) => {
  res.json({
    snapshots: Array.from(latestSnapshots.values())
  });
});

app.listen(port, () => {
  logInfo(serviceName, "Service listening", { port, symbols });
  startStream();
});

process.on("SIGTERM", () => {
  socket?.close();
});
