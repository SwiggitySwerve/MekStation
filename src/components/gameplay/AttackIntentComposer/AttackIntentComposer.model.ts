/**
 * AttackIntentComposer — pure view-model builders (change
 * `attack-phase-intent-composer`, phase 2).
 *
 * Every function here is a pure derivation from the stored
 * `IAttackIntentState` + `IAttackComposerContext`, so the palette / ledger
 * / resolver components stay dumb and the models are unit-testable
 * without React. Rules values are consumed verbatim:
 *   - toggle legality → `deriveWeaponLegalityForTarget` (phase 1, twist-aware);
 *   - forecast rows → `buildToHitForecast` with the composer's
 *     `ISecondaryTarget` context injected through
 *     `buildWeaponAttackAttackerToHitState`;
 *   - threshold chips → `getShutdownTN` / `getAmmoExplosionTN`
 *     (`src/constants/heat.ts`, the heat SSOT);
 *   - ledger totals → `deriveVolleyLedgerTotals` (phase 1).
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import type {
  Facing,
  IAttackIntentState,
  IUnitGameState,
  IWeaponStatus,
} from '@/types/gameplay';
import type { IForecastInput } from '@/utils/gameplay/toHit/forecast';

import { getAmmoExplosionTN, getShutdownTN } from '@/constants/heat';
import {
  selectPrimaryTargetId,
  selectVolleyGroups,
} from '@/stores/useGameplayStore.attackIntent';
import {
  deriveSecondaryTargetContext,
  deriveVolleyLedgerTotals,
  deriveWeaponLegalityForTarget,
  type IVolleyLedgerTotals,
} from '@/stores/useGameplayStore.attackIntent.derive';
import { getTwistedFacing } from '@/utils/gameplay/firingArc';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { isIndirectFireCapable } from '@/utils/gameplay/indirectFire';
import { buildToHitForecast } from '@/utils/gameplay/toHit/forecast';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
} from '@/utils/gameplay/toHit/stateHydration';

import type {
  IAttackComposerContext,
  IResolverGroupLine,
  IThresholdChip,
  IWeaponPaletteRow,
} from './composer.types';

function weaponToForecastInput(weapon: IWeaponStatus): IForecastInput {
  return {
    weaponId: weapon.id,
    weaponName: weapon.name,
    minRange: weapon.ranges.minimum ?? 0,
    shortRange: weapon.ranges.short,
    mediumRange: weapon.ranges.medium,
    longRange: weapon.ranges.long,
  };
}

function unitName(
  context: IAttackComposerContext,
  unitId: string | null,
): string | null {
  if (!unitId || !context.session) return null;
  return (
    context.session.units.find((unit) => unit.id === unitId)?.name ?? unitId
  );
}

function attackerGeometry(unit: IUnitGameState) {
  return { position: unit.position, facing: unit.facing };
}

/**
 * Per-weapon forecast (final TN + hit probability) against each weapon's
 * ASSIGNED target, with the composer's secondary-target context injected —
 * a weapon on a non-primary target shows its penalized to-hit before any
 * commit (spec: `Second target shows secondary penalty at assignment`).
 */
function forecastByWeaponId(
  intent: IAttackIntentState,
  context: IAttackComposerContext,
): Map<string, { finalToHit: number; hitProbability: number }> {
  const result = new Map<
    string,
    { finalToHit: number; hitProbability: number }
  >();
  const { unit, session } = context;
  if (!unit || !session) return result;
  const weaponsById = new Map(context.weapons.map((w) => [w.id, w]));

  for (const group of selectVolleyGroups(intent)) {
    const targetUnit = session.currentState.units[group.targetId];
    if (!targetUnit) continue;
    const secondaryTarget = deriveSecondaryTargetContext(
      intent,
      group.targetId,
      attackerGeometry(unit),
      targetUnit.position,
    );
    const forecastInputs = group.weaponIds
      .map((weaponId) => weaponsById.get(weaponId))
      .filter((weapon): weapon is IWeaponStatus => weapon !== undefined)
      .map(weaponToForecastInput);
    const rows = buildToHitForecast(
      buildWeaponAttackAttackerToHitState(unit, context.gunnery),
      buildWeaponAttackTargetToHitState(targetUnit, false),
      forecastInputs,
      hexDistance(unit.position, targetUnit.position),
      {
        attackerForWeapon: (weapon) =>
          buildWeaponAttackAttackerToHitState(
            unit,
            context.gunnery,
            { id: weapon.weaponId, name: weapon.weaponName },
            group.targetId,
            secondaryTarget,
          ),
      },
    );
    for (const row of rows) {
      if (!row.outOfRange) {
        result.set(row.weaponId, {
          finalToHit: row.finalToHit,
          hitProbability: row.hitProbability,
        });
      }
    }
  }
  return result;
}

