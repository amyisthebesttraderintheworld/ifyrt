import {
  backtestRequestSchema,
  simulationStartRequestSchema,
  simulationStopRequestSchema
} from "@ifyrt/contracts";
import {
  createServiceApp,
  intEnv,
  logInfo,
  optionalEnv,
  requestSignatureIsValid,
  validationError
} from "@ifyrt/service-core";
import { createStrategy, listStrategies, simulateBacktest } from "@ifyrt/simulation-core";

const serviceName = "ifyrt-sim-worker";
const internalWebhookSecret = optionalEnv("INTERNAL_WEBHOOK_SECRET");
const port = intEnv("PORT", 3001);
const app = createServiceApp(serviceName);

app.use((req, res, next) => {
  if (!requestSignatureIsValid(req, internalWebhookSecret)) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  next();
});

app.get("/strategies", (_req, res) => {
  res.json({ strategies: listStrategies() });
});

app.post("/backtests/run", (req, res) => {
  const parsed = backtestRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  const strategy = createStrategy(parsed.data.strategy, {
    quantity: parsed.data.trade_quantity
  });
  const result = simulateBacktest(parsed.data, strategy);

  res.json(result);
});

app.post("/simulations/start", (req, res) => {
  const parsed = simulationStartRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  res.json({
    accepted: true,
    status: "queued",
    request: parsed.data
  });
});

app.post("/simulations/stop", (req, res) => {
  const parsed = simulationStopRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  res.json({
    accepted: true,
    status: "stopped",
    request: parsed.data
  });
});

app.listen(port, () => {
  logInfo(serviceName, "Service listening", { port });
});
