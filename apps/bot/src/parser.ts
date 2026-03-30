import {
  backtestPayloadSchema,
  copyStartPayloadSchema,
  copyStopPayloadSchema,
  keySubmitPayloadSchema,
  simulationStartPayloadSchema,
  type EventPayloadMap,
  type EventType
} from "@ifyrt/contracts";

import type { TelegramChat } from "./types";

interface ParsedCommand<T extends EventType = EventType> {
  eventType: T;
  payload: EventPayloadMap[T];
  deleteMessage: boolean;
}

function normalizeCommand(raw: string): string {
  return raw.split("@")[0].toLowerCase();
}

function normalizeSymbol(raw: string): string {
  return raw.replace(/[\/_-]/g, "").toUpperCase();
}

function normalizeHandle(raw: string): string {
  return raw.replace(/^@/, "").trim();
}

function parseDateInput(raw: string): string {
  if (raw.includes("T")) {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date: ${raw}`);
    }
    return parsed.toISOString();
  }

  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${raw}`);
  }

  return parsed.toISOString();
}

function parseCopyStartArgs(args: string[]): EventPayloadMap["copy.start"] {
  const [firstArg, secondArg, thirdArg] = args;
  const commandStyle = firstArg?.toLowerCase();

  if (commandStyle === "follow") {
    if (!secondArg) {
      throw new Error("Copy format: /copy <leader> [sim|live] or /copy follow <leader> [sim|live]");
    }

    return copyStartPayloadSchema.parse({
      leader: normalizeHandle(secondArg),
      mode: thirdArg?.toLowerCase() ?? "sim"
    });
  }

  if (!firstArg) {
    throw new Error("Copy format: /copy <leader> [sim|live] or /copy follow <leader> [sim|live]");
  }

  return copyStartPayloadSchema.parse({
    leader: normalizeHandle(firstArg),
    mode: secondArg?.toLowerCase() ?? "sim"
  });
}

export function parseTelegramCommand(text: string, chat: TelegramChat): ParsedCommand {
  const parts = text.trim().split(/\s+/);
  const command = normalizeCommand(parts[0] ?? "");
  const args = parts.slice(1);

  switch (command) {
    case "/start":
      return { eventType: "user.start", payload: {}, deleteMessage: false };
    case "/help":
      return { eventType: "user.help", payload: {}, deleteMessage: false };
    case "/backtest": {
      if (args.length < 4) {
        throw new Error("Backtest format: /backtest <strategy> <symbol> <from> <to> [exchange]");
      }

      const parsed = backtestPayloadSchema.parse({
        strategy: args[0],
        symbol: normalizeSymbol(args[1]),
        from: parseDateInput(args[2]),
        to: parseDateInput(args[3]),
        exchange: args[4]?.toLowerCase() ?? "binance"
      });

      return { eventType: "backtest.request", payload: parsed, deleteMessage: false };
    }
    case "/simulate": {
      if (args.length < 2) {
        throw new Error("Simulation format: /simulate <strategy> <symbol> [exchange]");
      }

      const parsed = simulationStartPayloadSchema.parse({
        strategy: args[0],
        symbol: normalizeSymbol(args[1]),
        exchange: args[2]?.toLowerCase() ?? "binance"
      });

      return { eventType: "simulation.start", payload: parsed, deleteMessage: false };
    }
    case "/sim_stop":
    case "/stop":
      return { eventType: "simulation.stop", payload: {}, deleteMessage: false };
    case "/status":
    case "/account":
    case "/pnl":
    case "/positions":
    case "/history":
    case "/trades":
      return { eventType: "user.status", payload: {}, deleteMessage: false };
    case "/live_on":
    case "/live":
      return { eventType: "live.enable", payload: {}, deleteMessage: false };
    case "/live_off":
      return { eventType: "live.disable", payload: {}, deleteMessage: false };
    case "/copy": {
      const subcommand = args[0]?.toLowerCase();
      if (subcommand === "list") {
        return { eventType: "copy.list", payload: {}, deleteMessage: false };
      }
      if (subcommand === "mystats" || subcommand === "stats") {
        return { eventType: "copy.stats", payload: {}, deleteMessage: false };
      }
      if (subcommand === "share") {
        return { eventType: "copy.share", payload: {}, deleteMessage: false };
      }
      if (subcommand === "hide") {
        return { eventType: "copy.hide", payload: {}, deleteMessage: false };
      }
      if (subcommand === "unfollow" || subcommand === "stop" || subcommand === "off") {
        const leader = args[1] ? normalizeHandle(args[1]) : undefined;
        return { eventType: "copy.stop", payload: { leader }, deleteMessage: false };
      }

      const parsed = parseCopyStartArgs(args);
      return { eventType: "copy.start", payload: parsed, deleteMessage: false };
    }
    case "/copy_stop": {
      const leader = args[0] ? normalizeHandle(args[0]) : undefined;
      const parsed = copyStopPayloadSchema.parse({
        leader
      });
      return { eventType: "copy.stop", payload: parsed, deleteMessage: false };
    }
    case "/subscribe":
    case "/billing":
    case "/cancel":
      return { eventType: "subscription.view", payload: {}, deleteMessage: false };
    case "/dashboard":
      return { eventType: "dashboard.request", payload: {}, deleteMessage: false };
    case "/strategies":
      return { eventType: "strategy.list", payload: {}, deleteMessage: false };
    case "/setkey": {
      if (chat.type !== "private") {
        throw new Error("API keys can only be submitted in a private chat with the bot.");
      }

      if (args.length < 3) {
        throw new Error("Key format: /setkey <exchange> <api_key> <api_secret> [label]");
      }

      const parsed = keySubmitPayloadSchema.parse({
        exchange: args[0].toLowerCase(),
        api_key: args[1],
        api_secret: args[2],
        label: args.slice(3).join(" ") || undefined
      });

      return { eventType: "key.submit", payload: parsed, deleteMessage: true };
    }
    default:
      throw new Error(`Unsupported command: ${parts[0] ?? ""}`);
  }
}
