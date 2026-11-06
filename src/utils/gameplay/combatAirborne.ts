import type { IUnitGameState } from '@/types/gameplay';
import type { ITerrainFeature } from '@/types/gameplay/TerrainTypes';

import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

/**
 * Native Entity airborne disjunction, not the caller's represented flag.
 * MegaMek 48fcb2f64 Entity.java:14126-14148,15944-15948;
 * IAero.java:945-979. See combatAirborne.RULES.md for lifecycle mapping.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/quirk-combat-integration/spec.md
 */
export function deriveTargetIsAirborne(
  unit: Pick<IUnitGameState, 'combatState' | 'destroyed'>,
  terrainFeatures: readonly ITerrainFeature[] = [],
): boolean | undefined {
  const combat = unit.combatState;
  if (!combat) return undefined;
  const destroyed = unit.destroyed || combat.state.destroyed;

  if (combat.kind === 'aero') {
    const flightModeActive =
      combat.state.airborneState === 'airborne' ||
      combat.state.airborneState === 'taking-off' ||
      combat.state.airborneState === 'landing';
    // Native precedence: destruction gates altitude, not either flight mode.
    return (!destroyed && combat.state.altitude > 0) || flightModeActive;
  }

  if (combat.kind === 'vehicle') {
    if (destroyed) return false;
    const { motionType, altitude: elevation } = combat.state;
    if (
      motionType !== GroundMotionType.VTOL &&
      motionType !== GroundMotionType.WIGE
    )
      return false;
    if (elevation === undefined) return undefined;
    if (elevation <= 0) return false;
    return !terrainFeatures.some(
      (feature) =>
        (feature.type === TerrainType.Building ||
          feature.type === TerrainType.Bridge) &&
        feature.level >= elevation,
    );
  }

  // Other families have no established native flight/elevation mapping here.
  return undefined;
}
