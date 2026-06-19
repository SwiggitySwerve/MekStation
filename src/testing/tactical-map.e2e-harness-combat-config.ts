import * as aerospace from './tactical-map.aerospace-scenarios';
import * as arcScenarios from './tactical-map.arc-scenarios';
import * as battleArmor from './tactical-map.battle-armor-scenarios';
import * as c3 from './tactical-map.c3-scenario';
import * as combatScenarios from './tactical-map.combat-scenarios';
import * as elevationLos from './tactical-map.elevation-los-scenario';
import {
  tacticalMapCombatState,
  tacticalMapOutOfRangeSelectedWeaponIds,
} from './tactical-map.fixtures';
import * as heatCombat from './tactical-map.heat-combat-scenario';
import * as immobileCombat from './tactical-map.immobile-combat-scenario';
import { tacticalMapIndirectFireHarnessScenarios as indirectFireHarnessScenarios } from './tactical-map.indirect-fire-harness';
import * as mixedVehicle from './tactical-map.mixed-vehicle-volley-scenario';
import * as movementCombat from './tactical-map.movement-combat-scenario';
import * as proneCombat from './tactical-map.prone-combat-scenario';
import * as sameHex from './tactical-map.same-hex-scenarios';
import * as stackedLos from './tactical-map.stacked-los-scenario';
import * as targetTerrain from './tactical-map.target-terrain-scenarios';
import * as visibility from './tactical-map.visibility-scenarios';

export const combatOnlyScenarios = new Set([
  ...Object.keys(indirectFireHarnessScenarios),
  ...Object.keys(mixedVehicle.tacticalMapMixedVehicleVolleyHarnessScenarios),
  'aerospace-velocity-projection',
  'airborne-aerospace-minimum-range',
  'airborne-aerospace-indirect-rejected',
  'underwater-environment-restrictions',
  'c3-range-benefit',
  'target-terrain-modifier',
  'mixed-visibility-targets',
  'fog-los-terrain-blocked',
  'selected-weapon-out-of-arc',
  'vehicle-sponson-in-arc',
  'vehicle-right-sponson-in-arc',
  'vehicle-locked-turret-out-of-arc',
  'vehicle-chin-turret-pivot',
  'same-hex-weapon-blocked',
  'elevation-los-blocked',
  'woods-los-blocked',
  'stacked-smoke-woods-los-blocked',
  'prone-combat-modifiers',
  'immobile-combat-modifier',
  'heat-combat-modifier',
  'walk-combat-modifier',
  'movement-combat-modifier',
  'jump-combat-modifier',
  'out-of-ammo',
]);

export const selectedWeaponIdsByScenario = {
  'aerospace-velocity-projection': [],
  'airborne-aerospace-minimum-range':
    combatScenarios.tacticalMapAirborneAerospaceMinimumRangeSelectedWeaponIds,
  'airborne-aerospace-indirect-rejected':
    combatScenarios.tacticalMapAirborneAerospaceIndirectSelectedWeaponIds,
  'underwater-environment-restrictions':
    combatScenarios.tacticalMapUnderwaterEnvironmentSelectedWeaponIds,
  'c3-range-benefit': c3.tacticalMapC3RangeBenefitSelectedWeaponIds,
  'target-terrain-modifier':
    targetTerrain.tacticalMapTargetTerrainModifierSelectedWeaponIds,
  'mixed-visibility-targets':
    visibility.tacticalMapMixedVisibilitySelectedWeaponIds,
  'fog-los-terrain-blocked': visibility.tacticalMapFogLosSelectedWeaponIds,
  'selected-weapon-out-of-arc':
    arcScenarios.tacticalMapOutOfArcSelectedWeaponIds,
  'vehicle-sponson-in-arc': arcScenarios.tacticalMapSponsonArcSelectedWeaponIds,
  'vehicle-right-sponson-in-arc':
    arcScenarios.tacticalMapRightSponsonArcSelectedWeaponIds,
  'vehicle-locked-turret-out-of-arc':
    arcScenarios.tacticalMapLockedTurretSelectedWeaponIds,
  'vehicle-chin-turret-pivot':
    arcScenarios.tacticalMapChinTurretPivotSelectedWeaponIds,
  'same-hex-weapon-blocked': sameHex.tacticalMapSameHexSelectedWeaponIds,
  'elevation-los-blocked':
    elevationLos.tacticalMapElevationLosSelectedWeaponIds,
  'woods-los-blocked': elevationLos.tacticalMapWoodsLosSelectedWeaponIds,
  'stacked-smoke-woods-los-blocked':
    stackedLos.tacticalMapStackedLosSelectedWeaponIds,
  'prone-combat-modifiers': proneCombat.tacticalMapProneCombatSelectedWeaponIds,
  'immobile-combat-modifier':
    immobileCombat.tacticalMapImmobileCombatSelectedWeaponIds,
  'heat-combat-modifier': heatCombat.tacticalMapHeatCombatSelectedWeaponIds,
  'walk-combat-modifier': movementCombat.tacticalMapWalkCombatSelectedWeaponIds,
  'movement-combat-modifier':
    movementCombat.tacticalMapMovementCombatSelectedWeaponIds,
  'jump-combat-modifier': movementCombat.tacticalMapJumpCombatSelectedWeaponIds,
  'out-of-ammo': combatScenarios.tacticalMapOutOfAmmoSelectedWeaponIds,
  'out-of-range': tacticalMapOutOfRangeSelectedWeaponIds,
} satisfies Record<string, readonly string[]>;

