import React from 'react';

import type { IMapConfiguration } from '@/types/encounter';
import type { IPilot } from '@/types/pilot';
import type {
  ISkirmishLaunchConfig,
  ISkirmishUnitSelection,
} from '@/utils/gameplay/preBattleSessionBuilder';

import { DeploymentZonePreview } from '@/components/gameplay/DeploymentZonePreview';
import { PilotPicker } from '@/components/gameplay/PilotPicker';
import { UnitPicker } from '@/components/gameplay/UnitPicker';
import {
  computeBvTotals,
  getSkirmishConfigError,
} from '@/utils/gameplay/preBattleSessionBuilder';

const BV_IMBALANCE_WARNING_THRESHOLD = 0.2;

/**
 * Per-side cap on units. Phase 1 spec § 2.1 fixes this at 2 per side
 * for the canonical 2v2 skirmish; the prop allows future scenarios to
 * widen it without rewriting the launcher.
 */
const DEFAULT_SLOTS_PER_SIDE = 2;

interface SkirmishLauncherProps {
  encounterId: string;
  mapConfig: IMapConfiguration;
  pilots: readonly IPilot[];
  playerUnits: readonly ISkirmishUnitSelection[];
  opponentUnits: readonly ISkirmishUnitSelection[];
  onAddPlayerUnit: (selection: ISkirmishUnitSelection) => void;
  onRemovePlayerUnit: (unitId: string) => void;
  onAssignPlayerPilot: (unitId: string, pilot: IPilot | null) => void;
  onAddOpponentUnit: (selection: ISkirmishUnitSelection) => void;
  onRemoveOpponentUnit: (unitId: string) => void;
  onAssignOpponentPilot: (unitId: string, pilot: IPilot | null) => void;
  onLaunch: (config: ISkirmishLaunchConfig) => void;
  isLaunching?: boolean;
  /** Optional override for slots per side. Defaults to 2 (Phase 1). */
  slotsPerSide?: number;
}

/**
 * Composes the per-side `UnitPicker` + `PilotPicker`, the
 * `DeploymentZonePreview`, and the validated "Launch Skirmish" button.
 *
 * Validation is performed by `getSkirmishConfigError` so the inline
 * message and the button-disabled state share a single source of truth
 * (spec § 8.1, § 8.2).
 */
export function SkirmishLauncher({
  encounterId,
  mapConfig,
  pilots,
  playerUnits,
  opponentUnits,
  onAddPlayerUnit,
  onRemovePlayerUnit,
  onAssignPlayerPilot,
  onAddOpponentUnit,
  onRemoveOpponentUnit,
  onAssignOpponentPilot,
  onLaunch,
  isLaunching = false,
  slotsPerSide = DEFAULT_SLOTS_PER_SIDE,
}: SkirmishLauncherProps): React.ReactElement {
  const config: ISkirmishLaunchConfig = {
    encounterId,
    mapRadius: mapConfig.radius,
    terrainPreset: mapConfig.terrain,
    player: { units: playerUnits },
    opponent: { units: opponentUnits },
  };

  const validationError = getSkirmishConfigError(config);
  const bv = computeBvTotals(config);
  const showBvWarning =
    bv.imbalanceRatio > BV_IMBALANCE_WARNING_THRESHOLD &&
    bv.player > 0 &&
    bv.opponent > 0;
  const opponentStronger = bv.opponent > bv.player;

  // Aggregate already-assigned pilot ids across both sides so each
  // PilotPicker can flag duplicates and the caller-side state-mover
  // (`onAssignPlayerPilot` / `onAssignOpponentPilot`) can move rather
  // than duplicate (spec § 3.3).
  const assignedPilotIds = new Set<string>();
  for (const unit of [...playerUnits, ...opponentUnits]) {
    if (unit.pilot) {
      assignedPilotIds.add(unit.pilot.pilotId);
    }
  }

  return (
    <div data-testid="skirmish-launcher">
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <UnitPicker
          side="player"
          title="Player Force Roster"
          maxUnits={slotsPerSide}
          selectedUnits={playerUnits}
          onAdd={onAddPlayerUnit}
          onRemove={onRemovePlayerUnit}
        />
        <UnitPicker
          side="opponent"
          title="Opponent Force Roster"
          maxUnits={slotsPerSide}
          selectedUnits={opponentUnits}
          onAdd={onAddOpponentUnit}
          onRemove={onRemoveOpponentUnit}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <PilotPicker
          side="player"
          title="Player Pilot Assignments"
          pilots={pilots}
          units={playerUnits}
          assignedPilotIds={assignedPilotIds}
          onAssignPilot={onAssignPlayerPilot}
        />
        <PilotPicker
          side="opponent"
          title="Opponent Pilot Assignments"
          pilots={pilots}
          units={opponentUnits}
          assignedPilotIds={assignedPilotIds}
          onAssignPilot={onAssignOpponentPilot}
        />
      </div>

      <DeploymentZonePreview
        radius={mapConfig.radius}
        preset={mapConfig.terrain}
      />

      {showBvWarning && (
        <p
          className="mb-3 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300"
          data-testid="bv-imbalance-warning"
        >
          Total BV imbalance &gt;{' '}
          {Math.round(BV_IMBALANCE_WARNING_THRESHOLD * 100)}% —{' '}
          {opponentStronger ? 'opponent' : 'player'} has the stronger force (
          {bv.player.toLocaleString()} vs {bv.opponent.toLocaleString()} BV).
        </p>
      )}

      {validationError && (
        <p
          className="mb-3 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300"
          data-testid="skirmish-validation-error"
        >
          {validationError}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (validationError || isLaunching) {
              return;
            }
            onLaunch(config);
          }}
          disabled={validationError !== null || isLaunching}
          title={
            validationError
              ? validationError
              : isLaunching
                ? 'Launching…'
                : 'Launch the skirmish'
          }
          className="rounded-lg bg-cyan-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-400"
          data-testid="launch-skirmish-btn"
          aria-disabled={validationError !== null || isLaunching}
        >
          {isLaunching ? 'Launching…' : 'Launch Skirmish'}
        </button>
      </div>
    </div>
  );
}
