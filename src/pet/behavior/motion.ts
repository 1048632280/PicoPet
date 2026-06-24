import type { AnchorPosition } from "./types";

export type ShortRangeWalkPosition = {
  x: number;
  y: number;
  offsetX: number;
  complete: boolean;
};

export function shortRangeWalkPosition(
  anchor: AnchorPosition,
  elapsedMs: number,
  durationMs: number,
  distancePx: number,
  direction: 1 | -1
): ShortRangeWalkPosition {
  const safeDuration = Math.max(1, durationMs);
  const progress = Math.min(Math.max(elapsedMs / safeDuration, 0), 1);
  const offsetX = Math.round(Math.sin(progress * Math.PI) * distancePx * direction);

  return {
    x: anchor.x + offsetX,
    y: anchor.y,
    offsetX,
    complete: progress >= 1
  };
}
