import { describe, expect, it } from "vitest";
import { createBehaviorController } from "./controller";
import type { BehaviorConfig } from "../../tauri/commands";

const behaviorConfig: BehaviorConfig = {
  enabled: true,
  preset: "quiet",
  walk_mode: "short_range",
  sleep_after_idle_seconds: 900
};

function controller(now = 0) {
  return createBehaviorController({
    config: behaviorConfig,
    now
  });
}

describe("BehaviorController", () => {
  it("starts in idle and schedules a quiet walk", () => {
    const behavior = controller(1000);

    expect(behavior.snapshot()).toMatchObject({
      state: "idle",
      stateStartedAt: 1000,
      lastInteractionAt: 1000,
      nextWalkAt: 241000
    });
  });

  it("protects internal state from external snapshot mutation", () => {
    const behavior = createBehaviorController({
      config: {
        ...behaviorConfig
      },
      now: 1000
    });

    const directSnapshot = behavior.snapshot();
    directSnapshot.state = "sleep";
    directSnapshot.config.enabled = false;

    expect(behavior.snapshot()).toMatchObject({
      state: "idle",
      config: {
        enabled: true
      }
    });

    const returnedSnapshot = behavior.pointerDown(1100);
    returnedSnapshot.state = "sleep";
    returnedSnapshot.config.sleep_after_idle_seconds = 1;

    expect(behavior.snapshot()).toMatchObject({
      state: "dragged",
      config: {
        sleep_after_idle_seconds: 900
      }
    });
  });

  it("enters happy after a short press and returns to idle after the happy duration", () => {
    const behavior = controller();

    behavior.pointerDown(100);
    behavior.shortPress(200);

    expect(behavior.snapshot().state).toBe("happy");

    behavior.update(1601);

    expect(behavior.snapshot().state).toBe("idle");
  });

  it("enters sleep after the configured idle timeout", () => {
    const behavior = controller(0);

    behavior.update(900_001);

    expect(behavior.snapshot().state).toBe("sleep");
  });

  it("wakes from sleep with a short press instead of starting happy", () => {
    const behavior = controller(0);

    behavior.update(900_001);
    behavior.pointerDown(900_100);
    behavior.shortPress(900_150);

    expect(behavior.snapshot().state).toBe("idle");
  });

  it("enters dragged on pointer down and returns to idle after drag completion", () => {
    const behavior = controller();

    behavior.pointerDown(10);
    expect(behavior.snapshot().state).toBe("dragged");

    behavior.dragComplete(50);
    expect(behavior.snapshot().state).toBe("idle");
  });

  it("does not start autonomous walk or sleep while paused", () => {
    const behavior = controller(0);

    behavior.setPaused(true, 10);
    behavior.update(1_000_000);

    expect(behavior.snapshot().state).toBe("idle");
  });

  it("starts a quiet short-range walk when the next walk time arrives", () => {
    const behavior = controller(0);

    behavior.update(240000);

    expect(behavior.snapshot().state).toBe("walk");
  });

  it("disables autonomous behavior when behavior config is disabled", () => {
    const behavior = createBehaviorController({
      config: {
        ...behaviorConfig,
        enabled: false
      },
      now: 0
    });

    behavior.update(1_000_000);

    expect(behavior.snapshot().state).toBe("idle");
  });
});
