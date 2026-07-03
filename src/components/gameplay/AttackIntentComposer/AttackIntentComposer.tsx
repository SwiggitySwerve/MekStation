/**
 * AttackIntentComposer (change `attack-phase-intent-composer`, phase 2,
 * tactical-attack-intent capability, tasks 2.1–2.4).
 *
 * The SOLE weapon-attack declaration surface on the tactical HUD while
 * active (Single Attack Authority, D9). Hosted inside the
 * `TacticalActionDock` (PRIMARY-ACTION zone) exactly like the movement
 * composer, it composes:
 *
 *  - a WeaponPalette (per-weapon toggle vs the focused working target,
 *    block-at-source with reasons, forecast columns, inline secondary
 *    penalty per D5/D6, Direct/Indirect mode selector),
 *  - a TwistControl (torso twist as intent, D7 — arc gating recomputes
 *    live through the twist-aware derive layer),
 *  - a HeatEffectLedger (live totals + ALWAYS-VISIBLE threshold chips,
 *    D10 — legal-but-hot volleys are never blocked),
 *  - a VolleyResolver (per-target summary, explicit Fire with
 *    disabled-with-hint, explicit Hold Fire).
 *
 * It reads the `attackIntent` store slice; composition has a zero-commit
 * guarantee — nothing declares until Fire calls `commitComposedVolley`
 * (composed twist → volley groups → single lock) or Hold Fire calls
 * `holdFire`. All rules values arrive through the pure view-model
 * builders in `AttackIntentComposer.model.ts`.
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import React, { useCallback, useMemo } from 'react';

import { useGameplaySelector } from '@/stores/useGameplayStore';
import { Facing } from '@/types/gameplay';

import type { IAttackComposerContext } from './composer.types';

import {
  anyLegalAssignment,
  buildLedgerModel,
  buildResolverGroupLines,
  buildTwistOptions,
  buildWeaponPaletteRows,
} from './AttackIntentComposer.model';
import { HeatEffectLedger } from './HeatEffectLedger';
import { TwistControl } from './TwistControl';
import { VolleyResolver } from './VolleyResolver';
import { WeaponPalette } from './WeaponPalette';

export interface AttackIntentComposerProps {
  readonly context: IAttackComposerContext;
}

export function AttackIntentComposer({
  context,
}: AttackIntentComposerProps): React.ReactElement | null {
  const attackIntent = useGameplaySelector((state) => state.attackIntent);
  const toggleWeaponAssignment = useGameplaySelector(
    (state) => state.toggleWeaponAssignment,
  );
  const setAssignmentMode = useGameplaySelector(
    (state) => state.setAssignmentMode,
  );
  const setComposedTwist = useGameplaySelector(
    (state) => state.setComposedTwist,
  );
  const commitComposedVolley = useGameplaySelector(
    (state) => state.commitComposedVolley,
  );
  const holdFire = useGameplaySelector((state) => state.holdFire);

  const { active, unit } = context;

  const paletteRows = useMemo(
    () => buildWeaponPaletteRows(attackIntent, context),
    [attackIntent, context],
  );
  const ledgerModel = useMemo(
    () => buildLedgerModel(attackIntent, context),
    [attackIntent, context],
  );
  const resolverGroups = useMemo(
    () => buildResolverGroupLines(attackIntent, context),
    [attackIntent, context],
  );
  const fireEnabled = useMemo(
    () =>
      attackIntent.assignments.length > 0 &&
      anyLegalAssignment(attackIntent, context),
    [attackIntent, context],
  );
  const twistOptions = useMemo(
    () =>
      buildTwistOptions(
        unit?.facing ?? Facing.North,
        attackIntent.composedTwist,
      ),
    [unit?.facing, attackIntent.composedTwist],
  );

  const handleFire = useCallback(() => {
    if (fireEnabled) commitComposedVolley();
  }, [fireEnabled, commitComposedVolley]);

  if (!active) return null;

  const fireHint =
    attackIntent.assignments.length === 0
      ? 'Assign at least one weapon to fire.'
      : fireEnabled
        ? null
        : 'No legal assignment in the volley — adjust targets or twist.';

  return (
    // Horizontal band mirroring the movement composer: the dock is
    // PRIMARY-ACTION chrome, not FOCUS — side-by-side panels keep the band
    // compact; flex-wrap degrades to stacking only when genuinely narrow.
    <div
      className="flex w-full min-w-0 flex-wrap items-start gap-x-6 gap-y-3"
      data-testid="attack-intent-composer"
      role="group"
      aria-label="Attack intent composer"
    >
      <div className="min-w-64 flex-[2]">
        <WeaponPalette
          rows={paletteRows}
          onToggleWeapon={toggleWeaponAssignment}
          onSetMode={setAssignmentMode}
        />
      </div>
      <div className="min-w-40 flex-none">
        <TwistControl options={twistOptions} onSetTwist={setComposedTwist} />
      </div>
      <div className="min-w-64 flex-1">
        <HeatEffectLedger model={ledgerModel} />
      </div>
      <div className="min-w-56 flex-1">
        <VolleyResolver
          groups={resolverGroups}
          fireEnabled={fireEnabled}
          fireHint={fireHint}
          onFire={handleFire}
          onHoldFire={holdFire}
        />
      </div>
    </div>
  );
}

export default AttackIntentComposer;
