const services = new Map([
  ["ifyrt-bot", { workspace: "@ifyrt/bot", label: "bot" }],
  ["bot", { workspace: "@ifyrt/bot", label: "bot" }],
  ["ifyrt-sim-worker", { workspace: "@ifyrt/sim-worker", label: "sim-worker" }],
  ["sim-worker", { workspace: "@ifyrt/sim-worker", label: "sim-worker" }],
  ["ifyrt-live-exec", { workspace: "@ifyrt/live-exec", label: "live-exec" }],
  ["live-exec", { workspace: "@ifyrt/live-exec", label: "live-exec" }],
  ["ifyrt-market-ingestor", { workspace: "@ifyrt/market-ingestor", label: "market-ingestor" }],
  ["market-ingestor", { workspace: "@ifyrt/market-ingestor", label: "market-ingestor" }],
  ["ifyrt-copy-worker", { workspace: "@ifyrt/copy-worker", label: "copy-worker" }],
  ["copy-worker", { workspace: "@ifyrt/copy-worker", label: "copy-worker" }],
  ["ifyrt-payments", { workspace: "@ifyrt/payments", label: "payments" }],
  ["payments", { workspace: "@ifyrt/payments", label: "payments" }]
]);

function configuredServiceName() {
  return process.env.IFYRT_SERVICE_TARGET ?? process.env.RAILWAY_SERVICE_NAME ?? process.env.SERVICE_NAME ?? "";
}

function n8nEnvDetected() {
  return Boolean(
    process.env.N8N_BASIC_AUTH_ACTIVE ||
      process.env.N8N_ENCRYPTION_KEY ||
      process.env.SIM_WORKER_URL ||
      process.env.LIVE_EXEC_URL ||
      process.env.COPY_WORKER_URL ||
      process.env.N8N_HOST ||
      process.env.WEBHOOK_URL
  );
}

function inferRailwayServiceFromEnv() {
  if (n8nEnvDetected()) {
    throw new Error(
      "This environment looks like the n8n service. Deploy n8n with deploy/railway/n8n.railway.json instead of the monorepo root start fallback."
    );
  }

  if (process.env.TELEGRAM_WEBHOOK_SECRET || process.env.N8N_WEBHOOK_URL) {
    return services.get("ifyrt-bot");
  }

  if (
    process.env.MARKET_INGESTOR_URL ||
    process.env.SIM_POLL_INTERVAL_MS ||
    process.env.SIM_INITIAL_CASH ||
    process.env.SIM_FEE_BPS ||
    process.env.SIM_MAX_CANDLES
  ) {
    return services.get("ifyrt-sim-worker");
  }

  if (process.env.MARKET_SYMBOLS) {
    return services.get("ifyrt-market-ingestor");
  }

  if (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_WEBHOOK_SECRET) {
    return services.get("ifyrt-payments");
  }

  if (process.env.TELEGRAM_BOT_TOKEN) {
    return services.get("ifyrt-bot");
  }

  return undefined;
}

export function resolveRailwayService(serviceName = configuredServiceName()) {
  const normalized = serviceName.trim().toLowerCase();
  const match = services.get(normalized);

  if (match) {
    return match;
  }

  if (normalized === "ifyrt-n8n" || normalized === "n8n") {
    throw new Error(
      "The n8n service must use the dedicated Dockerfile config at deploy/railway/n8n.railway.json."
    );
  }

  if (!normalized || normalized === "ifyrt" || normalized === "app") {
    const inferred = inferRailwayServiceFromEnv();
    if (inferred) {
      return inferred;
    }
  }

  throw new Error(
    `Unsupported Railway service '${serviceName || "(empty)"}'. Set IFYRT_SERVICE_TARGET to one of ${Array.from(
      new Set(Array.from(services.keys()).filter((key) => key.startsWith("ifyrt-")))
    ).join(", ")}.`
  );
}
