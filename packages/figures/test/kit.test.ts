import { h } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { Arrow, Boundary, Bracket, Cells, Computer, Drawing, KeyGlyph, Packet, packetSize, IsoBox, IsoTopGrid, Label, Machine, Magnifier, Responsive, Storyboard, Tag, boxPoints, cellsSize, idsFor, iso, onTop, pts } from "../src/kit";

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

describe("isometric objects", () => {
  it("IsoBox draws three faces carrying its role", () => {
    const s = html(h("svg", {}, h(IsoBox, { at: [100, 20], w: 40, d: 20, h: 10, role: "hash" })));
    expect(count(s, "<polygon")).toBe(3);
    expect(s).toContain('data-role="hash"');
    expect(s).toContain("k-face--top");
  });
  it("boxPoints puts the top face's front corner below its back corner", () => {
    const b = boxPoints({ at: [100, 20], w: 40, d: 20, h: 10 });
    expect(b.topFront[1]).toBeGreaterThan(b.top[1]);
    expect(b.bottomFront[1] - b.topFront[1]).toBeCloseTo(10, 5);
  });
  it("IsoTopGrid draws rows × cols cells", () => {
    const s = html(h("svg", {}, h(IsoTopGrid, { at: [0, 0], w: 40, d: 20, h: 5, cols: 4, rows: 2 })));
    expect(count(s, "<polygon")).toBe(8);
  });
  it("Machine names its function on the box", () => {
    const s = html(h("svg", {}, h(Machine, { at: [50, 10], label: "sha-256", sub: "hash" })));
    expect(s).toContain("SHA-256");
    expect(s).toContain(">hash<");
  });
});

describe("Magnifier", () => {
  it("clips its content to the lens", () => {
    const s = html(h("svg", {}, h(Magnifier, { id: "m", from: [10, 10], at: [80, 40], r: 20 }, h("rect", { width: 5, height: 5 }))));
    expect(s).toContain('<clipPath id="m-clip">');
    expect(s).toContain('clip-path="url(#m-clip)"');
  });
});

describe("Storyboard", () => {
  it("renders an ordered list of titled frames with notes", () => {
    const frames = [1, 2, 3].map((n) => ({ note: `Note ${n}`, desc: `Desc ${n}`, draw: () => h("rect", {}) }));
    const s = html(h(Storyboard, { id: "sb", title: "Checksum", width: 300, height: 150, frames }));
    expect(s.startsWith('<ol class="k-story"')).toBe(true);
    expect(count(s, '<li class="k-story__frame">')).toBe(3);
    expect(s).toContain("Checksum, step 2 of 3");
    expect(s).toContain("Note 3");
    expect(s).toContain('id="sb-2-t"');
  });
});

describe("glyphs", () => {
  it("KeyGlyph carries its role and optional label", () => {
    const s = html(h("svg", {}, h(KeyGlyph, { at: [0, 0], role: "public", label: "internal key P" })));
    expect(s).toContain('data-role="public"');
    expect(s).toContain("INTERNAL KEY P");
  });
  it("Computer is labelled", () => expect(html(h("svg", {}, h(Computer, { at: [0, 0], label: "observer" })))).toContain("OBSERVER"));
  it("Boundary is a dashed line with a label", () => {
    const s = html(h("svg", {}, h(Boundary, { x: 50, y1: 0, y2: 100, label: "what the chain sees" })));
    expect(s).toContain("k-boundary");
    expect(s).toContain("WHAT THE CHAIN SEES");
  });
});

describe("Packet", () => {
  const fields = [
    { id: "a", label: "hash_type", bytes: 12, role: "sig" as const },
    { id: "b", label: "nVersion", bytes: 4 },
    { id: "c", label: "sha_prevouts", bytes: 32, role: "hash" as const },
  ];
  it("wraps fields across rows and repeats the label of a continued field", () => {
    const s = html(h("svg", {}, h(Packet, { x: 0, y: 0, fields, perRow: 16, unit: 10 })));
    expect(s).toContain(">hash_type · 12 B<");
    expect(s).toContain("sha_prevouts …cont");
    expect(packetSize(fields, 16, 10, 22).rows).toBe(3);
  });
  it("draws a byte ruler", () => {
    const s = html(h("svg", {}, h(Packet, { x: 0, y: 0, fields, perRow: 16, unit: 10, ruler: true })));
    expect(s).toContain(">0<");
    expect(s).toContain(">8<");
  });
});

describe("Tag", () => {
  it("draws a leader and keeps the label's case", () => {
    const s = html(h("svg", {}, h(Tag, { at: [10, 10], text: "private key k" })));
    expect(s).toContain(">private key k<");
    expect(count(s, "<line")).toBe(1);
    const left = html(h("svg", {}, h(Tag, { at: [100, 10], text: "M", side: "left" })));
    expect(left).toContain('text-anchor="end"');
    expect(left).toContain('x2="86"');
  });
});
