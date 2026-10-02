/** Screen point in SVG user units. */
export type Pt = [number, number];

export const COS30 = Math.cos(Math.PI / 6);
export const SIN30 = 0.5;

/**
 * Isometric projection around a screen origin (ox, oy): +x runs down-right,
 * +y runs down-left, +z runs straight up. One unit along any axis is one
 * user unit of screen length.
 */
export function iso(ox: number, oy: number) {
  return (x: number, y: number, z = 0): Pt => [ox + (x - y) * COS30, oy + (x + y) * SIN30 - z];
}

/** Polygon `points` attribute, two decimals at most. */
export const pts = (p: Pt[]) => p.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(" ");

/** Transform that lays text flat on an isometric top face, reading along +x. */
export const onTop = ([x, y]: Pt) => `matrix(${COS30} ${SIN30} ${-COS30} ${SIN30} ${x} ${y})`;

/** Transform for text on a box's front-left face (constant y), reading along +x. */
export const onLeft = ([x, y]: Pt) => `matrix(${COS30} ${SIN30} 0 1 ${x} ${y})`;
