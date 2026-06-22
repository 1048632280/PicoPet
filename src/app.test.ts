import { beforeEach, describe, expect, it, vi } from "vitest";
import { boot } from "./app";

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: ""
  } as unknown as CanvasRenderingContext2D);
});

describe("boot", () => {
  it("marks the pet canvas as ready", () => {
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';

    expect(boot()).toBe("PicoPet ready");
    expect(document.querySelector("#pet-canvas")?.getAttribute("data-ready")).toBe("true");
  });
});
