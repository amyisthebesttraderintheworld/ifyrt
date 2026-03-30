import { liveOrderRequestSchema, liveSessionControlRequestSchema } from "@ifyrt/contracts";
import {
  createServiceApp,
  intEnv,
  logInfo,
  optionalEnv,
  requestSignatureIsValid,
  validationError
} from "@ifyrt/service-core";

const serviceName = "ifyrt-live-exec";
const internalWebhookSecret = optionalEnv("INTERNAL_WEBHOOK_SECRET");
const port = intEnv("PORT", 3002);
const app = createServiceApp(serviceName);

app.use((req, res, next) => {
  if (!requestSignatureIsValid(req, internalWebhookSecret)) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  next();
});

app.post("/sessions/enable", (req, res) => {
  const parsed = liveSessionControlRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  if (parsed.data.tier !== "paid") {
    res.status(403).json({
      accepted: false,
      reason: "Paid tier required for live trading."
    });
    return;
  }

  if (!parsed.data.key_reference) {
    validationError(res, [{ message: "A secure key reference is required to enable live trading." }]);
    return;
  }

  res.json({
    accepted: true,
    status: "isolated_ready",
    request: parsed.data
  });
});

app.post("/sessions/disable", (req, res) => {
  const parsed = liveSessionControlRequestSchema.safeParse(req.body);
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

app.post("/orders/execute", (req, res) => {
  const parsed = liveOrderRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  res.status(501).json({
    accepted: false,
    reason: "Live exchange adapters are intentionally not wired yet. Secure key decryption and circuit breakers must land first."
  });
});

app.listen(port, () => {
  logInfo(serviceName, "Service listening", { port });
});
