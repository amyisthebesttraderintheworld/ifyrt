# Ifyrt / TriFi — Clean Design Specification

## 1) Product Summary

Ifyrt is a Telegram-native automated trading simulation platform with strict separation between simulation and live execution. The core product is deterministic, high-fidelity backtesting and real-time simulation driven by public market data. Live trading is isolated behind paid access, secure key management, and circuit breakers. Optional web dashboard and copy-trading features complement Telegram but do not replace it.

### Primary goals
- Make Telegram the authoritative control surface.
- Make simulation and live execution share the same execution contract.
- Make backtests deterministic, reproducible, and high fidelity.
- Keep all real-funds activity isolated from simulation.
- Support multi-tenant operation with clean user separation.
- Support a subscription model with a 7-day free trial and a $6.99/month paid tier.

### Non-goals
- No hidden business logic in the bot layer.
- No direct service-to-service coupling outside the event layer and shared data stores.
- No mixing of simulated and live trade records.
- No reliance on the dashboard for core product operation.

---

## 2) System Architecture

Design the platform as a distributed, event-driven system with independently scalable services.

### Core services
1. Telegram Bot Gateway
2. n8n Automation Hub
3. API Gateway / Auth Layer
4. Market Data Ingestor
5. Simulation Engine
6. Live Trading Execution Engine
7. Strategy Runtime Layer
8. Secure Key Management
9. Persistence Layer
10. Event Bus / Queueing Layer
11. Optional Dashboard Layer
12. Copy-Trading Simulation Layer
13. Payments / Subscription Service

### Recommended stack
- Hosting / compute: Railway
- Database / auth / realtime / storage: Supabase
- Automation / routing: n8n
- Optional dashboard frontend: Vercel
- Payments: Stripe
- Secret storage: Supabase Vault + Railway env vars
- Internal transport: HTTP webhooks + Supabase Realtime + queue/event bus

### Design rule
All control and routing begins in Telegram, is normalized into an internal event object, and is then routed by n8n to the appropriate service. Services write results back to Supabase and notify the user through Telegram.

---

## 3) Telegram Control Plane

Telegram is the authoritative interface for all product actions.

### Supported commands
- `/start` — onboard user
- `/help` — show command list
- `/backtest` — run historical backtest
- `/simulate` — start real-time paper simulation
- `/sim_stop` — stop active simulation
- `/status` — show active sims, PnL, subscription state
- `/live_on` — enable live trading
- `/live_off` — disable live trading
- `/copy` — simulate a peer’s strategy
- `/copy_stop` — stop copy simulation
- `/subscribe` — view/manage subscription
- `/dashboard` — get dashboard link
- `/strategies` — list available strategies
- `/setkey` — securely submit exchange API key

### Bot responsibilities
The bot must only:
- parse Telegram input
- validate basic command shape
- build a structured event
- POST that event to n8n
- send immediate acknowledgement or error replies

The bot must not:
- query product databases
- enforce subscription rules
- run strategies
- execute trades
- contain strategy-specific logic

### Event contract
Every command becomes one standard internal event.

```ts
export interface IfyrtEvent {
  event_id: string;
  event_type: EventType;
  timestamp: string;
  source: "telegram";
  user: {
    telegram_id: number;
    username: string | null;
    first_name: string;
  };
  payload: Record<string, unknown>;
  raw_text: string;
  chat_id: number;
  message_id: number;
}

export type EventType =
  | "user.start"
  | "user.help"
  | "backtest.request"
  | "simulation.start"
  | "simulation.stop"
  | "user.status"
  | "live.enable"
  | "live.disable"
  | "copy.start"
  | "copy.stop"
  | "subscription.view"
  | "dashboard.request"
  | "strategy.list"
  | "key.submit";
```

### Bot gateway deployment
- Stateless Express server
- Telegram webhook endpoint
- Immediate 200 response to Telegram
- Dispatch event to n8n asynchronously
- Optional local reply helpers for confirmation and errors

---

## 4) n8n Automation Hub

n8n is the central routing and orchestration layer.