export const targetUnitIdByScenario = {
  'aerospace-velocity-projection': null,
  'airborne-aerospace-minimum-range':
    combatScenarios.tacticalMapAirborneAerospaceMinimumRangeTargetId,
  'airborne-aerospace-indirect-rejected':
    combatScenarios.tacticalMapAirborneAerospaceMinimumRangeTargetId,
  'underwater-environment-restrictions':
    combatScenarios.tacticalMapUnderwaterEnvironmentTargetId,
  'c3-range-benefit': c3.tacticalMapC3RangeBenefitTargetId,
  'target-terrain-modifier':
    targetTerrain.tacticalMapTargetTerrainModifierTargetId,
  'mixed-visibility-targets': null,
  'fog-los-terrain-blocked': visibility.tacticalMapFogLosTargetId,
  'selected-weapon-out-of-arc': arcScenarios.tacticalMapOutOfArcTargetId,
  'vehicle-sponson-in-arc': arcScenarios.tacticalMapSponsonArcTargetId,
  'vehicle-right-sponson-in-arc':
    arcScenarios.tacticalMapRightSponsonArcTargetId,
  'vehicle-locked-turret-out-of-arc':
    arcScenarios.tacticalMapLockedTurretTargetId,
  'vehicle-chin-turret-pivot': arcScenarios.tacticalMapChinTurretPivotTargetId,
  'same-hex-weapon-blocked': sameHex.tacticalMapSameHexTargetId,
  'elevation-los-blocked': elevationLos.tacticalMapElevationLosTargetId,
  'woods-los-blocked': elevationLos.tacticalMapWoodsLosTargetId,
  'stacked-smoke-woods-los-blocked': stackedLos.tacticalMapStackedLosTargetId,
  'prone-combat-modifiers': proneCombat.tacticalMapProneCombatTargetId,
  'immobile-combat-modifier': immobileCombat.tacticalMapImmobileCombatTargetId,
  'heat-combat-modifier': heatCombat.tacticalMapHeatCombatTargetId,
  'walk-combat-modifier': movementCombat.tacticalMapWalkCombatTargetId,
  'movement-combat-modifier': movementCombat.tacticalMapMovementCombatTargetId,
  'jump-combat-modifier': movementCombat.tacticalMapJumpCombatTargetId,
  'out-of-ammo': combatScenarios.tacticalMapOutOfAmmoTargetId,
  'out-of-range': 'medium-target',
} satisfies Record<string, string | null>;

export const combatStateByScenario = {
  'mounted-ba-passenger': battleArmor.tacticalMapMountedBattleArmorCombatState,
  'aerospace-velocity-projection': aerospace.tacticalMapAerospaceCombatState,
  'airborne-aerospace-minimum-range':
    combatScenarios.tacticalMapAirborneAerospaceMinimumRangeCombatState,
  'airborne-aerospace-indirect-rejected':
    combatScenarios.tacticalMapAirborneAerospaceMinimumRangeCombatState,
  'underwater-environment-restrictions':
    combatScenarios.tacticalMapUnderwaterEnvironmentCombatState,
  'c3-range-benefit': c3.tacticalMapC3RangeBenefitCombatState,
  'target-terrain-modifier':
    targetTerrain.tacticalMapTargetTerrainModifierCombatState,
  'mixed-visibility-targets': visibility.tacticalMapMixedVisibilityCombatState,
  'fog-los-terrain-blocked': visibility.tacticalMapFogLosCombatState,
  'selected-weapon-out-of-arc': arcScenarios.tacticalMapOutOfArcCombatState,
  'vehicle-sponson-in-arc': arcScenarios.tacticalMapSponsonArcCombatState,
  'vehicle-right-sponson-in-arc':
    arcScenarios.tacticalMapRightSponsonArcCombatState,
  'vehicle-locked-turret-out-of-arc':
    arcScenarios.tacticalMapLockedTurretCombatState,
  'vehicle-chin-turret-pivot':
    arcScenarios.tacticalMapChinTurretPivotCombatState,
  'same-hex-weapon-blocked': sameHex.tacticalMapSameHexCombatState,
  'elevation-los-blocked': elevationLos.tacticalMapElevationLosCombatState,
  'woods-los-blocked': elevationLos.tacticalMapWoodsLosCombatState,
  'stacked-smoke-woods-los-blocked':
    stackedLos.tacticalMapStackedLosCombatState,
  'prone-combat-modifiers': proneCombat.tacticalMapProneCombatState,
  'immobile-combat-modifier': immobileCombat.tacticalMapImmobileCombatState,
  'heat-combat-modifier': heatCombat.tacticalMapHeatCombatState,
  'walk-combat-modifier': movementCombat.tacticalMapWalkCombatState,
  'movement-combat-modifier': movementCombat.tacticalMapMovementCombatState,
  'jump-combat-modifier': movementCombat.tacticalMapJumpCombatState,
} satisfies Record<string, typeof tacticalMapCombatState>;
