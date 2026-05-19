/**
 * AI electronic-warfare advisor — ECM positioning awareness.
 *
 * Per `add-ai-advanced-systems` design D2: the engine ships a complete
 * electronic-warfare module (`src/utils/gameplay/electronicWarfare/`) —
 * ECM bubbles, ECCM countering, BAP probe counters — and the bot consults
 * none of it. This advisor consumes that module (without modifying it) and
 * advises move scoring:
 *
 *   - **avoidance** — a destination inside a hostile ECM bubble earns a
 *     penalty. Hostile ECM degrades the bot's own electronics (C3, targeting
 *     computers, Artemis), so the bot prefers clean hexes.
 *   - **coverage** — when the moving unit carries an ECM suite or a BAP
 *     probe, a destination whose ECM bubble covers more lancemates, or whose
 *     probe counters an enemy ECM source, earns a bonus.
 *
 * **Scope boundary (design D2 / proposal Non-Goals):** this advisor only
 * *reads* electronic-warfare state. It never writes the EW module and never
 * touches combat to-hit resolution. A missing core-engine ECM to-hit
 * modifier is a flagged separate change, not A4's concern.
 *
 * This module is a pure deterministic function of unit / EW state — it never
 * consumes `SeededRandom` (design D6).
 *
 * @spec openspec/changes/add-ai-advanced-systems/specs/simulation-system/spec.md
 *   Requirement: AI Electronic-Warfare Awareness
 */

import type { IHexCoordinate } from '@/types/gameplay';
import type {
  IActiveProbe,
  IECMSuite,
  IElectronicWarfareState,
} from '@/utils/gameplay/electronicWarfare';

import {
  canBAPCounterECM,
  getEnemyECMSources,
  getFriendlyECMSources,
} from '@/utils/gameplay/electronicWarfare';

import type { IAIUnitState } from './types';

/**
 * The advice an `AIElectronicWarfareAdvisor` produces for one candidate
 * destination. Both fields are non-negative magnitudes; `scoreMove` combines
 * them as `coverageBonus - hostileBubblePenalty`, each scaled by its tier
 * weight.
 */
export interface IElectronicWarfareAdvice {
  /** Penalty magnitude for ending inside a hostile ECM bubble (>= 0). */
  readonly hostileBubblePenalty: number;
  /** Bonus magnitude for an ECM/probe carrier covering or countering (>= 0). */
  readonly coverageBonus: number;
}

/** The inert advice — both terms zero. Returned on the disabled / no-data path. */
const NO_ADVICE: IElectronicWarfareAdvice = {
  hostileBubblePenalty: 0,
  coverageBonus: 0,
};

/**
 * The inputs `adviseDestination` needs beyond the destination hex. The
 * moving unit's team id keys the friend/foe split in the EW module; the EW
 * state is the live electronic-warfare snapshot the caller threads in
 * (the advisor never mutates it).
 */
export interface IElectronicWarfareContext {
  /** The team id of the moving unit — keys friendly vs. hostile EW sources. */
  readonly movingUnitTeamId: string;
  /** The live electronic-warfare snapshot. Read-only to the advisor. */
  readonly ewState: IElectronicWarfareState;
  /**
   * The moving unit's lancemates (excluding the unit itself), used to score
   * how many friendly units an ECM bubble would cover from the destination.
   * Empty / absent => coverage scores only enemy-ECM countering.
   */
  readonly lancemates?: readonly IAIUnitState[];
}

/**
 * The hostile-bubble penalty awarded per uncountered hostile ECM bubble the
 * destination sits inside. A hex inside two enemy bubbles is twice as bad as
 * one. The caller scales this raw count by `ecmAvoidanceWeight`.
 */
const HOSTILE_BUBBLE_UNIT_PENALTY = 1;

/**
 * The coverage bonus per friendly lancemate an ECM carrier's bubble would
 * cover from the destination, and per enemy ECM source a probe carrier would
 * counter from it. The caller scales this raw count by `ecmCoverageWeight`.
 */
const COVERAGE_UNIT_BONUS = 1;

/** True when the moving unit carries an operational ECM suite. */
function carriesECMSuite(
  unit: IAIUnitState,
  ewState: IElectronicWarfareState,
): IECMSuite | null {
  return (
    ewState.ecmSuites.find(
      (ecm) => ecm.entityId === unit.unitId && ecm.operational,
    ) ?? null
  );
}

