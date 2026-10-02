import { h } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { Arrow, Bracket, Cells, Drawing, Label, Responsive, cellsSize, idsFor, iso, onTop, pts } from "../src/kit";

const html = (node: preact.VNode<any>) => render(node);
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("geometry", () => {
  it("projects isometrically: +x down-right, +y down-left, +z up", () => {
    const P = iso(100, 50);
    expect(P(0, 0, 0)).toEqual([100, 50]);
    const [x1, y1] = P(10, 0, 0);
    expect(x1).toBeCloseTo(108.66, 2);
    expect(y1).toBeCloseTo(55, 2);
    const [x2, y2] = P(0, 10, 0);
    expect(x2).toBeCloseTo(91.34, 2);
    expect(y2).toBeCloseTo(55, 2);
    expect(P(0, 0, 7)).toEqual([100, 43]);
  });
  it("formats points and face transforms", () => {
    expect(pts([[1, 2], [3.14159, 4]])).toBe("1,2 3.14,4");
    expect(onTop([5, 6])).toBe(`matrix(${Math.cos(Math.PI / 6)} 0.5 ${-Math.cos(Math.PI / 6)} 0.5 5 6)`);
  });
});

describe("Drawing", () => {
  it("is an image labelled by its own title and description", () => {
    const s = html(h(Drawing, { id: "f1", width: 300, height: 100, title: "T", desc: "D" }, h("rect", {})));
    expect(s).toContain('role="img"');
    expect(s).toContain('aria-labelledby="f1-t f1-d"');
    expect(s).toContain('<title id="f1-t">T</title>');
    expect(s).toContain('<desc id="f1-d">D</desc>');
    expect(s).toContain('viewBox="0 0 300 100"');
    expect(s).toContain('id="f1-hatch"');
    expect(s).toContain('id="f1-arrow"');
    expect(idsFor("f1")).toEqual({ hatch: "url(#f1-hatch)", arrow: "url(#f1-arrow)" });
  });
  it("Responsive renders both compositions", () => {
    const s = html(h(Responsive, { wide: h("i", {}, "W"), narrow: h("i", {}, "N") }));
    expect(s).toContain('class="k-resp__wide"><i>W</i>');
    expect(s).toContain('class="k-resp__narrow"><i>N</i>');
  });
});

describe("Label", () => {
  it("draws a leader and an uppercase label", () => {
    const s = html(h("svg", {}, h(Label, { at: [10, 10], text: "Checksum bits" })));
    expect(s).toContain("CHECKSUM BITS");
    expect(count(s, "<line")).toBe(1);
  });
});

describe("Cells", () => {
  it("draws one cell per value with its role class, strong cells saturated", () => {
    const s = html(h("svg", {}, h(Cells, { x: 0, y: 0, values: ["1", "0", "1"], roleOf: (i: number) => (i === 2 ? "check" : "secret"), strong: (i: number) => i !== 1 })));
    expect(count(s, "<rect")).toBe(3);
    expect(count(s, "k-mark--secret")).toBe(1);
    expect(count(s, "k-fill--secret")).toBe(1);
    expect(count(s, "k-mark--check")).toBe(1);
  });
  it("adds a cut mark before every n-th cell", () => {
    const s = html(h("svg", {}, h(Cells, { x: 0, y: 0, values: Array(22).fill(""), cutEvery: 11, text: false })));
    expect(count(s, 'class="k-cut"')).toBe(1);
  });
  it("hidden cells use the drawing's hatch", () => {
    const s = html(h("svg", {}, h(Cells, { x: 0, y: 0, values: ["?"], roleOf: () => "hidden" as const, hatch: "url(#x-hatch)" })));
    expect(s).toContain("fill:url(#x-hatch)");
  });
  it("measures rows", () => {
    expect(cellsSize(132, { size: 13, perRow: 44, rowGap: 6 })).toEqual({ width: 572, height: 3 * 13 + 2 * 6, rows: 3 });
  });
  it("Bracket labels a range", () => {
    expect(html(h("svg", {}, h(Bracket, { x1: 0, x2: 100, y: 0, text: "11 bits" })))).toContain("11 BITS");
  });
});

describe("Arrow", () => {
  it("uses the drawing's arrow marker", () => {
    const s = html(h("svg", {}, h(Arrow, { d: "M0 0 H10", ids: idsFor("z") })));
    expect(s).toContain('marker-end="url(#z-arrow)"');
  });
});
