import { copyFanoutRequestSchema } from "@ifyrt/contracts";
import {
  createServiceApp,
  intEnv,
  logInfo,
  optionalEnv,
  requestSignatureIsValid,
  validationError
} from "@ifyrt/service-core";

const serviceName = "ifyrt-copy-worker";
const internalWebhookSecret = optionalEnv("INTERNAL_WEBHOOK_SECRET");
const port = intEnv("PORT", 3004);
const app = createServiceApp(serviceName);

app.use((req, res, next) => {
  if (!requestSignatureIsValid(req, internalWebhookSecret)) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  next();
});

app.post("/copy/fanout", (req, res) => {
  const parsed = copyFanoutRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }

  const planned = parsed.data.followers.map((follower) => {
    if (!follower.active) {
      return {
        follower_id: follower.follower_id,
        mode: follower.mode,
        status: "skipped" as const,
        reason: "Follower subscription is inactive."
      };
    }

    if (!follower.allow_copy) {
      return {
        follower_id: follower.follower_id,
        mode: follower.mode,
        status: "skipped" as const,
        reason: "Leader permissions do not allow copying."
      };
    }

    if (follower.mode === "live" && !follower.has_session) {
      return {
        follower_id: follower.follower_id,
        mode: follower.mode,
        status: "skipped" as const,
        reason: "Live copy requires an active live session."
      };
    }

    return {
      follower_id: follower.follower_id,
      mode: follower.mode,
      status: "pending" as const
    };
  });

  res.json({
    signal: parsed.data.signal,
    planned
  });
});

app.post("/copy/stop", (req, res) => {
  res.json({
    accepted: true,
    status: "stopped",
    request: req.body
  });
});

app.listen(port, () => {
  logInfo(serviceName, "Service listening", { port });
});
