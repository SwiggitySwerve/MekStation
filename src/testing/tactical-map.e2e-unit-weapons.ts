import * as arcScenarios from './tactical-map.arc-scenarios';
import * as combatScenarios from './tactical-map.combat-scenarios';
import { tacticalMapUnitWeapons } from './tactical-map.fixtures';

export function tacticalMapUnitWeaponsForE2EScenario(
  scenario: string,
): typeof tacticalMapUnitWeapons {
  switch (scenario) {
    case 'airborne-aerospace-indirect-rejected':
      return combatScenarios.tacticalMapAirborneAerospaceIndirectUnitWeapons;
    case 'underwater-environment-restrictions':
      return combatScenarios.tacticalMapUnderwaterEnvironmentUnitWeapons;
    case 'out-of-ammo':
      return combatScenarios.tacticalMapOutOfAmmoUnitWeapons;
    case 'selected-weapon-out-of-arc':
      return arcScenarios.tacticalMapOutOfArcUnitWeapons;
    case 'vehicle-sponson-in-arc':
      return arcScenarios.tacticalMapSponsonArcUnitWeapons;
    case 'vehicle-right-sponson-in-arc':
      return arcScenarios.tacticalMapRightSponsonArcUnitWeapons;
    case 'vehicle-locked-turret-out-of-arc':
      return arcScenarios.tacticalMapLockedTurretUnitWeapons;
    case 'vehicle-chin-turret-pivot':
      return arcScenarios.tacticalMapChinTurretPivotUnitWeapons;
    default:
      return tacticalMapUnitWeapons;
  }
}