/**
 * Build the Weapon Palette rows: identity + assignment + forecast vs the
 * assigned target + toggle legality vs the FOCUSED working target
 * (block-at-source with the rules-backed reason). Without a focused
 * target every toggle is disabled with the "pick a target" hint — the
 * reducer would no-op anyway, but the palette says why (D6 target-first).
 */
export function buildWeaponPaletteRows(
  intent: IAttackIntentState,
  context: IAttackComposerContext,
): readonly IWeaponPaletteRow[] {
  const { unit, session, grid } = context;
  if (!unit || !session) return [];

  const focusedUnit = intent.focusedTargetId
    ? session.currentState.units[intent.focusedTargetId]
    : undefined;
  const legalityByWeaponId = new Map(
    focusedUnit && grid
      ? deriveWeaponLegalityForTarget({
          weapons: context.weapons,
          attacker: attackerGeometry(unit),
          composedTwist: intent.composedTwist,
          targetPosition: focusedUnit.position,
          grid,
          minimumRangeApplies: true,
        }).map((option) => [option.weaponId, option])
      : [],
  );
  const forecasts = forecastByWeaponId(intent, context);
  const primaryTargetId = selectPrimaryTargetId(intent);
  const assignmentByWeaponId = new Map(
    intent.assignments.map((assignment) => [assignment.weaponId, assignment]),
  );

  return context.weapons.map((weapon) => {
    const assignment = assignmentByWeaponId.get(weapon.id);
    const isSecondary =
      assignment !== undefined &&
      primaryTargetId !== null &&
      assignment.targetId !== primaryTargetId;
    const secondaryContext =
      assignment && isSecondary
        ? deriveSecondaryTargetContext(
            intent,
            assignment.targetId,
            attackerGeometry(unit),
            session.currentState.units[assignment.targetId]?.position ??
              unit.position,
          )
        : undefined;
    const legality = legalityByWeaponId.get(weapon.id);
    const forecast = forecasts.get(weapon.id);
    // An assigned weapon can always be toggled OFF; blocking applies to
    // assigning toward the focused target (Live Feasibility Gating: block
    // illegal at source, never auto-deselect).
    const togglesOff =
      assignment !== undefined &&
      assignment.targetId === intent.focusedTargetId;
    const toggleDisabled =
      !togglesOff &&
      (intent.focusedTargetId === null || legality?.available !== true);
    return {
      weaponId: weapon.id,
      weaponName: weapon.name,
      location: weapon.location,
      assignedTargetId: assignment?.targetId ?? null,
      assignedTargetName: unitName(context, assignment?.targetId ?? null),
      isSecondaryAssignment: isSecondary,
      secondaryPenalty: secondaryContext
        ? secondaryContext.inFrontArc
          ? 1
          : 2
        : null,
      finalToHit: forecast?.finalToHit ?? null,
      hitProbability: forecast?.hitProbability ?? null,
      toggleDisabled,
      toggleDisabledReason: toggleDisabled
        ? intent.focusedTargetId === null
          ? 'Pick a target to assign against'
          : (legality?.blockedReason ?? 'Not assignable to this target')
        : undefined,
      mode: assignment?.mode ?? weapon.mode ?? 'Direct',
      supportsIndirectMode:
        isIndirectFireCapable(weapon.id) || isIndirectFireCapable(weapon.name),
    };
  });
}

/** Ledger view-model: totals + projected heat + always-visible chips. */
export interface ILedgerModel {
  readonly totals: IVolleyLedgerTotals;
  /** Projected end-of-turn heat after dissipation (never below 0). */
  readonly projectedHeat: number;
  /** Always-visible threshold chips (D10) — state changes, never absence. */
  readonly chips: readonly IThresholdChip[];
}

/**
 * Total the composed volley and derive the D10 threshold chips from the
 * heat SSOT. Chips are ALWAYS present — a safe chip renders as safe, not
 * hidden — so threshold visibility never depends on crossing state.
 */
