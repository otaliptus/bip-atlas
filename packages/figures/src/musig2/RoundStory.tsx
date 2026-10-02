import { Storyboard, type Frame } from "../kit";
import type { DerivedMusig2SessionFixture } from "../types";
import { describeSession } from "./Musig2Rounds";
import { Scene, sceneHeight, stagesFor } from "./scene";

/**
 * musig2-round-story.v1 — static. One published session, stage by stage, as
 * the same table redrawn (the chapter's former worked example). Each signer's
 * secret key and nonces are drawn as a dashed pink card with no value: the
 * published vectors do not contain them, and no one else ever sees them.
 */
export function RoundStory({ fixture }: { fixture: DerivedMusig2SessionFixture }) {
  const d = fixture.derived;
  const stages = stagesFor(d);
  const W = 330;
  const H = sceneHeight(d, W, stages.length - 1, 4, true);
  const frames: Frame[] = stages.map((s, i) => ({
    note: `${s.title}. ${s.note}`,
    desc: describeSession(d, i, true),
    draw: (ids) => <Scene d={d} upto={i} reveal ids={ids} W={W} y0={4} secrets />,
  }));
  return (
    <>
      <Storyboard id="a14-story" title={`A signing session, case ${fixture.caseIndex}`} width={W} height={H} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <p class="atlas-hexlist" style="overflow-wrap:anywhere">{describeSession(d, stages.length - 1, true)}</p>
      </details>
    </>
  );
}
