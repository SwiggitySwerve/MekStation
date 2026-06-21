import React from 'react';

import type { IWeapon } from '@/simulation/ai/types';
import type {
  IAttackPlan,
  IPlannedMovement,
} from '@/stores/useGameplayStore.combatFlowTypes';
import type { ISelectedUnitProjection } from '@/stores/useGameplayStore.selectors';
import type {
  Facing,
  IGameEvent,
  IAttackerState,
  ITargetState,
  MovementHeatProfile,
  MovementType,
  RangeBracket,
  WeaponFireMode,
} from '@/types/gameplay';
import type { IForecastInput } from '@/utils/gameplay/toHit/forecast';

import { GameEventType, LockState } from '@/types/gameplay';

import {
  AttackerLockedBanner,
  WaitingForOpponentBanner,
  ZeroAmmoBlockMessage,
} from './CombatPlanningPanel.banners';
import { CommitMoveButton } from './CommitMoveButton';
import { FacingPicker } from './FacingPicker';
import { MovementTypeSwitcher } from './MovementTypeSwitcher';
import {
  PhysicalAttackPanel,
  type PhysicalAttackIntent,
} from './PhysicalAttackPanel';
import { ToHitForecastModal } from './ToHitForecastModal';
import { WeaponSelector } from './WeaponSelector';

interface MovementPlanningSectionProps {
  readonly className: string;
  readonly movementType: MovementType;
  readonly walkMP: number;
  readonly runMP: number;
  readonly jumpMP: number;
  readonly plannedMovement: IPlannedMovement | null;
  readonly planReady: boolean;
  readonly mpCost: number;
  readonly jumpHexes?: number;
  readonly movementHeatProfile?: MovementHeatProfile;
  readonly onTypeChange: (type: MovementType) => void;
  readonly onFacingSelect: (facing: Facing) => void;
  readonly onCommit: () => void;
}

export function MovementPlanningSection({
  className,
  movementType,
  walkMP,
  runMP,
  jumpMP,
  plannedMovement,
  planReady,
  mpCost,
  jumpHexes,
  movementHeatProfile,
  onTypeChange,
  onFacingSelect,
  onCommit,
}: MovementPlanningSectionProps): React.ReactElement {
  return (
    <section
      className={`bg-surface-base flex flex-col gap-3 border-t border-gray-200 p-3 ${className}`}
      aria-label="Movement planning"
      data-testid="combat-planning-panel-movement"
    >
      <MovementTypeSwitcher
        active={movementType}
        walkMP={walkMP}
        runMP={runMP}
        jumpMP={jumpMP}
        onChange={onTypeChange}
      />
      <FacingPicker
        selected={plannedMovement?.facing ?? null}
        onSelect={onFacingSelect}
      />
      <CommitMoveButton
        ready={planReady && plannedMovement?.facing !== undefined}
        mpCost={mpCost}
        movementType={movementType}
        heatGenerated={plannedMovement?.heatGenerated}
        movementHeatProfile={movementHeatProfile}
        movementMode={plannedMovement?.movementMode}
        terrainCost={plannedMovement?.terrainCost}
        turningCost={plannedMovement?.turningCost}
        elevationDelta={plannedMovement?.elevationDelta}
        elevationCost={plannedMovement?.elevationCost}
        jumpHexes={jumpHexes}
        onCommit={onCommit}
      />
    </section>
  );
}

interface WeaponAttackPlanningSectionProps {
  readonly className: string;
  readonly selected: ISelectedUnitProjection;
  readonly attackPlan: IAttackPlan;
  readonly weapons: readonly IWeapon[];
  readonly selectedWeaponModes: Readonly<Record<string, WeaponFireMode>>;
  readonly rangeToTarget: number;
  readonly combatProjectionRangeBracket?: RangeBracket | null;
  readonly attackerState: IAttackerState | null;
  readonly targetState: ITargetState | null;
  readonly forecastWeapons: readonly IForecastInput[];
  readonly forecastOpen: boolean;
  readonly events: readonly IGameEvent[];
  readonly previewEnabled: boolean;
  readonly onTogglePreview: (enabled: boolean) => void;
  readonly onToggleWeapon: (weaponId: string) => void;
  readonly onModeChange: (weaponId: string, mode: WeaponFireMode) => void;
  readonly onOpenForecast: () => void;
  readonly onConfirmFire: () => void;
  readonly onCloseForecast: () => void;
  readonly weaponModeError?: string | null;
}

