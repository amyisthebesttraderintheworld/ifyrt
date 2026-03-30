import crypto from "node:crypto";

import {
  backtestRequestSchema,
  marketSnapshotSchema,
  simulationStartRequestSchema,
  simulationStopRequestSchema,
  type Strategy
} from "@ifyrt/contracts";
import {
  createServiceApp,
  intEnv,
  logError,
  logInfo,
  optionalEnv,
  requestSignatureIsValid,
  validationError
} from "@ifyrt/service-core";
import {
  advanceRealtimeSession,
  createRealtimeSession,
  createStrategy,
  listStrategies,
  simulateBacktest,
  stopRealtimeSession,
  summarizeRealtimeSession,
  type RealtimeSimulationSession
} from "@ifyrt/simulation-core";

const serviceName = "ifyrt-sim-worker";
const internalWebhookSecret = optionalEnv("INTERNAL_WEBHOOK_SECRET");
const marketIngestorUrl = optionalEnv("MARKET_INGESTOR_URL", "http://127.0.0.1:3003");
const port = intEnv("PORT", 3001);
const simPollIntervalMs = intEnv("SIM_POLL_INTERVAL_MS", 5000);
const simInitialCash = intEnv("SIM_INITIAL_CASH", 10000);
const simFeeBps = intEnv("SIM_FEE_BPS", 10);
const simMaxCandles = intEnv("SIM_MAX_CANDLES", 250);
const app = createServiceApp(serviceName);

interface ActiveSimulation {
  session: RealtimeSimulationSession;
  strategy: Strategy;
  timeout?: NodeJS.Timeout;
}

const activeSimulations = new Map<string, ActiveSimulation>();
const activeSimulationByUser = new Map<string, string>();

app.use((req, res, next) => {
  if (!requestSignatureIsValid(req, internalWebhookSecret)) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  next();
});

app.get("/strategies", (_req, res) => {
  res.json({ strategies: listStrategies() });
});

app.get("/health/details", (_req, res) => {
  res.json({
    service: serviceName,
    status: "ok",
    timestamp: new Date().toISOString(),
    details: {
      active_simulations: activeSimulations.size,
      poll_interval_ms: simPollIntervalMs,
      market_ingestor_url: marketIngestorUrl
    }
  });
});

app.post("/backtests/run", (req, res) => {
  const parsed = backtestRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  const strategy = createStrategy(parsed.data.strategy, {
    quantity: parsed.data.trade_quantity
  });
  const result = simulateBacktest(parsed.data, strategy);

  res.json(result);
});

function strategyQuantity(name: string): number {
  return listStrategies().find((strategy) => strategy.name === name)?.default_quantity ?? 0.01;
}

async function fetchLatestSnapshot(
  exchange: RealtimeSimulationSession["exchange"],
  symbol: string
) {
  if (exchange !== "binance") {
    throw new Error(`Realtime market ingestion is currently only wired for Binance. Received ${exchange}.`);
  }

  const response = await fetch(`${marketIngestorUrl}/snapshots/latest`);
  if (!response.ok) {
    throw new Error(`Market ingestor responded with status ${response.status}.`);
  }

  const payload = (await response.json()) as { snapshots?: unknown[] };
  if (!Array.isArray(payload.snapshots)) {
    throw new Error("Market ingestor returned an invalid snapshot payload.");
  }

  return payload.snapshots
    .map((snapshot) => marketSnapshotSchema.parse(snapshot))
    .find((snapshot) => snapshot.exchange === exchange && snapshot.symbol === symbol);
}

function scheduleNextTick(simulationId: string): void {
  const active = activeSimulations.get(simulationId);
  if (!active || active.session.status !== "running") {
    return;
  }

  active.timeout = setTimeout(() => {
    void runRealtimeTick(simulationId);
  }, simPollIntervalMs);
}