export function buildLedgerModel(
  intent: IAttackIntentState,
  context: IAttackComposerContext,
): ILedgerModel {
  const hitProbabilityByWeaponId: Record<string, number> = {};
  forecastByWeaponId(intent, context).forEach((forecast, weaponId) => {
    hitProbabilityByWeaponId[weaponId] = forecast.hitProbability;
  });
  const totals = deriveVolleyLedgerTotals({
    state: intent,
    weapons: context.weapons,
    hitProbabilityByWeaponId,
    movementHeat: context.movementHeat,
    heatDissipation: context.heatDissipation,
  });
  const projectedHeat = Math.max(
    0,
    (context.unit?.heat ?? 0) + totals.totalHeat - context.heatDissipation,
  );

  const shutdownTN = getShutdownTN(projectedHeat);
  const ammoTN = getAmmoExplosionTN(projectedHeat);
  const chips: IThresholdChip[] = [
    {
      id: 'shutdown',
      label: 'Shutdown',
      state:
        shutdownTN === Infinity ? 'auto' : shutdownTN > 0 ? 'risk' : 'safe',
      detail:
        shutdownTN === Infinity
          ? 'Automatic shutdown'
          : shutdownTN > 0
            ? `TN ${shutdownTN} to avoid`
            : `Safe below heat 14 (at ${projectedHeat})`,
    },
    {
      id: 'ammo',
      label: 'Ammo',
      state: ammoTN === Infinity ? 'auto' : ammoTN > 0 ? 'risk' : 'safe',
      detail:
        ammoTN === Infinity
          ? 'Automatic explosion'
          : ammoTN > 0
            ? `TN ${ammoTN} to avoid explosion`
            : `Safe below heat 19 (at ${projectedHeat})`,
    },
  ];
  return { totals, projectedHeat, chips };
}

/**
 * Volley Resolver summary lines: one per composed target group, primary
 * first (assignment order), with unit names for display.
 */
export function buildResolverGroupLines(
  intent: IAttackIntentState,
  context: IAttackComposerContext,
): readonly IResolverGroupLine[] {
  const primary = selectPrimaryTargetId(intent);
  return selectVolleyGroups(intent).map((group) => ({
    targetId: group.targetId,
    targetName: unitName(context, group.targetId) ?? group.targetId,
    isPrimary: group.targetId === primary,
    weaponCount: group.weaponIds.length,
  }));
}

/**
 * Fire enablement (spec: disabled-with-hint until >=1 LEGAL assignment):
 * at least one assignment must be legal against ITS OWN target under the
 * composed twist. Assignments are never auto-deselected — an
 * illegal-again assignment (e.g. after un-twisting) keeps rendering but
 * cannot carry the volley alone.
 */
export function anyLegalAssignment(
  intent: IAttackIntentState,
  context: IAttackComposerContext,
): boolean {
  const { unit, session, grid } = context;
  if (!unit || !session || !grid) return false;
  const weaponsById = new Map(context.weapons.map((w) => [w.id, w]));
  for (const group of selectVolleyGroups(intent)) {
    const targetUnit = session.currentState.units[group.targetId];
    if (!targetUnit) continue;
    const legality = deriveWeaponLegalityForTarget({
      weapons: group.weaponIds
        .map((weaponId) => weaponsById.get(weaponId))
        .filter((weapon): weapon is IWeaponStatus => weapon !== undefined),
      attacker: attackerGeometry(unit),
      composedTwist: intent.composedTwist,
      targetPosition: targetUnit.position,
      grid,
      minimumRangeApplies: true,
    });
    if (legality.some((option) => option.available)) return true;
  }
  return false;
}

/** One Twist Control option (Left / Straight / Right). */
export interface ITwistOption {
  readonly key: 'left' | 'none' | 'right';
  readonly label: string;
  /** Absolute secondary facing this option composes (null = no twist). */
  readonly facing: Facing | null;
  readonly active: boolean;
}

/**
 * The three twist states (D7). Facing values come from the canonical
 * `getTwistedFacing` so the composed intent matches what `torsoTwist`
 * will declare at Fire exactly.
 */
export function buildTwistOptions(
  baseFacing: Facing,
  composedTwist: Facing | null,
): readonly ITwistOption[] {
  const left = getTwistedFacing(baseFacing, 'left');
  const right = getTwistedFacing(baseFacing, 'right');
  return [
    {
      key: 'left',
      label: 'Twist Left',
      facing: left,
      active: composedTwist === left,
    },
    {
      key: 'none',
      label: 'Straight',
      facing: null,
      active: composedTwist === null,
    },
    {
      key: 'right',
      label: 'Twist Right',
      facing: right,
      active: composedTwist === right,
    },
  ];
}
