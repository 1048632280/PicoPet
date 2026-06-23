export type AnimationLoopOptions = {
  isActive: () => boolean;
  tick: (now: number) => void;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
};

export type AnimationLoopController = {
  sync(): void;
  stop(): void;
  isRunning(): boolean;
};

export function createAnimationLoop(options: AnimationLoopOptions): AnimationLoopController {
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const cancelFrame = options.cancelFrame ?? cancelAnimationFrame;
  let frameHandle: number | null = null;

  function run(now: number) {
    frameHandle = null;
    if (!options.isActive()) {
      return;
    }

    options.tick(now);

    if (options.isActive()) {
      frameHandle = requestFrame(run);
    }
  }

  const controller: AnimationLoopController = {
    sync() {
      if (!options.isActive()) {
        controller.stop();
        return;
      }

      if (frameHandle === null) {
        frameHandle = requestFrame(run);
      }
    },
    stop() {
      if (frameHandle !== null) {
        cancelFrame(frameHandle);
        frameHandle = null;
      }
    },
    isRunning() {
      return frameHandle !== null;
    }
  };

  return controller;
}
