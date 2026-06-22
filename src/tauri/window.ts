export type DragWindowApi = {
  startDragging(): Promise<void>;
  outerPosition(): Promise<{ x: number; y: number }>;
};

export async function persistPositionAfterDrag(
  windowApi: DragWindowApi,
  savePosition: (x: number, y: number) => Promise<unknown>
): Promise<void> {
  await windowApi.startDragging();
  const position = await windowApi.outerPosition();
  await savePosition(position.x, position.y);
}
