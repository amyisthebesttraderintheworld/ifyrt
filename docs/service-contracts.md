# Service Contracts

This repository follows the boundaries in `docs/archive/foundation/ifyrt-clean-design-spec.md`.

## Bot -> n8n

- Route: `POST {N8N_WEBHOOK_URL}`
- Auth: `X-Ifyrt-Signature` HMAC SHA-256 of the JSON body using `INTERNAL_WEBHOOK_SECRET`
- Body: `IfyrtEvent`

## n8n -> sim-worker

- `POST /backtests/run`
- `POST /simulations/start`
- `POST /simulations/stop`

## n8n -> live-exec

- `POST /sessions/enable`
- `POST /sessions/disable`
- `POST /orders/execute`

## n8n -> copy-worker

- `POST /copy/fanout`
- `POST /copy/stop`

## Stripe -> payments

- `POST /stripe/webhook`

The external endpoints are intentionally thin. Most orchestration remains in n8n and shared state stays in Supabase.
