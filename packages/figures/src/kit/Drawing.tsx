import type { ComponentChildren } from "preact";

export interface DrawingIds {
  /** `fill` value for hidden/unknown areas: 45° hatch. */
  hatch: string;
  /** `marker-end` value for arrows. */
  arrow: string;
}

export const idsFor = (id: string): DrawingIds => ({ hatch: `url(#${id}-hatch)`, arrow: `url(#${id}-arrow)` });

interface DrawingProps {
  /** Unique within the page; prefixes the title, desc, hatch and arrow ids. */
  id: string;
  width: number;
  height: number;
  /** Short name read first by assistive technology. */
  title: string;
  /** Full text equivalent, generated from the same data as the drawing. */
  desc: string;
  children?: ComponentChildren;
}

/** Root of every kit drawing: a scalable SVG image with its own text equivalent. */
export function Drawing({ id, width, height, title, desc, children }: DrawingProps) {
  return (
    <svg class="k-drawing" viewBox={`0 0 ${width} ${height}`} style={`--k-w:${width}px`} role="img" aria-labelledby={`${id}-t ${id}-d`}>
      <title id={`${id}-t`}>{title}</title>
      <desc id={`${id}-d`}>{desc}</desc>
      <defs>
        <pattern id={`${id}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" class="k-hatch-bg" />
          <line x1="0" y1="0" x2="0" y2="5" class="k-hatch" />
        </pattern>
        <marker id={`${id}-arrow`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M1 1 L7 4 L1 7" class="k-arrowhead" />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

/**
 * Two compositions of one drawing. CSS shows `wide` from 48rem up and
 * `narrow` below; the hidden one is display:none, so it is also hidden from
 * assistive technology. Give the two Drawings different ids.
 */
export function Responsive({ wide, narrow }: { wide: ComponentChildren; narrow: ComponentChildren }) {
  return (
    <div class="k-resp">
      <div class="k-resp__wide">{wide}</div>
      <div class="k-resp__narrow">{narrow}</div>
    </div>
  );
}