/** True when the moving unit carries an operational active probe. */
function carriesProbe(
  unit: IAIUnitState,
  ewState: IElectronicWarfareState,
): IActiveProbe | null {
  return (
    ewState.activeProbes.find(
      (probe) => probe.entityId === unit.unitId && probe.operational,
    ) ?? null
  );
}

/**
 * Advise move scoring for one candidate destination of the moving unit.
 *
 *   - `hostileBubblePenalty` counts how many hostile ECM bubbles cover the
 *     destination. `getEnemyECMSources` returns exactly the operational
 *     enemy `ecm`-mode suites whose `ECM_RADIUS` bubble contains the hex —
 *     the same in-bubble test `isInECMBubble` applies per source — so each
 *     returned source adds `HOSTILE_BUBBLE_UNIT_PENALTY`.
 *   - `coverageBonus` is non-zero only when the moving unit carries an ECM
 *     suite or a probe:
 *       - ECM carrier — counts lancemates whose position would fall inside
 *         the carrier's `ECM_RADIUS` bubble centered on the destination.
 *       - Probe carrier — counts enemy ECM sources within the probe's
 *         counter range of the destination (`canBAPCounterECM`).
 *
 * The carrier's *own* ECM suite is repositioned to the destination for the
 * coverage computation by cloning it with the new position — the advisor
 * never mutates the shared EW state.
 *
 * Pure — never mutates inputs, consumes no `SeededRandom`.
 */
export function adviseDestination(
  movingUnit: IAIUnitState,
  destination: IHexCoordinate,
  context: IElectronicWarfareContext,
): IElectronicWarfareAdvice {
  const { movingUnitTeamId, ewState } = context;

  // Avoidance — count hostile ECM bubbles covering the destination.
  const hostileSources = getEnemyECMSources(
    destination,
    movingUnitTeamId,
    ewState,
  );
  const hostileBubblePenalty =
    hostileSources.length * HOSTILE_BUBBLE_UNIT_PENALTY;

  // Coverage — only an ECM/probe carrier earns coverage. A non-carrier ends
  // here with the avoidance penalty only.
  const ecmSuite = carriesECMSuite(movingUnit, ewState);
  const probe = carriesProbe(movingUnit, ewState);
  if (!ecmSuite && !probe) {
    return { hostileBubblePenalty, coverageBonus: 0 };
  }

  let coverageBonus = 0;

  // ECM-suite carrier — count lancemates the carrier's bubble would cover
  // from the destination. The bubble is the suite repositioned (cloned, not
  // mutated) to the destination; `getFriendlyECMSources` reports whether a
  // lancemate's position falls inside it.
  if (ecmSuite && ecmSuite.mode === 'ecm') {
    const repositioned: IECMSuite = { ...ecmSuite, position: destination };
    const lancemates = context.lancemates ?? [];
    for (const mate of lancemates) {
      if (mate.destroyed) continue;
      if (mate.unitId === movingUnit.unitId) continue;
      const covering = getFriendlyECMSources(mate.position, movingUnitTeamId, {
        ecmSuites: [repositioned],
        activeProbes: [],
      });
      if (covering.length > 0) {
        coverageBonus += COVERAGE_UNIT_BONUS;
      }
    }
  }

  // Probe carrier — count enemy ECM sources the probe would counter from the
  // destination. A probe that moves into counter range of an enemy ECM
  // suite neutralizes it, so positioning the probe usefully earns the bonus.
  if (probe) {
    const repositioned: IActiveProbe = { ...probe, position: destination };
    // Every hostile ECM suite on the board, not just those covering the
    // destination — the probe counters at range.
    const allHostileEcm = ewState.ecmSuites.filter(
      (ecm) =>
        ecm.teamId !== movingUnitTeamId &&
        ecm.mode === 'ecm' &&
        ecm.operational,
    );
    for (const enemyEcm of allHostileEcm) {
      if (canBAPCounterECM(repositioned, enemyEcm)) {
        coverageBonus += COVERAGE_UNIT_BONUS;
      }
    }
  }

  return { hostileBubblePenalty, coverageBonus };
}

/**
 * Convenience guard for callers that resolved an inert advanced block — when
 * advanced systems are disabled the advisor is never consulted, but exposing
 * the inert advice keeps the call site uniform.
 */
export function inertElectronicWarfareAdvice(): IElectronicWarfareAdvice {
  return NO_ADVICE;
}
