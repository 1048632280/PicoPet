import "./style.css";

export function boot(): string {
  const canvas = document.querySelector<HTMLCanvasElement>("#pet-canvas");
  if (!canvas) {
    throw new Error("pet canvas is missing");
  }
  canvas.dataset.ready = "true";
  return "PicoPet ready";
}
