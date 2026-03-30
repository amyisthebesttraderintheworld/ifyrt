import { copyFanoutRequestSchema, copyStopRequestSchema } from "@ifyrt/contracts";
import {
  createServiceApp,
  intEnv,
  logInfo,
  optionalEnv,
  requestSignatureIsValid,
  validationError
} from "@ifyrt/service-core";

import { activeCopyRouteCount, createCopyRouteStore, planCopyFanout, stopCopyRoutes } from "./state";

const serviceName = "ifyrt-copy-worker";
const internalWebhookSecret = optionalEnv("INTERNAL_WEBHOOK_SECRET");
const port = intEnv("PORT", 3004);
const app = createServiceApp(serviceName);
const store = createCopyRouteStore();

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
      active_copy_routes: activeCopyRouteCount(store)
    }
  });
});

app.post("/copy/fanout", (req, res) => {
  const parsed = copyFanoutRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  const response = planCopyFanout(store, parsed.data);

  logInfo(serviceName, "Copy fanout planned", {
    leader_id: parsed.data.signal.leader_id,
    strategy: parsed.data.signal.strategy,
    symbol: parsed.data.signal.symbol,
    pending_routes: response.planned.filter((entry) => entry.status === "pending").length,
    active_copy_routes: response.active_routes
  });

  res.json(response);
});

app.post("/copy/stop", (req, res) => {
  const parsed = copyStopRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  const response = stopCopyRoutes(store, parsed.data);
  logInfo(serviceName, "Copy routes stopped", {
    follower_id: parsed.data.follower_id,
    leader_id: parsed.data.leader_id,
    stopped_routes: response.stopped_routes
  });

  res.json(response);
});

app.listen(port, () => {
  logInfo(serviceName, "Service listening", { port });
});
