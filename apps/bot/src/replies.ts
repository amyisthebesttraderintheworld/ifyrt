import type { EventType } from "@ifyrt/contracts";

export const helpText = `/start
/help
/backtest <strategy> <symbol> <from> <to> [exchange]
/simulate <strategy> <symbol> [exchange]
/sim_stop
/status
/live_on
/live_off
/copy <leader> [sim|live]
/copy follow <leader> [sim|live]
/copy_stop [leader]
/subscribe
/dashboard
/strategies
/setkey <exchange> <api_key> <api_secret> [label]`;

export function acknowledgementFor(eventType: EventType): string {
  switch (eventType) {
    case "user.start":
      return "Welcome to Ifyrt. Your onboarding request is on the way.";
    case "user.help":
      return helpText;
    case "backtest.request":
      return "Backtest request received. I’m handing it off for execution.";
    case "simulation.start":
      return "Real-time simulation request received.";
    case "simulation.stop":
      return "Simulation stop request received.";
    case "user.status":
      return "Status request received.";
    case "live.enable":
      return "Live mode enable request received. Access and key checks will run next.";
    case "live.disable":
      return "Live mode disable request received.";
    case "copy.start":
      return "Copy-trading request received.";
    case "copy.stop":
      return "Copy-trading stop request received.";
    case "subscription.view":
      return "Subscription details are being prepared, including checkout or billing options if available.";
    case "dashboard.request":
      return "Dashboard access request received.";
    case "strategy.list":
      return "Fetching available strategies.";
    case "key.submit":
      return "Key submission received. The original message was removed and the secure flow has started.";
  }
}

export function formatUserError(message: string): string {
  return `${message}\n\nUse /help to see the supported commands and formats.`;
}
