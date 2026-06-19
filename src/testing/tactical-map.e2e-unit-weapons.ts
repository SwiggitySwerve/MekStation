import * as arcScenarios from './tactical-map.arc-scenarios';
import * as combatScenarios from './tactical-map.combat-scenarios';
import { tacticalMapUnitWeapons } from './tactical-map.fixtures';

const unitWeaponsByScenario: Record<string, typeof tacticalMapUnitWeapons> = {
  'airborne-aerospace-indirect-rejected':
    combatScenarios.tacticalMapAirborneAerospaceIndirectUnitWeapons,
  'underwater-environment-restrictions':
    combatScenarios.tacticalMapUnderwaterEnvironmentUnitWeapons,
  'out-of-ammo': combatScenarios.tacticalMapOutOfAmmoUnitWeapons,
  'selected-weapon-out-of-arc': arcScenarios.tacticalMapOutOfArcUnitWeapons,
  'vehicle-sponson-in-arc': arcScenarios.tacticalMapSponsonArcUnitWeapons,
  'vehicle-right-sponson-in-arc':
    arcScenarios.tacticalMapRightSponsonArcUnitWeapons,
  'vehicle-locked-turret-out-of-arc':
    arcScenarios.tacticalMapLockedTurretUnitWeapons,
  'vehicle-chin-turret-pivot':
    arcScenarios.tacticalMapChinTurretPivotUnitWeapons,
};

export function tacticalMapUnitWeaponsForE2EScenario(
  scenario: string,
): typeof tacticalMapUnitWeapons {
  return unitWeaponsByScenario[scenario] ?? tacticalMapUnitWeapons;
}
