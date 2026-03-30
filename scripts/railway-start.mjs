import { spawn } from "node:child_process";

import { resolveRailwayService } from "./railway-service.mjs";

const { workspace, label } = resolveRailwayService();
const child = spawn("npm", ["run", "start", "--workspace", workspace], {
  stdio: "inherit",
  env: process.env
});

child.on("error", (error) => {
  console.error(`[railway-start] Failed to start ${label}:`, error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
