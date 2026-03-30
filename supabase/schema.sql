CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT NOT NULL,
  live_mode BOOLEAN NOT NULL DEFAULT false,
  copy_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_telegram_id ON users (telegram_id);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'trial', 'paid')),
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  paid_since TIMESTAMPTZ,
  paid_until TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_sub_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX idx_subscriptions_tier ON subscriptions (tier);
CREATE TRIGGER subscriptions_set_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE copy_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  allow_copy BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('backtest', 'realtime', 'copy')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'stopped')),
  strategy TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'bybit')),
  from_date TIMESTAMPTZ,
  to_date TIMESTAMPTZ,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_simulations_user_created_at ON simulations (user_id, created_at DESC);

CREATE TABLE live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'bybit')),
  symbol TEXT NOT NULL,
  strategy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'circuit_broken')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at TIMESTAMPTZ,
  stop_reason TEXT
);

CREATE INDEX idx_live_sessions_user_status ON live_sessions (user_id, status);

CREATE TABLE circuit_breakers (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  triggered BOOLEAN NOT NULL DEFAULT false,
  trigger_reason TEXT,
  drawdown_pct NUMERIC,
  triggered_at TIMESTAMPTZ,
  reset_at TIMESTAMPTZ
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'bybit')),
  vault_key_ref TEXT NOT NULL,
  vault_secret_ref TEXT NOT NULL,
  label TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{"spot"}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used TIMESTAMPTZ,
  UNIQUE (user_id, exchange)
);

CREATE TABLE market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'bybit')),
  symbol TEXT NOT NULL,
  bid NUMERIC NOT NULL,
  ask NUMERIC NOT NULL,
  last NUMERIC NOT NULL,
  volume_24h NUMERIC,
  order_book JSONB NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_snapshots_lookup
  ON market_snapshots (exchange, symbol, captured_at DESC);

CREATE TABLE ohlcv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'bybit')),
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,
  open_time TIMESTAMPTZ NOT NULL,
  open NUMERIC NOT NULL,
  high NUMERIC NOT NULL,
  low NUMERIC NOT NULL,
  close NUMERIC NOT NULL,
  volume NUMERIC NOT NULL,
  UNIQUE (exchange, symbol, interval, open_time)
);

CREATE INDEX idx_ohlcv_lookup
  ON ohlcv (exchange, symbol, interval, open_time DESC);

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  live_session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_live BOOLEAN NOT NULL DEFAULT false,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'bybit')),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  type TEXT NOT NULL CHECK (type IN ('market', 'limit')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  fill_price NUMERIC NOT NULL CHECK (fill_price >= 0),
  fee NUMERIC NOT NULL DEFAULT 0 CHECK (fee >= 0),
  slippage NUMERIC NOT NULL DEFAULT 0 CHECK (slippage >= 0),
  pnl NUMERIC,
  strategy TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (is_live = true AND live_session_id IS NOT NULL AND simulation_id IS NULL) OR
    (is_live = false AND simulation_id IS NOT NULL AND live_session_id IS NULL)
  )
);

CREATE INDEX idx_trades_user_executed_at ON trades (user_id, executed_at DESC);
CREATE INDEX idx_trades_simulation ON trades (simulation_id);
CREATE INDEX idx_trades_live ON trades (is_live, user_id);

CREATE VIEW simulation_trades AS
SELECT *
FROM trades
WHERE is_live = false;

CREATE VIEW live_trades AS
SELECT *
FROM trades
WHERE is_live = true;

CREATE TABLE copy_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('sim', 'live')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, leader_id)
);

CREATE TABLE copy_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL CHECK (exchange IN ('binance', 'bybit')),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell', 'hold')),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('market', 'limit')),
  price NUMERIC,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  emitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE copy_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES copy_signals(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('sim', 'live')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'executed', 'skipped', 'failed')),
  skip_reason TEXT,
  fill_price NUMERIC,
  fill_qty NUMERIC,
  fee NUMERIC,
  slippage NUMERIC,
  executed_at TIMESTAMPTZ
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_created_at ON audit_logs (user_id, created_at DESC);
