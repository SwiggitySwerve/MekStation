/**
 * PhysicalAttackPanel
 *
 * Per `add-physical-attack-phase-ui` tasks 4.x + 5.x + 7.x + 9.x:
 * the sub-panel that mounts under the action bar during
 * `GamePhase.PhysicalAttack`. Owns the target list, the per-row
 * eligibility table (populated by `getEligiblePhysicalAttacks`), and
 * hover-driven intent-arrow emission for the map overlay.
 *
 * Flow:
 *  1. Player picks an adjacent enemy target from the target list.
 *  2. Panel projects `getEligiblePhysicalAttacks(attacker, target, ...)`
 *     into one row per attack type (punch L/R, kick L/R, charge, DFA,
 *     push, + any equipped melee weapons).
 *  3. Each row shows attack type + limb + to-hit TN + damage preview.
 *     Ineligible rows render disabled with a tooltip listing the
 *     blocking restriction codes (task 4.4 + 9.4).
 *  4. Hover on an eligible row emits a variant hint (`charge` | `dfa`
 *     | `push`) via `onIntentChange` so the parent can render the
 *     matching `PhysicalAttackIntentArrow` overlay (task 4.3 + 7.5).
 *  5. Declare button on each eligible row opens the forecast modal
 *     seeded with that row's config. Confirm commits via
 *     `usePhysicalAttackPlanStore.commitPhysicalAttack`, which in turn
 *     calls `InteractiveSession.applyPhysicalAttack` (task 5.3).
 *  6. After a successful commit the panel collapses to a summary line
 *     (task 5.4) until the player advances past the PhysicalAttack
 *     phase.
 *
 * @spec openspec/changes/add-physical-attack-phase-ui/specs/tactical-map-interface/spec.md
 * @spec openspec/changes/add-physical-attack-phase-ui/specs/physical-attack-system/spec.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  IPhysicalAttackOption,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import {
  useGameplaySelector,
  useSelectedUnit,
} from '@/stores/useGameplayStore';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import { GamePhase, type IHexCoordinate } from '@/types/gameplay';
import { uniqueINarcPodTargets } from '@/utils/gameplay/specialWeaponMechanics';

import type { PhysicalAttackIntentVariant } from './overlays/PhysicalAttackIntentArrow';

import { PhysicalAttackForecastModal } from './PhysicalAttackForecastModal';
import {
  applyPhysicalAttackCommitResult,
  commitPhysicalAttackSelection,
} from './PhysicalAttackPanel.commit';
import {
  buildMeleeTargets,
  buildPhysicalAttackForecastInput,
  buildPhysicalAttackIntent,
  buildPhysicalAttackOptions,
  declarePhysicalAttackOption,
  eligiblePhysicalAttackOptionCount,
  EMPTY_DAMAGE,
  findPhysicalAttackTargetState,
  forecastTargetName,
  physicalAttackAnnouncement,
  selectedINarcPodKeyFor,
  selectCurrentMeleeTarget,
  selectPhysicalAttackINarcPod,
  selectPhysicalAttackTarget,
  showZweihanderToggleFor,
} from './PhysicalAttackPanel.model';
import {
  CommittedPhysicalAttackSummary,
  type MeleeTarget,
  PhysicalAttackINarcPodSelect,
  PhysicalAttackOptionList,
  PhysicalAttackSkipButton,
  PhysicalAttackTargetList,
} from './PhysicalAttackPanel.renderers';

/**
 * Per task 7.5 + `tactical-map-interface` delta "Physical Attack Intent
 * Arrows": the on-hover hint the parent mounts into `HexMapDisplay` as
 * a `<PhysicalAttackIntentArrow>`. `null` clears the overlay.
 */
export interface PhysicalAttackIntent {
  readonly variant: PhysicalAttackIntentVariant;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
}

