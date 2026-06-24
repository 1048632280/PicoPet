import { PhysicalPosition } from "@tauri-apps/api/window";

export type WindowPosition = {
  x: number;
  y: number;
};

export type DragWindowApi = {
  startDragging(): Promise<void>;
  outerPosition(): Promise<WindowPosition>;
  setPosition(position: PhysicalPosition): Promise<void>;
};

export async function readPositionAfterNativeDrag(windowApi: DragWindowApi): Promise<WindowPosition> {
  await windowApi.startDragging();
  return windowApi.outerPosition();
}

export async function persistPositionAfterDrag(
  windowApi: DragWindowApi,
  savePosition: (x: number, y: number) => Promise<unknown>
): Promise<WindowPosition> {
  const position = await readPositionAfterNativeDrag(windowApi);
  await savePosition(position.x, position.y);
  return position;
}

export async function moveWindowTo(windowApi: DragWindowApi, x: number, y: number): Promise<void> {
  await windowApi.setPosition(new PhysicalPosition(Math.round(x), Math.round(y)));
}
