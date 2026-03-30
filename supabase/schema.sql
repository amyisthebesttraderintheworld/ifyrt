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

CREATE INDEX idx_simulations_user_status_created_at
  ON simulations (user_id, status, created_at DESC);

CREATE INDEX idx_copy_subscriptions_follower_active
  ON copy_subscriptions (follower_id, active, created_at DESC);

CREATE INDEX idx_live_sessions_user_started_at
  ON live_sessions (user_id, started_at DESC);

-- n8n helper functions
-- Note: enable Supabase Vault before using ifyrt_store_exchange_api_keys().

CREATE OR REPLACE FUNCTION ifyrt_upsert_telegram_user(
  p_telegram_id BIGINT,
  p_username TEXT,
  p_first_name TEXT
)
RETURNS TABLE (
  user_id UUID,
  telegram_id BIGINT,
  username TEXT,
  first_name TEXT,
  live_mode BOOLEAN,
  copy_enabled BOOLEAN,
  tier TEXT,
  trial_end TIMESTAMPTZ,
  paid_until TIMESTAMPTZ,
  is_new BOOLEAN
)
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_subscription subscriptions%ROWTYPE;
  v_is_new BOOLEAN := false;
BEGIN
  SELECT *
  INTO v_user
  FROM users
  WHERE users.telegram_id = p_telegram_id
  LIMIT 1;

  IF v_user.id IS NULL THEN
    INSERT INTO users (telegram_id, username, first_name)
    VALUES (p_telegram_id, NULLIF(p_username, ''), p_first_name)
    RETURNING *
    INTO v_user;

    v_is_new := true;
  ELSE
    UPDATE users
    SET
      username = COALESCE(NULLIF(p_username, ''), users.username),
      first_name = p_first_name,
      last_seen = now()
    WHERE id = v_user.id
    RETURNING *
    INTO v_user;
  END IF;

  SELECT *
  INTO v_subscription
  FROM subscriptions
  WHERE user_id = v_user.id
  LIMIT 1;

  IF v_subscription.id IS NULL THEN
    IF v_is_new THEN
      INSERT INTO subscriptions (user_id, tier, trial_start, trial_end)
      VALUES (v_user.id, 'trial', now(), now() + interval '7 days')
      RETURNING *
      INTO v_subscription;
    ELSE
      INSERT INTO subscriptions (user_id, tier)
      VALUES (v_user.id, 'free')
      RETURNING *
      INTO v_subscription;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    v_user.id,
    v_user.telegram_id,
    v_user.username,
    v_user.first_name,
    v_user.live_mode,
    v_user.copy_enabled,
    v_subscription.tier,
    v_subscription.trial_end,
    v_subscription.paid_until,
    v_is_new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ifyrt_subscription_gate(
  p_user_id UUID,
  p_capability TEXT DEFAULT 'backtest'
)
RETURNS TABLE (
  access BOOLEAN,
  tier TEXT,
  reason TEXT,
  trial_end TIMESTAMPTZ,
  paid_until TIMESTAMPTZ
)
AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_paid_active BOOLEAN := false;
  v_trial_active BOOLEAN := false;
  v_access BOOLEAN := false;
  v_reason TEXT := NULL;
