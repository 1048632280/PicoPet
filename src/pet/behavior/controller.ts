import { createQuietBehaviorTiming, nextQuietWalkAt } from "./timing";
import type { BehaviorSnapshot } from "./types";
import type { BehaviorConfig } from "../../tauri/commands";

export type BehaviorControllerOptions = {
  config: BehaviorConfig;
  now: number;
};

export type BehaviorController = {
  snapshot(): BehaviorSnapshot;
  update(now: number): BehaviorSnapshot;
  pointerDown(now: number): BehaviorSnapshot;
  shortPress(now: number): BehaviorSnapshot;
  dragComplete(now: number): BehaviorSnapshot;
  setPaused(paused: boolean, now: number): BehaviorSnapshot;
  setHidden(hidden: boolean, now: number): BehaviorSnapshot;
  setConfig(config: BehaviorConfig, now: number): BehaviorSnapshot;
};

export function createBehaviorController(options: BehaviorControllerOptions): BehaviorController {
  const timing = createQuietBehaviorTiming();
  let pressStartedWhileSleeping = false;
  let snapshot: BehaviorSnapshot = {
    state: "idle",
    stateStartedAt: options.now,
    lastInteractionAt: options.now,
    nextWalkAt: nextQuietWalkAt(options.now),
    config: options.config,
    paused: false,
    hidden: false
  };

  function enter(state: BehaviorSnapshot["state"], now: number) {
    snapshot = {
      ...snapshot,
      state,
      stateStartedAt: now
    };
  }

  function resetInteraction(now: number) {
    snapshot = {
      ...snapshot,
      lastInteractionAt: now,
      nextWalkAt: nextQuietWalkAt(now)
    };
  }

  function autonomousEnabled() {
    return snapshot.config.enabled && !snapshot.paused && !snapshot.hidden;
  }

  function leaveWalk(now: number) {
    snapshot = {
      ...snapshot,
      state: "idle",
      stateStartedAt: now,
      nextWalkAt: nextQuietWalkAt(now)
    };
  }

  return {
    snapshot() {
      return snapshot;
    },
    update(now) {
      if (!autonomousEnabled()) {
        if (snapshot.state !== "dragged") {
          enter("idle", now);
        }
        return snapshot;
      }

      if (snapshot.state === "happy" && now - snapshot.stateStartedAt >= timing.happyDurationMs) {
        enter("idle", now);
      }

      if (snapshot.state === "walk" && now - snapshot.stateStartedAt >= timing.walkDurationMs) {
        leaveWalk(now);
      }

      if (snapshot.state === "idle") {
        if (now - snapshot.lastInteractionAt >= snapshot.config.sleep_after_idle_seconds * 1000) {
          enter("sleep", now);
        } else if (now >= snapshot.nextWalkAt && snapshot.config.walk_mode === "short_range") {
          enter("walk", now);
        }
      }

      return snapshot;
    },
    pointerDown(now) {
      pressStartedWhileSleeping = snapshot.state === "sleep";
      resetInteraction(now);
      enter("dragged", now);
      return snapshot;
    },
    shortPress(now) {
      const wasSleeping = snapshot.state === "sleep" || pressStartedWhileSleeping;
      pressStartedWhileSleeping = false;
      resetInteraction(now);
      if (!snapshot.config.enabled || snapshot.paused || wasSleeping) {
        enter("idle", now);
      } else {
        enter("happy", now);
      }
      return snapshot;
    },
    dragComplete(now) {
      pressStartedWhileSleeping = false;
      resetInteraction(now);
      enter("idle", now);
      return snapshot;
    },
    setPaused(paused, now) {
      snapshot = {
        ...snapshot,
        paused
      };
      if (paused && snapshot.state !== "dragged") {
        enter("idle", now);
      }
      return snapshot;
    },
    setHidden(hidden, now) {
      snapshot = {
        ...snapshot,
        hidden
      };
      if (hidden && snapshot.state !== "dragged") {
        enter("idle", now);
      }
      return snapshot;
    },
    setConfig(config, now) {
      snapshot = {
        ...snapshot,
        config
      };
      if (!config.enabled && snapshot.state !== "dragged") {
        enter("idle", now);
      }
      return snapshot;
    }
  };
}
