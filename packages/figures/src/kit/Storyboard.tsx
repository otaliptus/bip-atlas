import type { ComponentChildren } from "preact";
import { Drawing, idsFor, type DrawingIds } from "./Drawing";

export interface Frame {
  /** One sentence under the frame, visible to everyone. */
  note: string;
  /** Text equivalent of the drawing. */
  desc: string;
  draw: (ids: DrawingIds) => ComponentChildren;
}

/**
 * The same scene drawn several times with one change per frame (Making
 * Software's storyboards). Frames share one viewBox so they line up; the grid
 * reflows from three columns to one.
 */
export function Storyboard({ id, title, width, height, frames }: { id: string; title: string; width: number; height: number; frames: Frame[] }) {
  return (
    <ol class="k-story" aria-label={title} style={`--k-frame:${width}px`}>
      {frames.map((f, i) => (
        <li class="k-story__frame">
          <Drawing id={`${id}-${i}`} width={width} height={height} title={`${title}, step ${i + 1} of ${frames.length}`} desc={f.desc}>
            {f.draw(idsFor(`${id}-${i}`))}
          </Drawing>
          <p class="k-story__note">
            <span class="k-story__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span> {f.note}
          </p>
        </li>
      ))}
    </ol>
  );
}