BEGIN
  SELECT *
  INTO v_subscription
  FROM subscriptions
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_subscription.id IS NULL THEN
    INSERT INTO subscriptions (user_id, tier)
    VALUES (p_user_id, 'free')
    ON CONFLICT (user_id) DO NOTHING;

    SELECT *
    INTO v_subscription
    FROM subscriptions
    WHERE user_id = p_user_id
    LIMIT 1;
  END IF;

  v_paid_active := v_subscription.tier = 'paid'
    AND COALESCE(v_subscription.paid_until, v_now + interval '100 years') > v_now;
  v_trial_active := v_subscription.tier = 'trial'
    AND COALESCE(v_subscription.trial_end, v_now - interval '1 second') > v_now;

  IF p_capability IN ('start', 'help', 'strategies', 'subscription', 'setkey') THEN
    v_access := true;
  ELSIF p_capability = 'backtest' THEN
    v_access := true;
  ELSIF p_capability IN ('simulate', 'copy', 'status') THEN
    v_access := v_paid_active OR v_trial_active;
  ELSIF p_capability IN ('live', 'dashboard') THEN
    v_access := v_paid_active;
  END IF;

  IF NOT v_access THEN
    v_reason := CASE
      WHEN p_capability IN ('live', 'dashboard') THEN 'paid_required'
      WHEN v_subscription.tier = 'trial' AND COALESCE(v_subscription.trial_end, v_now - interval '1 second') <= v_now THEN 'trial_expired'
      WHEN v_subscription.tier = 'paid' AND COALESCE(v_subscription.paid_until, v_now + interval '100 years') <= v_now THEN 'subscription_expired'
      ELSE 'upgrade_required'
    END;
  END IF;

  RETURN QUERY
  SELECT
    v_access,
    v_subscription.tier,
    v_reason,
    v_subscription.trial_end,
    v_subscription.paid_until;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ifyrt_get_active_simulation(
  p_user_id UUID
)
RETURNS TABLE (
  simulation_id UUID,
  user_id UUID,
  simulation_type TEXT,
  status TEXT,
  strategy TEXT,
  symbol TEXT,
  exchange TEXT,
  created_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result JSONB
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.type,
    s.status,
    s.strategy,
    s.symbol,
    s.exchange,
    s.created_at,
    s.started_at,
    s.completed_at,
    s.result
  FROM simulations AS s
  WHERE s.user_id = p_user_id
    AND s.status = 'running'
  ORDER BY COALESCE(s.started_at, s.created_at) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ifyrt_status_snapshot(
  p_user_id UUID
)
RETURNS JSONB
AS $$
DECLARE
  v_payload JSONB;
BEGIN
  SELECT jsonb_build_object(
    'subscription',
    (
      SELECT to_jsonb(s)
      FROM subscriptions AS s
      WHERE s.user_id = p_user_id
      LIMIT 1
    ),
    'active_simulation',
    (
      SELECT to_jsonb(sim)
      FROM (
        SELECT
          s.id,
          s.type,
          s.status,
          s.strategy,
          s.symbol,
          s.exchange,
          s.created_at,
          s.started_at,
          s.completed_at,
          s.result
        FROM simulations AS s
        WHERE s.user_id = p_user_id
          AND s.status = 'running'
        ORDER BY COALESCE(s.started_at, s.created_at) DESC
        LIMIT 1
      ) AS sim
    ),
    'active_live_session',
    (
      SELECT to_jsonb(ls)
      FROM (
        SELECT
          l.id,
          l.exchange,
          l.symbol,
          l.strategy,
          l.status,
          l.started_at,
          l.stopped_at,
          l.stop_reason
        FROM live_sessions AS l
        WHERE l.user_id = p_user_id
          AND l.status = 'active'
        ORDER BY l.started_at DESC
        LIMIT 1
      ) AS ls
    ),
    'copy_subscriptions',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', cs.id,
            'leader_id', cs.leader_id,
            'leader_username', u.username,
            'mode', cs.mode,
            'active', cs.active,
            'created_at', cs.created_at
          )
          ORDER BY cs.created_at DESC
        )
        FROM copy_subscriptions AS cs
        JOIN users AS u ON u.id = cs.leader_id
        WHERE cs.follower_id = p_user_id
          AND cs.active = true
      ),
      '[]'::jsonb
    ),
    'recent_backtest',
    (
      SELECT to_jsonb(bt)
      FROM (
        SELECT
          s.id,
          s.status,
          s.strategy,
          s.symbol,
          s.exchange,
          s.created_at,
          s.completed_at,
          s.result
        FROM simulations AS s
        WHERE s.user_id = p_user_id
          AND s.type = 'backtest'
        ORDER BY s.created_at DESC
        LIMIT 1
      ) AS bt
    ),
    'trade_count',
    (
      SELECT COUNT(*)
      FROM trades AS t
      WHERE t.user_id = p_user_id
    ),
    'last_trade',
    (
      SELECT to_jsonb(last_trade_row)
      FROM (
        SELECT
          t.id,
          t.is_live,
          t.symbol,
          t.side,
          t.type,
          t.fill_price,
          t.pnl,
          t.executed_at
        FROM trades AS t
        WHERE t.user_id = p_user_id
        ORDER BY t.executed_at DESC
        LIMIT 1
      ) AS last_trade_row
    )
  )
  INTO v_payload;

  RETURN COALESCE(v_payload, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ifyrt_store_exchange_api_keys(
  p_user_id UUID,
  p_exchange TEXT,
  p_api_key TEXT,
  p_api_secret TEXT,
  p_label TEXT DEFAULT NULL
)
RETURNS TABLE (
  api_key_row_id UUID,
  vault_key_ref TEXT,
  vault_secret_ref TEXT
)
AS $$
DECLARE
  v_key_id UUID;
  v_secret_id UUID;
  v_row api_keys%ROWTYPE;
  v_exchange TEXT := lower(trim(p_exchange));
  v_suffix TEXT := to_char(now(), 'YYYYMMDDHH24MISSMS');
BEGIN
  IF NULLIF(trim(p_api_key), '') IS NULL OR NULLIF(trim(p_api_secret), '') IS NULL THEN
    RAISE EXCEPTION 'Both api_key and api_secret are required.';
  END IF;

  SELECT vault.create_secret(
    trim(p_api_key),
    format('ifyrt_%s_%s_key_%s', p_user_id, v_exchange, v_suffix),
    'Ifyrt exchange API key'
  )
  INTO v_key_id;

  SELECT vault.create_secret(
    trim(p_api_secret),
    format('ifyrt_%s_%s_secret_%s', p_user_id, v_exchange, v_suffix),
    'Ifyrt exchange API secret'
  )
  INTO v_secret_id;

  INSERT INTO api_keys (
    user_id,
    exchange,
    vault_key_ref,
    vault_secret_ref,
    label,
    last_used
  )
  VALUES (
    p_user_id,
    v_exchange,
    v_key_id::TEXT,
    v_secret_id::TEXT,
    NULLIF(trim(p_label), ''),
    now()
  )
  ON CONFLICT (user_id, exchange)
  DO UPDATE SET
    vault_key_ref = EXCLUDED.vault_key_ref,
    vault_secret_ref = EXCLUDED.vault_secret_ref,
    label = COALESCE(EXCLUDED.label, api_keys.label),
    last_used = now()
  RETURNING *
  INTO v_row;

  RETURN QUERY
  SELECT
    v_row.id,
    v_row.vault_key_ref,
    v_row.vault_secret_ref;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ifyrt_resolve_live_context(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  tier TEXT,
  exchange TEXT,
  symbol TEXT,
  strategy TEXT,
  key_reference TEXT
)
AS $$
DECLARE
  v_subscription subscriptions%ROWTYPE;
  v_simulation RECORD;
  v_api_key api_keys%ROWTYPE;
BEGIN
  SELECT *
  INTO v_subscription
  FROM subscriptions
  WHERE user_id = p_user_id
  LIMIT 1;

  SELECT
    s.id,
    s.exchange,
    s.symbol,
    s.strategy
  INTO v_simulation
  FROM simulations AS s
  WHERE s.user_id = p_user_id
    AND s.status = 'running'
  ORDER BY COALESCE(s.started_at, s.created_at) DESC
  LIMIT 1;

  IF v_simulation.id IS NULL THEN
    RETURN;
  END IF;

  SELECT *
  INTO v_api_key
  FROM api_keys
  WHERE user_id = p_user_id
    AND exchange = v_simulation.exchange
  LIMIT 1;

  RETURN QUERY
  SELECT
    p_user_id,
    COALESCE(v_subscription.tier, 'free'),
    v_simulation.exchange,
    v_simulation.symbol,
    v_simulation.strategy,
    v_api_key.vault_key_ref;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ifyrt_resolve_copy_target(
  p_leader_lookup TEXT
)
RETURNS TABLE (
  leader_id UUID,
  username TEXT,
  display_name TEXT,
  allow_copy BOOLEAN,
  is_public BOOLEAN,
  copy_enabled BOOLEAN
)
AS $$
DECLARE
  v_lookup TEXT := lower(ltrim(trim(p_leader_lookup), '@'));
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    cp.display_name,
    COALESCE(cp.allow_copy, u.copy_enabled, false),
    COALESCE(cp.is_public, false),
    u.copy_enabled
  FROM users AS u
  LEFT JOIN copy_profiles AS cp
    ON cp.user_id = u.id
  WHERE lower(COALESCE(u.username, '')) = v_lookup
     OR lower(COALESCE(cp.display_name, '')) = v_lookup
  ORDER BY CASE
    WHEN lower(COALESCE(u.username, '')) = v_lookup THEN 0
    ELSE 1
  END
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ifyrt_open_copy_subscription(
  p_follower_id UUID,
  p_leader_id UUID,
  p_mode TEXT
)
RETURNS TABLE (
  subscription_id UUID,
  follower_id UUID,
  leader_id UUID,
  mode TEXT,
  active BOOLEAN
)
AS $$
DECLARE
  v_row copy_subscriptions%ROWTYPE;
BEGIN
  INSERT INTO copy_subscriptions (follower_id, leader_id, mode, active)
  VALUES (p_follower_id, p_leader_id, p_mode, true)
  ON CONFLICT (follower_id, leader_id)
  DO UPDATE SET
    mode = EXCLUDED.mode,
    active = true
  RETURNING *
  INTO v_row;

  RETURN QUERY
  SELECT
    v_row.id,
    v_row.follower_id,
    v_row.leader_id,
    v_row.mode,
    v_row.active;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ifyrt_stop_copy_subscriptions(
  p_follower_id UUID
)
RETURNS INTEGER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE copy_subscriptions
  SET active = false
  WHERE follower_id = p_follower_id
    AND active = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ifyrt_set_user_live_mode(
  p_user_id UUID,
  p_enabled BOOLEAN
)
RETURNS BOOLEAN
AS $$
BEGIN
  UPDATE users
  SET live_mode = p_enabled
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ifyrt_append_audit_log(
  p_user_id UUID,
  p_event_type TEXT,
  p_actor TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, event_type, actor, metadata)
  VALUES (p_user_id, p_event_type, p_actor, COALESCE(p_metadata, '{}'::JSONB))
  RETURNING id
  INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