async function runRealtimeTick(simulationId: string): Promise<void> {
  const active = activeSimulations.get(simulationId);
  if (!active || active.session.status !== "running") {
    return;
  }

  try {
    const snapshot = await fetchLatestSnapshot(active.session.exchange, active.session.symbol);
    const current = activeSimulations.get(simulationId);
    if (!snapshot || !current || current.session.status !== "running") {
      if (!snapshot) {
        logError(serviceName, "No matching market snapshot available for active simulation", {
          simulation_id: simulationId,
          exchange: active.session.exchange,
          symbol: active.session.symbol
        });
      }
      return;
    }

    const beforeTrades = current.session.trades.length;
    const summary = advanceRealtimeSession(current.session, snapshot, current.strategy);

    if (summary.trades.length > beforeTrades) {
      logInfo(serviceName, "Realtime simulation executed trade", {
        simulation_id: simulationId,
        total_trades: summary.trades.length,
        current_equity: summary.metrics.current_equity,
        unrealized_pnl: summary.metrics.unrealized_pnl
      });
    }
  } catch (error) {
    logError(serviceName, "Realtime simulation tick failed", {
      simulation_id: simulationId,
      error: error instanceof Error ? error.message : "unknown_error"
    });
  } finally {
    scheduleNextTick(simulationId);
  }
}

app.post("/simulations/start", (req, res) => {
  const parsed = simulationStartRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  if (activeSimulationByUser.has(parsed.data.user_id)) {
    res.status(409).json({
      accepted: false,
      reason: "User already has an active realtime simulation. Stop it before starting a new one."
    });
    return;
  }

  try {
    const quantity = strategyQuantity(parsed.data.strategy);
    const strategy = createStrategy(parsed.data.strategy, {
      quantity
    });
    const session = createRealtimeSession({
      simulation_id: crypto.randomUUID(),
      user_id: parsed.data.user_id,
      strategy: parsed.data.strategy,
      symbol: parsed.data.symbol,
      exchange: parsed.data.exchange,
      trade_quantity: quantity,
      initial_cash: simInitialCash,
      fee_bps: simFeeBps,
      max_candles: simMaxCandles
    });

    activeSimulations.set(session.simulation_id, {
      session,
      strategy
    });
    activeSimulationByUser.set(session.user_id, session.simulation_id);

    logInfo(serviceName, "Realtime simulation started", {
      simulation_id: session.simulation_id,
      user_id: session.user_id,
      strategy: session.strategy,
      symbol: session.symbol,
      exchange: session.exchange
    });

    void runRealtimeTick(session.simulation_id);
    res.json({
      accepted: true,
      summary: summarizeRealtimeSession(session)
    });
  } catch (error) {
    res.status(400).json({
      accepted: false,
      reason: error instanceof Error ? error.message : "Failed to start realtime simulation."
    });
  }
});

app.post("/simulations/stop", (req, res) => {
  const parsed = simulationStopRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  const active = activeSimulations.get(parsed.data.simulation_id);
  if (!active || active.session.user_id !== parsed.data.user_id) {
    res.status(404).json({
      accepted: false,
      reason: "No active realtime simulation found for that user and simulation id."
    });
    return;
  }

  if (active.timeout) {
    clearTimeout(active.timeout);
  }

  const summary = stopRealtimeSession(active.session);
  activeSimulations.delete(parsed.data.simulation_id);
  activeSimulationByUser.delete(parsed.data.user_id);

  logInfo(serviceName, "Realtime simulation stopped", {
    simulation_id: parsed.data.simulation_id,
    user_id: parsed.data.user_id,
    realized_pnl: summary.metrics.realized_pnl,
    current_equity: summary.metrics.current_equity,
    total_trades: summary.metrics.total_trades
  });

  res.json({
    accepted: true,
    summary
  });
});

app.listen(port, () => {
  logInfo(serviceName, "Service listening", {
    port,
    market_ingestor_url: marketIngestorUrl,
    sim_poll_interval_ms: simPollIntervalMs
  });
});

process.on("SIGTERM", () => {
  activeSimulations.forEach((active) => {
    if (active.timeout) {
      clearTimeout(active.timeout);
    }
  });
});
