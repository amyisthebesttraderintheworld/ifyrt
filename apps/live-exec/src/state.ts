import crypto from "node:crypto";

import type {
  CircuitBreakerResetRequest,
  CircuitBreakerResponse,
  CircuitBreakerState,
  CircuitBreakerTriggerRequest,
  LiveOrderRequest,
  LiveOrderResponse,
  LiveSession,
  LiveSessionDisableRequest,
  LiveSessionDisableResponse,
  LiveSessionEnableRequest,
  LiveSessionEnableResponse
} from "@ifyrt/contracts";

export interface LiveExecStore {
  sessionsByUser: Map<string, LiveSession>;
  circuitBreakersByUser: Map<string, CircuitBreakerState>;
}

function timestamp(now: Date): string {
  return now.toISOString();
}

export function createLiveExecStore(): LiveExecStore {
  return {
    sessionsByUser: new Map<string, LiveSession>(),
    circuitBreakersByUser: new Map<string, CircuitBreakerState>()
  };
}

export function getCircuitBreakerState(store: LiveExecStore, userId: string): CircuitBreakerState {
  return store.circuitBreakersByUser.get(userId) ?? {
    user_id: userId,
    active: false
  };
}

export function enableLiveSession(
  store: LiveExecStore,
  request: LiveSessionEnableRequest,
  now = new Date()
): LiveSessionEnableResponse {
  const breaker = getCircuitBreakerState(store, request.user_id);
  if (breaker.active) {
    return {
      accepted: false,
      reason: "Live trading is blocked until the circuit breaker is reset.",
      circuit_breaker: breaker
    };
  }

  const existing = store.sessionsByUser.get(request.user_id);
  if (existing?.status === "active") {
    const sameSession =
      existing.exchange === request.exchange &&
      existing.symbol === request.symbol &&
      existing.strategy === request.strategy &&
      existing.key_reference === request.key_reference;

    return {
      accepted: sameSession,
      reason: sameSession ? undefined : "User already has an active live session.",
      session: existing,
      circuit_breaker: breaker
    };
  }

  const session: LiveSession = {
    session_id: crypto.randomUUID(),
    user_id: request.user_id,
    exchange: request.exchange,
    symbol: request.symbol,
    strategy: request.strategy,
    status: "active",
    started_at: timestamp(now),
    key_reference: request.key_reference
  };

  store.sessionsByUser.set(request.user_id, session);
  return {
    accepted: true,
    session,
    circuit_breaker: breaker
  };
}

export function disableLiveSession(
  store: LiveExecStore,
  request: LiveSessionDisableRequest,
  now = new Date()
): LiveSessionDisableResponse {
  const breaker = getCircuitBreakerState(store, request.user_id);
  const existing = store.sessionsByUser.get(request.user_id);

  if (!existing || existing.status !== "active") {
    return {
      accepted: true,
      reason: "No active live session to stop.",
      circuit_breaker: breaker
    };
  }

  if (request.session_id && request.session_id !== existing.session_id) {
    return {
      accepted: false,
      reason: "Active live session id does not match the disable request.",
      session: existing,
      circuit_breaker: breaker
    };
  }

  const session: LiveSession = {
    ...existing,
    status: "stopped",
    stopped_at: timestamp(now),
    stop_reason: request.reason ?? "user_requested"
  };

  store.sessionsByUser.delete(request.user_id);
  return {
    accepted: true,
    session,
    circuit_breaker: breaker
  };
}

export function tripCircuitBreaker(
  store: LiveExecStore,
  request: CircuitBreakerTriggerRequest,
  now = new Date()
): CircuitBreakerResponse {
  const breaker: CircuitBreakerState = {
    user_id: request.user_id,
    active: true,
    reason: request.reason,
    drawdown_pct: request.drawdown_pct,
    triggered_at: timestamp(now)
  };

  store.circuitBreakersByUser.set(request.user_id, breaker);

  const existing = store.sessionsByUser.get(request.user_id);
  if (!existing || existing.status !== "active") {
    return {
      accepted: true,
      breaker
    };
  }

  const session: LiveSession = {
    ...existing,
    status: "circuit_broken",
    stopped_at: timestamp(now),
    stop_reason: request.reason
  };

  store.sessionsByUser.delete(request.user_id);
  return {
    accepted: true,
    breaker,
    session
  };
}

export function resetCircuitBreaker(
  store: LiveExecStore,
  request: CircuitBreakerResetRequest,
  now = new Date()
): CircuitBreakerResponse {
  const breaker: CircuitBreakerState = {
    user_id: request.user_id,
    active: false,
    reason: request.reason,
    reset_at: timestamp(now)
  };

  store.circuitBreakersByUser.set(request.user_id, breaker);
  return {
    accepted: true,
    breaker
  };
}

export function evaluateLiveOrder(
  store: LiveExecStore,
  request: LiveOrderRequest
): LiveOrderResponse {
  const breaker = getCircuitBreakerState(store, request.context.user_id);
  if (breaker.active) {
    return {
      accepted: false,
      reason: "Live trading is blocked until the circuit breaker is reset.",
      circuit_breaker: breaker
    };
  }

  const session = store.sessionsByUser.get(request.context.user_id);
  if (!session || session.status !== "active") {
    return {
      accepted: false,
      reason: "No active live session is available for that user.",
      circuit_breaker: breaker
    };
  }

  if (session.session_id !== request.context.live_session_id) {
    return {
      accepted: false,
      reason: "Live session id does not match the active user session.",
      session,
      circuit_breaker: breaker
    };
  }

  if (session.exchange !== request.context.exchange || session.symbol !== request.context.symbol) {
    return {
      accepted: false,
      reason: "Live order context does not match the active session market.",
      session,
      circuit_breaker: breaker
    };
  }

  return {
    accepted: false,
    reason: "Live exchange adapters are not configured yet.",
    session,
    circuit_breaker: breaker
  };
}

export function activeLiveSessionCount(store: LiveExecStore): number {
  return store.sessionsByUser.size;
}

export function activeCircuitBreakerCount(store: LiveExecStore): number {
  return Array.from(store.circuitBreakersByUser.values()).filter((breaker) => breaker.active).length;
}
