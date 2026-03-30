# Railway Service Configs

Each Railway service in this monorepo should point at one config file from this folder.

## Service map

- `ifyrt-bot` -> `deploy/railway/bot.railway.json`
- `ifyrt-sim-worker` -> `deploy/railway/sim-worker.railway.json`
- `ifyrt-live-exec` -> `deploy/railway/live-exec.railway.json`
- `ifyrt-market-ingestor` -> `deploy/railway/market-ingestor.railway.json`
- `ifyrt-copy-worker` -> `deploy/railway/copy-worker.railway.json`
- `ifyrt-payments` -> `deploy/railway/payments.railway.json`
- `ifyrt-n8n` -> `deploy/railway/n8n.railway.json`

## Shared variables

Set these on the services that need them:

- `INTERNAL_WEBHOOK_SECRET`
- `RAILWAY_PUBLIC_DOMAIN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`

## Bot variables

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `INTERNAL_WEBHOOK_SECRET`
- `N8N_WEBHOOK_URL=https://<your-n8n-domain>/webhook/ifyrt-gateway`

## n8n variables

- `N8N_BASIC_AUTH_ACTIVE=true`
- `N8N_BASIC_AUTH_USER=<your-user>`
- `N8N_BASIC_AUTH_PASSWORD=<your-password>`
- `N8N_ENCRYPTION_KEY=<32+ char random string>`
- `N8N_HOST=<your-n8n-domain>`
- `N8N_PROTOCOL=https`
- `WEBHOOK_URL=https://<your-n8n-domain>`
- `N8N_EDITOR_BASE_URL=https://<your-n8n-domain>`
- `INTERNAL_WEBHOOK_SECRET=<same secret as bot/workers>`
- `SUPABASE_URL=<your supabase url>`
- `SUPABASE_SERVICE_ROLE_KEY=<your service role key>`
- `TELEGRAM_BOT_TOKEN=<your telegram bot token>`
- `SIM_WORKER_URL=https://<your sim worker domain>`
- `LIVE_EXEC_URL=https://<your live exec domain>`
- `COPY_WORKER_URL=https://<your copy worker domain>`
- `DASHBOARD_URL=https://<optional dashboard domain>`
- `NODE_FUNCTION_ALLOW_BUILTIN=crypto`
- `EXECUTIONS_DATA_SAVE_ON_SUCCESS=none`
- `EXECUTIONS_DATA_SAVE_ON_ERROR=none`
- `EXECUTIONS_DATA_SAVE_ON_PROGRESS=false`
- `EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=false`
- `EXECUTIONS_DATA_PRUNE=true`
- `EXECUTIONS_DATA_MAX_AGE=168`

## Worker variables

`ifyrt-sim-worker`

- `INTERNAL_WEBHOOK_SECRET`
- `MARKET_INGESTOR_URL=https://<your market ingestor domain>`
- `SIM_POLL_INTERVAL_MS=5000`
- `SIM_INITIAL_CASH=10000`
- `SIM_FEE_BPS=10`
- `SIM_MAX_CANDLES=250`

`ifyrt-market-ingestor`

- `MARKET_SYMBOLS=btcusdt,ethusdt`

`ifyrt-payments`

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Notes

- The workflow JSON in `n8n/workflows/01-ifyrt-gateway-router.json` expects the n8n service variables above.
- The SQL helpers in `supabase/schema.sql` are meant to be run before importing the workflow.
- `RAILWAY_PUBLIC_DOMAIN` is stored in `.env` as `ifyrt-production.up.railway.app`.
