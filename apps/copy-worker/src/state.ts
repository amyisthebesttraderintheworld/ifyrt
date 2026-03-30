import type {
  CopyFanoutRequest,
  CopyFanoutResponse,
  CopyStopRequest,
  CopyStopResponse
} from "@ifyrt/contracts";

export interface ActiveCopyRoute {
  follower_id: string;
  leader_id: string;
  mode: "sim" | "live";
  last_signal_at: string;
}

export interface CopyRouteStore {
  routes: Map<string, ActiveCopyRoute>;
}

function routeKey(followerId: string, leaderId: string): string {
  return `${followerId}:${leaderId}`;
}

export function createCopyRouteStore(): CopyRouteStore {
  return {
    routes: new Map<string, ActiveCopyRoute>()
  };
}

export function planCopyFanout(
  store: CopyRouteStore,
  request: CopyFanoutRequest,
  now = new Date()
): CopyFanoutResponse {
  const planned = request.followers.map((follower) => {
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

    if (follower.mode === "live" && follower.tier !== "paid") {
      return {
        follower_id: follower.follower_id,
        mode: follower.mode,
        status: "skipped" as const,
        reason: "Live copy requires a paid subscription."
      };
    }

    if (follower.mode === "live" && !follower.live_mode_enabled) {
      return {
        follower_id: follower.follower_id,
        mode: follower.mode,
        status: "skipped" as const,
        reason: "Live copy requires live mode to be enabled."
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

    if (follower.mode === "live" && follower.circuit_breaker_active) {
      return {
        follower_id: follower.follower_id,
        mode: follower.mode,
        status: "skipped" as const,
        reason: "Live copy is blocked by an active circuit breaker."
      };
    }

    store.routes.set(routeKey(follower.follower_id, request.signal.leader_id), {
      follower_id: follower.follower_id,
      leader_id: request.signal.leader_id,
      mode: follower.mode,
      last_signal_at: now.toISOString()
    });

    return {
      follower_id: follower.follower_id,
      mode: follower.mode,
      status: "pending" as const
    };
  });

  return {
    signal: request.signal,
    planned,
    active_routes: store.routes.size
  };
}

export function stopCopyRoutes(store: CopyRouteStore, request: CopyStopRequest): CopyStopResponse {
  let stopped = 0;

  if (request.leader_id) {
    const deleted = store.routes.delete(routeKey(request.follower_id, request.leader_id));
    stopped = deleted ? 1 : 0;
  } else {
    for (const key of Array.from(store.routes.keys())) {
      if (key.startsWith(`${request.follower_id}:`)) {
        store.routes.delete(key);
        stopped += 1;
      }
    }
  }

  return {
    accepted: true,
    stopped_routes: stopped,
    follower_id: request.follower_id,
    leader_id: request.leader_id,
    reason: request.reason
  };
}

export function activeCopyRouteCount(store: CopyRouteStore): number {
  return store.routes.size;
}