### Responsibilities
- Receive all Telegram-originated events
- Validate internal request authenticity
- Perform subscription and access checks
- Route events to the correct Railway service
- Write state changes and results to Supabase
- Send Telegram replies and alerts
- Handle retries and operational failures

### Core workflows
1. Gateway router
2. User onboarding
3. Subscription gate
4. Backtest request
5. Real-time simulation start/stop
6. Live trading enable/disable
7. Copy-trading start/stop
8. Status aggregation
9. Payment / subscription sync
10. Error handling and audit logging

### Routing contract
- `user.*` → onboarding/status/subscription flows
- `backtest.request` → simulation worker
- `simulation.start` / `simulation.stop` → simulation worker
- `live.enable` / `live.disable` → live execution engine
- `copy.start` / `copy.stop` → copy worker
- `strategy.*` → strategy registry / metadata service
- `dashboard.request` → dashboard link issuance
- `key.submit` → secure key flow

### Subscription gate
A reusable sub-workflow must enforce:
- free tier: backtesting only
- trial tier: simulation + limited platform access
- paid tier: full access, including live trading and dashboard

If access is denied, the workflow must reply to the user and stop the parent workflow.

---

## 5) Identity, Auth, and Access Control

### Identity model
- Telegram ID is the external identity anchor
- Internal users are represented by UUID primary keys
- Supabase is the source of truth for user records
- JWTs are used for short-lived internal authorization between services

### JWT payload
```ts
interface IfyrtJWTPayload {
  sub: string;          // internal user UUID
  telegram_id: number;
  tier: "free" | "trial" | "paid";
  live_mode: boolean;
  iat: number;
  exp: number;
}
```

### Auth rules
- Every worker verifies JWT before serving requests
- Paid-only endpoints require `tier === "paid"`
- Trial-or-paid endpoints require `tier === "trial" || tier === "paid"`
- Live trading requires paid tier plus a valid API key
- Rate limits must be applied per user, not just per IP

### User table
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id     BIGINT UNIQUE NOT NULL,
  username        TEXT,
  first_name      TEXT NOT NULL,
  live_mode       BOOLEAN NOT NULL DEFAULT false,
  copy_enabled    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
```

### Subscriptions table
```sql
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier          TEXT NOT NULL DEFAULT 'free'
                  CHECK (tier IN ('free', 'trial', 'paid')),
  trial_start   TIMESTAMPTZ,
  trial_end     TIMESTAMPTZ,
  paid_since    TIMESTAMPTZ,
  paid_until    TIMESTAMPTZ,
  stripe_customer_id  TEXT,
  stripe_sub_id       TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
```

---

## 6) Market Data Layer

The platform uses real public exchange market data for simulation fidelity.

### Requirements
- Ingest public WebSocket market data
- Use REST fallback on WebSocket failure
- Normalize exchange-specific schemas into a unified internal format
- Persist both snapshots and historical data
- Support multiple exchanges and symbols
- Reconstruct order book state as needed for simulation fidelity

### Unified market snapshot
```ts
export interface MarketSnapshot {
  id?: string;
  exchange: "binance" | "bybit";
  symbol: string;        // e.g. BTC/USDT
  bid: number;
  ask: number;
  last: number;
  volume_24h: number;
  timestamp: string;
  order_book: {
    bids: [number, number][];
    asks: [number, number][];
  };
}
```

### Market tables
```sql
CREATE TABLE market_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange    TEXT NOT NULL,
  symbol      TEXT NOT NULL,
  bid         NUMERIC NOT NULL,
  ask         NUMERIC NOT NULL,
  last        NUMERIC NOT NULL,
  volume_24h  NUMERIC,
  order_book  JSONB NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_snapshots_symbol_time
  ON market_snapshots(exchange, symbol, captured_at DESC);

CREATE TABLE ohlcv (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange    TEXT NOT NULL,
  symbol      TEXT NOT NULL,
  interval    TEXT NOT NULL,
  open_time   TIMESTAMPTZ NOT NULL,
  open        NUMERIC NOT NULL,
  high        NUMERIC NOT NULL,
  low         NUMERIC NOT NULL,
  close       NUMERIC NOT NULL,
  volume      NUMERIC NOT NULL,
  UNIQUE(exchange, symbol, interval, open_time)
);

