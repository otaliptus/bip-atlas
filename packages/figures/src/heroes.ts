/**
 * Pre-rendered heroes (see heroStates.ts): each recipe's state spec and the
 * drawing HeroStates.astro renders once per state. Server-only, like
 * statics.ts; the page script that switches states lives in HeroStates.astro.
 */
import type { ComponentType } from "preact";
import { Bip321LinkReader, bip321HeroSpec } from "./bip321/Bip321LinkReader";
import { Bip67KeyOrder, bip67HeroSpec } from "./bip67/Bip67KeyOrder";
import { Bip85Applications, bip85HeroSpec } from "./bip85/Bip85Applications";
import type { HeroSpec } from "./heroStates";
import { P2shTwoStage, p2shHeroSpec } from "./p2sh/P2shTwoStage";
import { PsbtEnvelope, psbtHeroSpec } from "./psbt/PsbtEnvelope";
import { TimelockFields, timelockHeroSpec } from "./timelock/TimelockFields";
import { TransactionAnatomy, transactionHeroSpec } from "./tx/TransactionAnatomy";

export interface PrerenderedHero {
  spec: (fixtures: any[]) => HeroSpec<unknown>;
  component: ComponentType<any>;
  /** Props for one state's drawing; `figureId` is already unique per state. */
  props: (fixtures: any[], figureId: string, initial: unknown) => Record<string, unknown>;
}

const allFixtures = (fixtures: unknown[], figureId: string, initial: unknown) => ({ fixtures, figureId, initial });

export const PRERENDERED_HEROES: Record<string, PrerenderedHero> = {
  "bip85-applications.v1": { spec: bip85HeroSpec, component: Bip85Applications, props: allFixtures },
  "bip321-link-reader.v1": { spec: bip321HeroSpec, component: Bip321LinkReader, props: allFixtures },
  "bip67-key-order.v1": { spec: bip67HeroSpec, component: Bip67KeyOrder, props: allFixtures },
  "transaction-anatomy.v1": { spec: transactionHeroSpec, component: TransactionAnatomy, props: allFixtures },
  "psbt-envelope.v1": { spec: (f) => psbtHeroSpec(f[0]), component: PsbtEnvelope, props: (f, figureId, initial) => ({ fixture: f[0], figureId, initial }) },
  "p2sh-two-stage.v1": { spec: p2shHeroSpec, component: P2shTwoStage, props: allFixtures },
  "timelock-fields.v1": { spec: timelockHeroSpec, component: TimelockFields, props: allFixtures },
};