export interface PhysicalAttackPanelProps {
  /** Tonnage of the selected attacker (forwarded to the engine helpers). */
  attackerTonnage?: number;
  /** Optional list of melee weapons the attacker has equipped. */
  meleeWeaponsEquipped?: readonly PhysicalAttackType[];
  /**
   * Emitted when the player hovers an eligible row whose attack type
   * supports an intent arrow (charge / dfa / push). Parent (typically
   * the gameplay page) threads this to `HexMapDisplay` which mounts the
   * `PhysicalAttackIntentArrow` overlay. `null` clears the arrow.
   */
  onIntentChange?: (intent: PhysicalAttackIntent | null) => void;
  /** Optional className passthrough. */
  className?: string;
}

export function PhysicalAttackPanel({
  attackerTonnage = 65,
  meleeWeaponsEquipped,
  onIntentChange,
  className = '',
}: PhysicalAttackPanelProps): React.ReactElement | null {
  const session = useGameplaySelector((s) => s.session);
  const interactiveSession = useGameplaySelector((s) => s.interactiveSession);
  const setSession = useGameplaySelector((s) => s.setSession);
  const selected = useSelectedUnit();

  const physicalAttackPlan = usePhysicalAttackPlanStore(
    (s) => s.physicalAttackPlan,
  );
  const setPhysicalAttackTarget = usePhysicalAttackPlanStore(
    (s) => s.setPhysicalAttackTarget,
  );
  const setPhysicalAttackType = usePhysicalAttackPlanStore(
    (s) => s.setPhysicalAttackType,
  );
  const setPhysicalAttackTwoHandedZweihander = usePhysicalAttackPlanStore(
    (s) => s.setPhysicalAttackTwoHandedZweihander,
  );
  const setPhysicalAttackINarcPod = usePhysicalAttackPlanStore(
    (s) => s.setPhysicalAttackINarcPod,
  );
  const clearPhysicalAttackPlan = usePhysicalAttackPlanStore(
    (s) => s.clearPhysicalAttackPlan,
  );
  const commitPhysicalAttack = usePhysicalAttackPlanStore(
    (s) => s.commitPhysicalAttack,
  );

  const [forecastOpen, setForecastOpen] = useState(false);
  /**
   * Per task 5.4: sticky summary line after a successful commit so the
   * player sees the locked-in declaration for the rest of the phase.
   * Cleared when the phase changes (effectful `return null` guard).
   */
  const [committedSummary, setCommittedSummary] = useState<string | null>(null);

  const phase = session?.currentState.phase;
  const physicalGrid = interactiveSession?.getGrid() ?? null;

  /**
   * Compute the list of adjacent enemy targets for the current
   * attacker. "Adjacent" = `hexDistance(...) === 1`. Destroyed units
   * are excluded — you can't melee a wreck.
   */
  const meleeTargets = useMemo<MeleeTarget[]>(
    () => buildMeleeTargets({ selected, session }),
    [selected, session],
  );

  const selectedMeleeTarget = useMemo(
    () => selectCurrentMeleeTarget(meleeTargets, physicalAttackPlan),
    [meleeTargets, physicalAttackPlan],
  );

  const selectedTargetIsINarcPod =
    selectedMeleeTarget?.selectedINarcPod !== undefined;

  /**
   * Current target `IUnitGameState` picked from the store plan. Memoized
   * so the eligibility projection below doesn't recompute on unrelated
   * renders.
   */
  const targetState = useMemo(
    () =>
      findPhysicalAttackTargetState(session, physicalAttackPlan.targetUnitId),
    [physicalAttackPlan.targetUnitId, session],
  );
  const targetINarcPods = useMemo(
    () => uniqueINarcPodTargets(targetState?.iNarcPods),
    [targetState?.iNarcPods],
  );
  const selectedINarcPodKey = selectedINarcPodKeyFor(
    physicalAttackPlan,
    targetINarcPods,
  );

  /**
   * Per task 3.1-3.3: project the engine's `getEligiblePhysicalAttacks`
   * into one row per attack type. Rows include both eligible and
   * ineligible options — ineligible rows render disabled + with a
   * tooltip (task 4.4).
   */
  const options = useMemo<readonly IPhysicalAttackOption[]>(
    () =>
      buildPhysicalAttackOptions({
        selected,
        targetState,
        session,
        physicalAttackPlan,
        selectedTargetIsINarcPod,
        attackerTonnage,
        meleeWeaponsEquipped,
        physicalGrid,
      }),
    [
      selected,
      targetState,
      session,
      physicalAttackPlan,
      selectedTargetIsINarcPod,
      attackerTonnage,
      meleeWeaponsEquipped,
      physicalGrid,
    ],
  );

  /**
   * Build the attack input consumed by the forecast modal when a
   * specific row's Declare button is clicked. The input mirrors the
   * row's attack type + limb, so the modal's TN + damage numbers
   * match the row the player clicked.
   */
  const forecastInput = useMemo(
    () =>
      buildPhysicalAttackForecastInput({
        selected,
        targetState,
        session,
        physicalAttackPlan,
        selectedTargetIsINarcPod,
        attackerTonnage,
        meleeWeaponsEquipped,
        physicalGrid,
        emptyDamage: EMPTY_DAMAGE,
      }),
    [
      selected,
      targetState,
      session,
      physicalAttackPlan,
      selectedTargetIsINarcPod,
      attackerTonnage,
      meleeWeaponsEquipped,
      physicalGrid,
    ],
  );

  const showZweihanderToggle = showZweihanderToggleFor(
    physicalAttackPlan.attackType,
    selected?.state.abilities,
  );

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  const handleSelectTarget = useCallback(
    (target: MeleeTarget) => {
      selectPhysicalAttackTarget({
        target,
        setPhysicalAttackTarget,
        setPhysicalAttackType,
        setPhysicalAttackINarcPod,
        clearIntent: () => onIntentChange?.(null),
      });
      // Clear any previously-selected attack type when the target
      // changes — the restriction set may differ.
    },
    [
      setPhysicalAttackTarget,
      setPhysicalAttackType,
      setPhysicalAttackINarcPod,
      onIntentChange,
    ],
  );

  const handleSelectINarcPod = useCallback(
    (podKey: string) => {
      selectPhysicalAttackINarcPod({
        podKey,
        targetINarcPods,
        setPhysicalAttackINarcPod,
      });
    },
    [setPhysicalAttackINarcPod, targetINarcPods],
  );

  /**
   * Per task 4.3 + 7.5: hover emits the intent variant so the parent
   * can render the overlay. Ignored for rows whose attack type has no
   * arrow variant (punch / kick / melee weapon).
   */
  const handleRowHover = useCallback(
    (option: IPhysicalAttackOption) => {
      onIntentChange?.(
        buildPhysicalAttackIntent(option, selected, targetState),
      );
    },
    [selected, targetState, onIntentChange],
  );

  const handleRowLeave = useCallback(() => {
    onIntentChange?.(null);
  }, [onIntentChange]);

  /**
   * Per task 5.2-5.3: per-row Declare. Stashes the attack type + limb
   * on the plan store and opens the forecast modal. Confirm commits.
   */
  const handleDeclare = useCallback(
    (option: IPhysicalAttackOption) => {
      declarePhysicalAttackOption({
        option,
        selectedINarcPod: physicalAttackPlan.selectedINarcPod,
        targetINarcPods,
        setPhysicalAttackType,
        setPhysicalAttackTwoHandedZweihander,
        setPhysicalAttackINarcPod,
      });
      setForecastOpen(true);
    },
    [
      physicalAttackPlan.selectedINarcPod,
      setPhysicalAttackType,
      setPhysicalAttackTwoHandedZweihander,
      setPhysicalAttackINarcPod,
      targetINarcPods,
    ],
  );

  useEffect(() => {
    if (
      physicalAttackPlan.forecastRequestId === undefined ||
      physicalAttackPlan.targetUnitId === null ||
      physicalAttackPlan.attackType === null
    ) {
      return;
    }
    setForecastOpen(true);
  }, [
    physicalAttackPlan.attackType,
    physicalAttackPlan.forecastRequestId,
    physicalAttackPlan.targetUnitId,
  ]);

  const handleConfirm = useCallback(() => {
    applyPhysicalAttackCommitResult(
      commitPhysicalAttackSelection({
        selected,
        session,
        targetState,
        physicalGrid,
        physicalAttackPlan,
        interactiveSession,
        attackerTonnage,
        commitPhysicalAttack,
        meleeTargets,
        selectedMeleeTarget,
      }),
      setSession,
      setCommittedSummary,
    );
    setForecastOpen(false);
    onIntentChange?.(null);
  }, [
    interactiveSession,
    selected,
    session,
    targetState,
    physicalGrid,
    physicalAttackPlan,
    commitPhysicalAttack,
    setSession,
    attackerTonnage,
    meleeTargets,
    selectedMeleeTarget,
    onIntentChange,
  ]);

  /**
   * Per task 5.5 + spec "Skip affordance": Skip clears the draft plan
   * so the player can advance past PhysicalAttack without committing.
   * Keeps the committed summary (if any) so the phase banner reflects
   * the real decision.
   */
  const handleSkip = useCallback(() => {
    clearPhysicalAttackPlan();
    setForecastOpen(false);
    onIntentChange?.(null);
  }, [clearPhysicalAttackPlan, onIntentChange]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!session || !selected) return null;
  if (phase !== GamePhase.PhysicalAttack) return null;

  const hasTarget = physicalAttackPlan.targetUnitId !== null;

  // Per task 3.4 + 9.4: count of eligible rows so the aria-live region
  // can announce "Physical Attack phase — N eligible options" when the
  // sub-panel mounts or the option list shifts.
  const eligibleCount = eligiblePhysicalAttackOptionCount(options);

  // Per task 9.4: `aria-live` copy for screen readers. We keep the
  // message short + factual — the component re-renders when `options`
  // or `meleeTargets` change, so the region speaks whenever the state
  // the player cares about (eligibility) changes.
  const announcement = physicalAttackAnnouncement(
    meleeTargets.length,
    hasTarget,
    eligibleCount,
  );

  return (
    <section
      className={`bg-surface-base flex flex-col gap-3 border-t border-gray-200 p-3 ${className}`}
      aria-label="Physical attack planning"
      data-testid="physical-attack-panel"
    >
      <header>
        <h3 className="text-text-theme-primary text-sm font-semibold">
          Physical Attacks
        </h3>
        <p className="text-text-theme-muted text-xs">
          Pick an adjacent enemy, then declare an attack from the row list.
        </p>
      </header>

      {/* Per task 9.4: aria-live phase announcement. `aria-live=polite`
          + `role=status` means assistive tech batches updates and reads
          them when the user pauses — avoids interrupting rapid hovers.
          Hidden visually with `sr-only` so sighted players see the
          regular header copy, not a duplicate. */}
      <p
        role="status"
        aria-live="polite"
        className="sr-only"
        data-testid="physical-attack-phase-announcement"
      >
        {announcement}
      </p>

      <CommittedPhysicalAttackSummary summary={committedSummary} />

      <PhysicalAttackTargetList
        meleeTargets={meleeTargets}
        selectedTargetId={selectedMeleeTarget?.id}
        onSelectTarget={handleSelectTarget}
      />

      {hasTarget && (
        <PhysicalAttackINarcPodSelect
          selectedINarcPodKey={selectedINarcPodKey}
          targetINarcPods={targetINarcPods}
          onSelectINarcPod={handleSelectINarcPod}
        />
      )}

      <PhysicalAttackOptionList
        hasTarget={hasTarget}
        options={options}
        onRowHover={handleRowHover}
        onRowLeave={handleRowLeave}
        onDeclare={handleDeclare}
      />

      <PhysicalAttackSkipButton onSkip={handleSkip} />

      {forecastInput && (
        <PhysicalAttackForecastModal
          open={forecastOpen}
          attackInput={forecastInput}
          targetName={forecastTargetName(
            meleeTargets,
            physicalAttackPlan.targetUnitId,
          )}
          onConfirm={handleConfirm}
          onClose={() => setForecastOpen(false)}
          showZweihanderToggle={showZweihanderToggle}
          zweihanderTwoHanded={physicalAttackPlan.twoHandedZweihander}
          onZweihanderTwoHandedChange={setPhysicalAttackTwoHandedZweihander}
        />
      )}
    </section>
  );
}

export default PhysicalAttackPanel;