export function WeaponAttackPlanningSection({
  className,
  selected,
  attackPlan,
  weapons,
  selectedWeaponModes,
  rangeToTarget,
  combatProjectionRangeBracket,
  attackerState,
  targetState,
  forecastWeapons,
  forecastOpen,
  events,
  previewEnabled,
  onTogglePreview,
  onToggleWeapon,
  onModeChange,
  onOpenForecast,
  onConfirmFire,
  onCloseForecast,
  weaponModeError,
}: WeaponAttackPlanningSectionProps): React.ReactElement {
  const ammoMap = buildAmmoMap(weapons, selected);
  const hasZeroAmmoSelected = attackPlan.selectedWeapons.some(
    (weaponId) => ammoMap[weaponId] === 0,
  );
  const attackerLocked = selected.state.lockState === LockState.Locked;
  const waitingForOpponent = isWaitingForOpponent(
    selected,
    attackerLocked,
    events,
  );
  const forecastReady =
    attackPlan.targetUnitId !== null &&
    attackPlan.selectedWeapons.length > 0 &&
    attackerState !== null &&
    targetState !== null &&
    !hasZeroAmmoSelected &&
    !attackerLocked;

  return (
    <section
      className={`bg-surface-base flex flex-col gap-3 border-t border-gray-200 p-3 ${className}`}
      aria-label="Attack planning"
      data-testid="combat-planning-panel-attack"
      data-attacker-locked={attackerLocked}
      data-combat-projection-range={rangeToTarget}
      data-combat-projection-range-bracket={combatProjectionRangeBracket}
    >
      {waitingForOpponent && <WaitingForOpponentBanner />}
      {attackerLocked && !waitingForOpponent && <AttackerLockedBanner />}
      <fieldset
        disabled={attackerLocked}
        className={`flex flex-col gap-3 border-0 p-0 ${
          attackerLocked ? 'pointer-events-none opacity-60' : ''
        }`}
        data-testid="combat-planning-fieldset"
      >
        <WeaponSelector
          weapons={weapons}
          rangeToTarget={rangeToTarget}
          activeRangeBracket={combatProjectionRangeBracket ?? null}
          selectedWeaponIds={attackPlan.selectedWeapons}
          weaponModesByWeaponId={selectedWeaponModes}
          weaponModeError={weaponModeError}
          ammo={ammoMap}
          onToggle={onToggleWeapon}
          onModeChange={onModeChange}
          attacker={attackerState}
          target={targetState}
          previewEnabled={previewEnabled}
          onTogglePreview={onTogglePreview}
        />
        <button
          type="button"
          onClick={onOpenForecast}
          disabled={!forecastReady}
          className={`min-h-[44px] rounded px-4 py-2 font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
            forecastReady
              ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          }`}
          data-testid="preview-forecast-button"
        >
          Preview Forecast
        </button>
        {hasZeroAmmoSelected && <ZeroAmmoBlockMessage />}
      </fieldset>
      {attackerState && targetState && !attackerLocked && (
        <ToHitForecastModal
          open={forecastOpen}
          attacker={attackerState}
          target={targetState}
          range={rangeToTarget}
          weapons={forecastWeapons}
          previewEnabled={previewEnabled}
          attackerWeapons={weapons}
          onConfirm={onConfirmFire}
          onClose={onCloseForecast}
        />
      )}
    </section>
  );
}

interface PhysicalAttackPlanningSectionProps {
  readonly attackerTonnage?: number;
  readonly attackPlan: IAttackPlan;
  readonly className: string;
  readonly onIntentChange?: (intent: PhysicalAttackIntent | null) => void;
  readonly selected: ISelectedUnitProjection;
  readonly selectedWeaponModes: Readonly<Record<string, WeaponFireMode>>;
  readonly weapons: readonly IWeapon[];
}

export function PhysicalAttackPlanningSection({
  attackerTonnage,
  attackPlan,
  className,
  onIntentChange,
  selected,
  selectedWeaponModes,
  weapons,
}: PhysicalAttackPlanningSectionProps): React.ReactElement {
  const ammoMap = buildAmmoMap(weapons, selected);

  return (
    <section
      className={`bg-surface-base flex flex-col gap-3 border-t border-gray-200 p-3 ${className}`}
      aria-label="Physical attack planning"
      data-testid="combat-planning-panel-physical"
    >
      {weapons.length > 0 && (
        <div
          className="pointer-events-none opacity-50 select-none"
          aria-disabled="true"
          data-testid="weapon-list-locked"
        >
          <p className="text-text-theme-muted mb-1 text-xs font-semibold uppercase">
            {'Weapons locked \u2014 Physical Attack phase'}
          </p>
          <WeaponSelector
            weapons={weapons}
            rangeToTarget={0}
            selectedWeaponIds={attackPlan.selectedWeapons}
            weaponModesByWeaponId={selectedWeaponModes}
            ammo={ammoMap}
            onToggle={() => undefined}
          />
        </div>
      )}
      <PhysicalAttackPanel
        attackerTonnage={attackerTonnage}
        onIntentChange={onIntentChange}
      />
    </section>
  );
}

function buildAmmoMap(
  weapons: readonly IWeapon[],
  selected: ISelectedUnitProjection,
): Record<string, number> {
  const ammoMap: Record<string, number> = {};
  for (const weapon of weapons) {
    ammoMap[weapon.id] = selected.state.ammo[weapon.id] ?? -1;
  }
  return ammoMap;
}

function isWaitingForOpponent(
  selected: ISelectedUnitProjection,
  attackerLocked: boolean,
  events: readonly IGameEvent[],
): boolean {
  const lastRevealIndex = events.findLastIndex(
    (event) => event.type === GameEventType.AttacksRevealed,
  );
  const lastPlayerLockIndex = events.findLastIndex(
    (event) =>
      event.type === GameEventType.AttackLocked &&
      event.actorId === selected.unit.id,
  );
  return attackerLocked && lastPlayerLockIndex > lastRevealIndex;
}
