import crypto from "node:crypto";

import express, { type Express, type Request, type Response } from "express";

function stringifyPayload(payload: object | string): string {
  return typeof payload === "string" ? payload : JSON.stringify(payload);
}

export function createHmacSignature(payload: object | string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(stringifyPayload(payload)).digest("hex");
}

export function verifyHmacSignature(payload: object | string, signature: string | undefined, secret: string): boolean {
  if (!signature) {
    return false;
  }

  const expected = createHmacSignature(payload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function requestSignatureIsValid(req: Request, secret?: string): boolean {
  if (!secret) {
    return true;
  }

  const signature = req.header("x-ifyrt-signature") ?? undefined;
  return verifyHmacSignature(req.body as object, signature, secret);
}

export function createServiceApp(serviceName: string): Express {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_req, res) => {
    res.json({
      service: serviceName,
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

export function validationError(res: Response, issues: unknown): void {
  res.status(400).json({
    error: "validation_error",
    issues
  });
}
