import type { CustomCombatSnapshot } from '@/types/contracts/CustomCombatSnapshot';
import type {
  IGameCreatedPayload,
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IHexGrid } from '@/types/gameplay/HexGridInterfaces';

import { isCustomCombatReference } from '@/services/units/customCombatDefinition';
import {
  recordedCustomCombatSnapshotSchema,
  snapshotRefError,
} from '@/types/contracts/CustomCombatSnapshot';
import { GameEventType } from '@/types/gameplay/GameSessionInterfaces';
import { parseUnitReference } from '@/types/unit/UnitIndex';
import { applyTerrainOverridesToGrid } from '@/utils/gameplay/terrainState';

import type {
  CustomUnitDefinitionReader,
  IAdaptedUnit,
  IAdaptUnitOptions,
} from './types';

import { adaptUnit } from './adapters/CompendiumAdapter';
import { createGridFromHexTerrain } from './GameEngine.helpers';

/**
 * Injected construction authority. Server callers pass
 * `readServerCustomCombatDefinition`; browser callers may omit it so
 * Core's adapter can use its API default.
 */
export type ReadCustomCombatDefinition = CustomUnitDefinitionReader;

export const isCustomCombatUnitRef = isCustomCombatReference;

/**
 * Validate a PRESENT recorded snapshot with the strict schema. Unknown
 * nested construction keys fail closed; this must not project/strip.
 * Identity is the source `unitRef`, never the game-instance id.
 */
export function requireRecordedCustomCombatSnapshot(
  payload: unknown,
  unitRef: string,
): CustomCombatSnapshot {
  if (!isCustomCombatUnitRef(unitRef)) {
    throw new Error(
      'Recorded custom construction requires a custom unit reference',
    );
  }
  const parsed = recordedCustomCombatSnapshotSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      `Recorded custom construction snapshot is invalid for unitRef '${unitRef}'`,
    );
  }
  const error = snapshotRefError(parsed.data, unitRef);
  if (error) {
    throw new Error(
      `Recorded custom construction ${error} mismatch: snapshot id '${parsed.data.id}', unitRef '${unitRef}'`,
    );
  }
  return parsed.data;
}

export function detachCustomCombatSnapshot(
  snapshot: CustomCombatSnapshot,
): CustomCombatSnapshot {
  return recordedCustomCombatSnapshotSchema.parse(
    JSON.parse(JSON.stringify(snapshot)) as unknown,
  );
}

function snapshotOnlyReader(
  snapshot: CustomCombatSnapshot,
): ReadCustomCombatDefinition {
  return (unitId) => (unitId === snapshot.id ? snapshot : null);
}

/**
 * Copy a detached validated construction onto GameCreated units. Launch
 * records the snapshot that adaptation already accepted; recovery later
 * prefers this copy over the mutable library.
 */
export function recordedCustomCombatSnapshotPatch(
  unit: IGameUnit,
  adapted: IAdaptedUnit,
): Pick<IGameUnit, 'customUnitDefinition'> | null {
  const payload = adapted.customUnitDefinition ?? unit.customUnitDefinition;
  if (payload === undefined) {
    return null;
  }
  return {
    customUnitDefinition: detachCustomCombatSnapshot(
      requireRecordedCustomCombatSnapshot(payload, unit.unitRef),
    ),
  };
}

/**
 * Ensure custom units carry a detached snapshot before GameCreated.
 * Present invalid snapshots refuse. Missing custom snapshots resolve
 * injected authority only; missing/invalid custom never silently skip.
 */
export async function attachRecordedCustomCombatSnapshots(
  units: readonly IGameUnit[],
  readCustom?: ReadCustomCombatDefinition,
): Promise<readonly IGameUnit[]> {
  const recorded: IGameUnit[] = [];
  for (const unit of units) {
    recorded.push(await attachRecordedCustomCombatSnapshot(unit, readCustom));
  }
  return recorded;
}

