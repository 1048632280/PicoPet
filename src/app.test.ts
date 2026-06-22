import { describe, expect, it } from "vitest";
import { boot } from "./app";

describe("boot", () => {
  it("marks the pet canvas as ready", () => {
    document.body.innerHTML = '<canvas id="pet-canvas"></canvas>';

    expect(boot()).toBe("PicoPet ready");
    expect(document.querySelector("#pet-canvas")?.getAttribute("data-ready")).toBe("true");
  });
});
