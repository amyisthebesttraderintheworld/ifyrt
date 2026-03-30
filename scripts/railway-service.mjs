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

export function resolveRailwayService(serviceName = configuredServiceName()) {
  const normalized = serviceName.trim().toLowerCase();
  const match = services.get(normalized);

  if (!match) {
    if (normalized === "ifyrt-n8n" || normalized === "n8n") {
      throw new Error(
        "The n8n service must use the dedicated Dockerfile config at deploy/railway/n8n.railway.json."
      );
    }

    throw new Error(
      `Unsupported Railway service '${serviceName || "(empty)"}'. Set IFYRT_SERVICE_TARGET or deploy a supported service: ${Array.from(
        new Set(Array.from(services.keys()).filter((key) => key.startsWith("ifyrt-")))
      ).join(", ")}.`
    );
  }

  return match;
}