CREATE INDEX idx_ohlcv_lookup
  ON ohlcv(exchange, symbol, interval, open_time DESC);
```

---

## 7) Simulation Engine

Simulation is the product core.

### Simulation requirements
- deterministic backtesting
- real-time simulation
- order-book-aware fill modeling
- latency, slippage, spread, and fee realism
- identical execution contract to live trading
- isolated worker per simulation or simulation session

### Strategy contract
Strategies must be pure and deterministic.

```ts
export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

export interface Position {
  open: boolean;
  side: "long" | "short" | null;
  entry_price: number | null;
  quantity: number;
  unrealized_pnl: number;
}

export interface OrderSignal {
  side: "buy" | "sell" | "hold";
  type: "market" | "limit";
  price?: number;
  quantity: number;
  reason?: string;
}

export interface Strategy {
  name: string;
  on_tick(candles: Candle[], position: Position): OrderSignal;
}
```

### Matching engine
- Market orders walk the order book depth
- Limit orders fill only when market price crosses
- Fees are applied
- Slippage is derived from actual liquidity and order depth
- Simulation must not fabricate fills that are impossible in the modeled market state

### Backtest runner
- Load historical candles / snapshots
- Iterate candle by candle
- Evaluate strategy at each step
- Simulate fills
- Persist trades and metrics
- Store completion status and output summary in Supabase

### Simulation tables
```sql
CREATE TABLE simulations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('backtest', 'realtime', 'copy')),
  status          TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'stopped')),
  strategy        TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  exchange        TEXT NOT NULL,
  from_date       TIMESTAMPTZ,
  to_date         TIMESTAMPTZ,
  result          JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE TABLE trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id   UUID REFERENCES simulations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  is_live         BOOLEAN NOT NULL DEFAULT false,
  exchange        TEXT NOT NULL,
  symbol          TEXT NOT NULL,
  side            TEXT NOT NULL CHECK (side IN ('buy','sell')),
  type            TEXT NOT NULL CHECK (type IN ('market','limit')),
  quantity        NUMERIC NOT NULL,
  fill_price      NUMERIC NOT NULL,
  fee             NUMERIC NOT NULL DEFAULT 0,
  slippage        NUMERIC NOT NULL DEFAULT 0,
  pnl             NUMERIC,
  strategy        TEXT,
  executed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_user ON trades(user_id, executed_at DESC);
CREATE INDEX idx_trades_sim ON trades(simulation_id);
CREATE INDEX idx_trades_live ON trades(is_live, user_id);
```

### Important rule
Every query that touches trades must explicitly filter on `is_live` when the query is intended for live activity.

---

## 8) Unified Execution Interface

Simulation and live execution must share one execution contract.

```ts
export interface ExecutionContext {
  symbol: string;
  exchange: string;
  user_id: string;
  simulation_id?: string;
}

export interface ExecutionAdapter {
  execute(signal: OrderSignal, context: ExecutionContext): Promise<Fill>;
}
```

### Adapters
- SimulationAdapter: executes against modeled market data
- LiveAdapter: places real orders on an exchange API

The strategy runtime must not know which adapter it is using.

---

## 9) Live Trading Execution Engine

Live trading is isolated from the simulation stack.

### Requirements
- separate service and runtime
- paid access only
- secure API keys
- real fills only
- circuit breakers and risk limits
- no shared execution code path with simulation beyond the common interface

### Live session tables
```sql
CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exchange        TEXT NOT NULL CHECK (exchange IN ('binance','bybit')),
  encrypted_key   TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL,
  label           TEXT,
  permissions     TEXT[] NOT NULL DEFAULT '{"spot"}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used       TIMESTAMPTZ,
  UNIQUE(user_id, exchange)
);

CREATE TABLE live_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exchange      TEXT NOT NULL,
  symbol        TEXT NOT NULL,
  strategy      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','stopped','circuit_broken')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at    TIMESTAMPTZ,
  stop_reason   TEXT
);

CREATE INDEX idx_live_sessions_user ON live_sessions(user_id, status);

