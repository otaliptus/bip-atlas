import { iso, onLeft, pts, type Pt } from "./geom";
import type { Role } from "./roles";

export interface BoxGeom {
  /** Screen point of the box's back corner at ground level (iso origin). */
  at: Pt;
  /** Extent along +x (down-right), +y (down-left) and +z (up). */
  w: number;
  d: number;
  h: number;
}

/** Projected corner and face anchors of a box, for labels and arrows. */
export function boxPoints({ at, w, d, h }: BoxGeom) {
  const P = iso(at[0], at[1]);
  return {
    P,
    /** Back corner of the top face. */
    top: P(0, 0, h),
    topCenter: P(w / 2, d / 2, h),
    topFront: P(w, d, h),
    bottomFront: P(w, d, 0),
    /** Middle of the front-left face. */
    left: P(w / 2, d, h / 2),
    /** Middle of the front-right face. */
    right: P(w, d / 2, h / 2),
    /** Leftmost and rightmost silhouette points, mid-height. */
    frontLeft: P(0, d, h / 2),
    frontRight: P(w, 0, h / 2),
  };
}

/** A box in isometric projection: top, front-left and front-right faces. */
export function IsoBox({ at, w, d, h, role = "plain", hatch, cls = "" }: BoxGeom & { role?: Role; hatch?: string; cls?: string }) {
  const P = iso(at[0], at[1]);
  const top: Pt[] = [P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)];
  const left: Pt[] = [P(0, d, h), P(w, d, h), P(w, d, 0), P(0, d, 0)];
  const right: Pt[] = [P(w, 0, h), P(w, d, h), P(w, d, 0), P(w, 0, 0)];
  return (
    <g class={`k-iso ${cls}`.trim()} data-role={role}>
      <polygon class="k-face k-face--left" points={pts(left)} />
      <polygon class="k-face k-face--right" points={pts(right)} />
      <polygon class="k-face k-face--top" points={pts(top)} style={role === "hidden" && hatch ? `fill:${hatch}` : undefined} />
    </g>
  );
}

/** Grid of cells on a box's top face: columns along +x, rows along +y. */
export function IsoTopGrid({ at, w, d, h, cols, rows, roleOf = () => "plain" }: BoxGeom & { cols: number; rows: number; roleOf?: (i: number) => Role }) {
  const P = iso(at[0], at[1]);
  const cw = w / cols;
  const rd = d / rows;
  return (
    <g class="k-isogrid">
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return (
          <polygon
            class={`k-cell k-fill--${roleOf(i)}`}
            points={pts([P(c * cw, r * rd, h), P((c + 1) * cw, r * rd, h), P((c + 1) * cw, (r + 1) * rd, h), P(c * cw, (r + 1) * rd, h)])}
          />
        );
      })}
    </g>
  );
}

/** A function drawn as an isometric box with its name on the front-left face (SHA-256, PBKDF2, TapTweak). */
export function Machine({ at, w = 76, d = 40, h = 34, label, sub, role = "plain" }: { at: Pt; w?: number; d?: number; h?: number; label: string; sub?: string; role?: Role }) {
  const P = iso(at[0], at[1]);
  return (
    <g class="k-machine">
      <IsoBox at={at} w={w} d={d} h={h} role={role} />
      <text class="k-machine__t" transform={onLeft(P(7, d, h - 13))}>{label.toUpperCase()}</text>
      {sub ? <text class="k-machine__s" transform={onLeft(P(7, d, h - 25))}>{sub}</text> : null}
    </g>
  );
}
