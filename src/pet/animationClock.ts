export function frameIndexAt(elapsedMs: number, fps: number, frameCount: number): number {
  if (fps <= 0 || frameCount <= 0) {
    return 0;
  }
  const frameDurationMs = 1000 / fps;
  return Math.floor(elapsedMs / frameDurationMs) % frameCount;
}

export function shouldRenderFrame(previousMs: number, nowMs: number, fps: number): boolean {
  if (fps <= 0) {
    return false;
  }
  return nowMs - previousMs >= 1000 / fps;
}