async function attachRecordedCustomCombatSnapshot(
  unit: IGameUnit,
  readCustom?: ReadCustomCombatDefinition,
): Promise<IGameUnit> {
  if (unit.customUnitDefinition !== undefined) {
    return {
      ...unit,
      customUnitDefinition: detachCustomCombatSnapshot(
        requireRecordedCustomCombatSnapshot(
          unit.customUnitDefinition,
          unit.unitRef,
        ),
      ),
    };
  }
  if (!isCustomCombatUnitRef(unit.unitRef)) {
    return unit;
  }
  if (readCustom === undefined) {
    throw new Error(
      `Custom unit '${unit.id}' (unitRef '${unit.unitRef}') has no recorded snapshot and no authoritative definition reader`,
    );
  }
  const live = await readCustom(parseUnitReference(unit.unitRef).id);
  if (live === null) {
    throw new Error(
      `Custom unit '${unit.id}' (unitRef '${unit.unitRef}') has no recorded snapshot and no authoritative definition`,
    );
  }
  return {
    ...unit,
    customUnitDefinition: detachCustomCombatSnapshot(
      requireRecordedCustomCombatSnapshot(live, unit.unitRef),
    ),
  };
}

export function createRecoveredGridFromSession(
  session: IGameSession,
): IHexGrid {
  const created = session.events.find(
    (event) => event.type === GameEventType.GameCreated,
  );
  const initialTerrain =
    (created?.payload as IGameCreatedPayload | undefined)?.hexTerrain ?? [];

  return applyTerrainOverridesToGrid(
    createGridFromHexTerrain(session.config.mapRadius, initialTerrain),
    session.currentState.terrainOverrides,
  );
}

export async function deriveAdaptedUnitsFromSession(
  session: IGameSession,
  readCustom?: ReadCustomCombatDefinition,
): Promise<IAdaptedUnit[]> {
  const adapted: IAdaptedUnit[] = [];
  for (const gameUnit of session.units) {
    const adaptedUnit = await adaptRecoveredGameUnit(gameUnit, readCustom);
    if (adaptedUnit === null) {
      continue;
    }
    adapted.push({ ...adaptedUnit, id: gameUnit.id });
  }
  return adapted;
}

async function adaptRecoveredGameUnit(
  gameUnit: IGameUnit,
  readCustom?: ReadCustomCombatDefinition,
): Promise<IAdaptedUnit | null> {
  const options: IAdaptUnitOptions = { side: gameUnit.side };
  if (gameUnit.customUnitDefinition !== undefined) {
    const snapshot = requireRecordedCustomCombatSnapshot(
      gameUnit.customUnitDefinition,
      gameUnit.unitRef,
    );
    const adaptedUnit = await adaptUnit(
      gameUnit.unitRef,
      options,
      snapshotOnlyReader(snapshot),
    );
    if (adaptedUnit === null) {
      throw new Error(
        `Custom unit '${gameUnit.id}' (unitRef '${gameUnit.unitRef}') recorded snapshot could not be adapted`,
      );
    }
    return adaptedUnit;
  }

  const adaptedUnit = await adaptUnit(gameUnit.unitRef, options, readCustom);
  if (adaptedUnit !== null) {
    return adaptedUnit;
  }
  if (isCustomCombatUnitRef(gameUnit.unitRef)) {
    throw new Error(
      `Custom unit '${gameUnit.id}' (unitRef '${gameUnit.unitRef}') has no recorded snapshot and no authoritative definition`,
    );
  }
  // eslint-disable-next-line no-console
  console.warn(
    `[InteractiveSession.fromSessionAsync] unit '${gameUnit.id}' ` +
      `(unitRef '${gameUnit.unitRef}') not found in the canonical ` +
      `catalog - skipping. The recovered host will not have adapted ` +
      `state for this unit and any action targeting it will fail.`,
  );
  return null;
}