CREATE TABLE circuit_breakers (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  triggered       BOOLEAN NOT NULL DEFAULT false,
  trigger_reason  TEXT,
  drawdown_pct    NUMERIC,
  triggered_at    TIMESTAMPTZ,
  reset_at        TIMESTAMPTZ
);
```

### Live safety rules
- API keys must never be logged
- raw keys should be deleted from Telegram messages immediately
- keys must only be submitted in private chat
- decryption must happen only inside the live execution environment
- if drawdown or loss limits are breached, live mode must stop automatically
- user must manually re-enable after a circuit breaker trip

---

## 10) Secure Key Management

### Security requirements
- envelope encryption with KMS-backed storage
- use Supabase Vault or equivalent for encrypted secret references
- store only secret references in application tables
- decrypt only in memory, only inside live execution runtime
- never persist decrypted secrets to disk
- audit every secret access

### Key submission flow
1. User sends `/setkey` in private chat
2. Bot parses the command and immediately deletes the message
3. Bot sends a secure event to n8n
4. n8n stores the secret in the vault
5. n8n writes only vault references to the database
6. User gets confirmation

---

## 11) Copy-Trading Simulation Layer

Copy trading is signal relay, not account mirroring.

### Principles
- the leader’s strategy emits signals
- signals are routed to followers
- each follower executes the copied signal in their own isolated simulation or live session
- leaders never access follower accounts
- followers never see leader strategy code
- copy trading is a fan-out layer on top of existing execution engines

### Copy tables
```sql
CREATE TABLE copy_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) UNIQUE,
  display_name  TEXT NOT NULL,
  is_public     BOOLEAN DEFAULT false,
  allow_copy    BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE copy_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   UUID NOT NULL REFERENCES users(id),
  leader_id     UUID NOT NULL REFERENCES users(id),
  mode          TEXT NOT NULL CHECK (mode IN ('sim', 'live')),
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (follower_id, leader_id)
);

