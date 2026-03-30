import {
  circuitBreakerResetRequestSchema,
  circuitBreakerTriggerRequestSchema,
  liveOrderRequestSchema,
  liveSessionDisableRequestSchema,
  liveSessionEnableRequestSchema
} from "@ifyrt/contracts";
import {
  createServiceApp,
  intEnv,
  logInfo,
  optionalEnv,
  requestSignatureIsValid,
  validationError
} from "@ifyrt/service-core";

import {
  activeCircuitBreakerCount,
  activeLiveSessionCount,
  createLiveExecStore,
  disableLiveSession,
  enableLiveSession,
  evaluateLiveOrder,
  resetCircuitBreaker,
  tripCircuitBreaker
} from "./state";

const serviceName = "ifyrt-live-exec";
const internalWebhookSecret = optionalEnv("INTERNAL_WEBHOOK_SECRET");
const port = intEnv("PORT", 3002);
const app = createServiceApp(serviceName);
const store = createLiveExecStore();

app.use((req, res, next) => {
  if (!requestSignatureIsValid(req, internalWebhookSecret)) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  next();
});

app.get("/health/details", (_req, res) => {
  res.json({
    service: serviceName,
    status: "ok",
    timestamp: new Date().toISOString(),
    details: {
      active_live_sessions: activeLiveSessionCount(store),
      active_circuit_breakers: activeCircuitBreakerCount(store)
    }
  });
});

app.post("/sessions/enable", (req, res) => {
  const parsed = liveSessionEnableRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  if (parsed.data.tier !== "paid") {
    res.status(403).json({
      accepted: false,
      reason: "Paid tier required for live trading."
    });
    return;
  }

  const response = enableLiveSession(store, parsed.data);
  if (!response.accepted) {
    const status = response.reason?.includes("circuit breaker") ? 423 : 409;
    res.status(status).json(response);
    return;
  }

  logInfo(serviceName, "Live session enabled", {
    user_id: parsed.data.user_id,
    exchange: parsed.data.exchange,
    symbol: parsed.data.symbol,
    strategy: parsed.data.strategy,
    session_id: response.session?.session_id
  });

  res.json(response);
});

app.post("/sessions/disable", (req, res) => {
  const parsed = liveSessionDisableRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  const response = disableLiveSession(store, parsed.data);
  if (!response.accepted) {
    res.status(409).json(response);
    return;
  }

  logInfo(serviceName, "Live session disabled", {
    user_id: parsed.data.user_id,
    session_id: response.session?.session_id,
    reason: response.session?.stop_reason ?? response.reason
  });

  res.json(response);
});

app.post("/circuit-breakers/trigger", (req, res) => {
  const parsed = circuitBreakerTriggerRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  const response = tripCircuitBreaker(store, parsed.data);
  logInfo(serviceName, "Circuit breaker triggered", {
    user_id: parsed.data.user_id,
    reason: parsed.data.reason,
    drawdown_pct: parsed.data.drawdown_pct,
    session_id: response.session?.session_id
  });

  res.json(response);
});

app.post("/circuit-breakers/reset", (req, res) => {
  const parsed = circuitBreakerResetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  const response = resetCircuitBreaker(store, parsed.data);
  logInfo(serviceName, "Circuit breaker reset", {
    user_id: parsed.data.user_id,
    reason: parsed.data.reason
  });

  res.json(response);
});

app.post("/orders/execute", (req, res) => {
  const parsed = liveOrderRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  const response = evaluateLiveOrder(store, parsed.data);
  if (response.accepted) {
    res.json(response);
    return;
  }

  if (response.reason === "Live exchange adapters are not configured yet.") {
    res.status(501).json(response);
    return;
  }

  const status = response.reason?.includes("circuit breaker") ? 423 : 409;
  res.status(status).json(response);
});

app.listen(port, () => {
  logInfo(serviceName, "Service listening", { port });
});