CREATE TABLE copy_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id     UUID NOT NULL REFERENCES users(id),
  strategy      TEXT NOT NULL,
  symbol        TEXT NOT NULL,
  exchange      TEXT NOT NULL,
  side          TEXT NOT NULL CHECK (side IN ('buy', 'sell', 'hold')),
  signal_type   TEXT NOT NULL CHECK (signal_type IN ('market', 'limit')),
  price         NUMERIC,
  quantity      NUMERIC NOT NULL,
  emitted_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE copy_executions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id     UUID NOT NULL REFERENCES copy_signals(id),
  follower_id   UUID NOT NULL REFERENCES users(id),
  mode          TEXT NOT NULL CHECK (mode IN ('sim', 'live')),
  status        TEXT NOT NULL CHECK (status IN ('pending', 'executed', 'skipped', 'failed')),
  skip_reason   TEXT,
  fill_price    NUMERIC,
  fill_qty      NUMERIC,
  fee           NUMERIC,
  slippage      NUMERIC,
  executed_at   TIMESTAMPTZ
);
```

### Copy execution rules
- leader execution occurs first
- copy execution is derivative
- follower session must exist for live-mode copy
- followers may always simulate copied signals if access permits
- permission controls remain with the strategy owner

---

## 12) Dashboard Layer

The dashboard is optional and subscription-gated.

### Requirements
- read-only mirror of platform state
- no new business logic
- no alternate execution path
- WebSocket or event-stream updates
- complements Telegram, does not replace it
- stateless UI

### Dashboard content
- active simulations
- current PnL and drawdown
- trade history
- strategy list
- subscription state
- live session status
- copy-trading status
- alerts and notifications

### Rule
Any action that can be taken in the dashboard must also be available in Telegram.

---

## 13) Payments and Subscription Lifecycle

### Pricing model
- 7-day free trial
- $6.99/month paid subscription
- one paid tier only

### Stripe integration
- Stripe checkout for subscription signup
- Stripe customer portal for billing management
- webhook receiver service updates Supabase
- subscription changes notify Telegram automatically

### Payment state rules
- trial users may use the platform during the trial period
- paid users receive full access
- expired users fall back to free tier
- cancellation should not break access immediately unless the billing period ends or the trial ends
- payment failures must be reflected in subscription state and notified in Telegram

### Payments service environment
```env
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_ID=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
TELEGRAM_BOT_TOKEN=...
PORT=3000
```

---

## 14) Persistence Layer

Use specialized storage for each data class.

### Required stores
- PostgreSQL: users, subscriptions, configs, simulations, trades, copy relationships
- Time-series / historical store: market data and OHLCV
- Object storage: logs, exports, heavy artifacts, reports

### Data retention
- keep operational data queryable
- keep historical simulation artifacts reproducible
- limit unbounded growth in market snapshot storage with retention policies or partitioning

---

## 15) Event Bus and Queueing

### Recommended uses
- simulation jobs
- market data fan-out
- copy-trading routing
- notification jobs
- payment events
- audit log events

### Acceptable transports
- Kafka
- NATS
- Redis Streams
- Supabase Realtime for lightweight row-change notifications

### Rule
Services must not depend on direct in-process calls to unrelated services. Use events or shared data stores.

---

## 16) Orchestration and Compute

### Requirements
- isolated containers
- horizontal scaling for worker services
- always-on deployment for bot, n8n, and market ingestor
- on-demand workers for simulation and live execution jobs
- restart-on-failure policies
- health endpoints for every service

### Railway service map
- `ifyrt-bot`
- `ifyrt-n8n`
- `ifyrt-sim-worker`
- `ifyrt-market-ingestor`
- `ifyrt-live-exec`
- `ifyrt-copy-worker`
- `ifyrt-payments`

---

## 17) Observability and Safety

### Observability
- centralized logs
- metrics and dashboards
- error notifications
- audit trails for access, execution, and secret handling
- completion status for every job
- per-user and per-service tracing where practical

### Safety mechanisms
- drawdown-triggered shutdown
- max consecutive losses
- invalid state detection
- anomaly detection on trade/execution behavior
- subscription and access enforcement at gateway level
- explicit separation of live and sim queries

### Audit log
Maintain an audit trail for:
- login / onboarding
- subscription changes
- key submission
- simulation start / stop
- live enable / disable
- copy start / stop
- circuit breaker trips
- payment webhooks
- failed access attempts

---

## 18) External Integrations

### Telegram
- webhook ingress
- outbound user notifications
- command handling

### Stripe
- checkout
- subscription updates
- cancellations
- payment failures
- customer portal

### Exchange APIs
- market data ingestion
- live order placement
- account info and balances for live mode

### Supabase
- primary data store
- auth / row storage
- realtime notifications
- vault / secret storage

---

## 19) Implementation Boundaries

### Telegram bot
- parse and forward only

### n8n
- route, validate, gate, notify

### Simulation worker
- deterministic simulation only

### Market ingestor
- ingest and normalize only

### Live execution engine
- real orders only

### Dashboard
- display only

### Payments service
- billing state only

### Copy worker
- signal fan-out and execution routing only

---

## 20) Acceptance Criteria

The system is ready when all of the following are true:

1. A Telegram `/start` creates or reuses a user and subscription row.
2. `/backtest` runs deterministically and stores results.
3. `/simulate` starts a real-time paper session using live public market data.
4. `/live_on` is blocked for non-paid users and allowed for paid users with keys.
5. Live trading uses isolated credentials and records `is_live = true`.
6. Simulation trades and live trades are never mixed in queries or reports.
7. Copy trading can route a leader’s signal to follower simulation sessions.
8. Dashboard reflects state but does not introduce alternate logic.
9. Subscription state changes propagate from Stripe to Supabase to Telegram.
10. Circuit breakers can stop live trading automatically and lock the session until manual reset.

---

## 21) Build Order

Recommended implementation order:
1. Telegram bot gateway
2. n8n router and subscription gate
3. Supabase schema and auth
4. market data ingestor
5. simulation engine
6. live execution engine
7. secure key handling
8. copy-trading layer
9. dashboard
10. Stripe / payments
11. observability and hardening

---

## 22) Product Positioning

Ifyrt is an educational, risk-aware trading simulator first, and a live trading platform second. The platform’s value is fidelity, transparency, and safe experimentation. Telegram remains the control plane. The dashboard is optional. Simulation is the core product. Live trading is isolated and gated.
