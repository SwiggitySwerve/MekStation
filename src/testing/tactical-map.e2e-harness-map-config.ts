import * as aerospace from './tactical-map.aerospace-scenarios';
import * as arcScenarios from './tactical-map.arc-scenarios';
import * as battleArmor from './tactical-map.battle-armor-scenarios';
import * as wreck from './tactical-map.battlefield-wreck-scenario';
import * as c3 from './tactical-map.c3-scenario';
import * as cappedStack from './tactical-map.capped-isometric-stack-scenario';
import * as combatScenarios from './tactical-map.combat-scenarios';
import * as elevationLos from './tactical-map.elevation-los-scenario';
import {
  tacticalMapHexTerrain,
  tacticalMapMovementRange,
  tacticalMapMpLegend,
  tacticalMapTokens,
} from './tactical-map.fixtures';
import * as frogman from './tactical-map.frogman-scenario';
import * as heatCombat from './tactical-map.heat-combat-scenario';
import * as hoverWater from './tactical-map.hover-water-scenario';
import * as immobileCombat from './tactical-map.immobile-combat-scenario';
import * as lamAirborneFighter from './tactical-map.lam-airborne-fighter-scenario';
import * as lamConversion from './tactical-map.lam-conversion-scenario';
import * as movementCombat from './tactical-map.movement-combat-scenario';
import * as movement from './tactical-map.movement-scenarios';
import * as multiOccluders from './tactical-map.multi-isometric-occluders-scenario';
import * as naval from './tactical-map.naval-landfall-scenario';
import * as occupiedDestination from './tactical-map.occupied-destination-scenario';
import * as proneCombat from './tactical-map.prone-combat-scenario';
import * as quadveeConversion from './tactical-map.quadvee-conversion-scenario';
import * as runWater from './tactical-map.run-water-fallback-scenario';
import * as sameHex from './tactical-map.same-hex-scenarios';
import * as stackedLos from './tactical-map.stacked-los-scenario';
import * as standUp from './tactical-map.standup-scenario';
import * as swim from './tactical-map.swim-scenario';
import * as targetTerrain from './tactical-map.target-terrain-scenarios';
import * as trackedElevation from './tactical-map.tracked-elevation-scenario';
import * as visibility from './tactical-map.visibility-scenarios';

export const movementFixtureScenarios = new Set([
  'battlefield-wreck-rough-terrain',
  'legend-mode-selection',
  'lam-airmek-elevation-crossing',
  'lam-airmek-long-cruise-heat',
  'lam-fighter-airborne-ground-movement-blocked',
  'lam-fighter-grounded-elevation-blocked',
  'lam-mek-elevation-blocked',
  'occupied-destination-blocked',
  'quadvee-mek-elevation-climb',
  'quadvee-vehicle-elevation-blocked',
  'runtime-height-bridge-clearance',
  'run-water-walk-fallback',
  'tracked-elevation-blocked',
  'hover-water-crossing',
  'naval-landfall-blocked',
  'biped-swim-elevation',
  'frogman-deep-water',
  'prone-stand-up',
  'impossible-stand-up',
]);

export const tokensByScenario = {
  'battlefield-wreck-rough-terrain': wreck.tacticalMapBattlefieldWreckTokens,
  'vtol-elevation-cost': movement.tacticalMapVtolTokens,
  'biped-option-projection': movement.tacticalMapBipedOptionTokens,
  'legend-mode-selection': movement.tacticalMapLegendSelectionTokens,
  'mounted-ba-passenger': battleArmor.tacticalMapMountedBattleArmorTokens,
  'aerospace-velocity-projection': aerospace.tacticalMapAerospaceTokens,
  'airborne-aerospace-minimum-range':
    combatScenarios.tacticalMapAirborneAerospaceMinimumRangeTokens,
  'airborne-aerospace-indirect-rejected':
    combatScenarios.tacticalMapAirborneAerospaceMinimumRangeTokens,
  'underwater-environment-restrictions':
    combatScenarios.tacticalMapUnderwaterEnvironmentTokens,
  'c3-range-benefit': c3.tacticalMapC3RangeBenefitTokens,
  'target-terrain-modifier':
    targetTerrain.tacticalMapTargetTerrainModifierTokens,
  'mixed-visibility-targets': visibility.tacticalMapMixedVisibilityTokens,
  'fog-los-terrain-blocked': visibility.tacticalMapFogLosTokens,
  'selected-weapon-out-of-arc': arcScenarios.tacticalMapOutOfArcTokens,
  'vehicle-sponson-in-arc': arcScenarios.tacticalMapSponsonArcTokens,
  'vehicle-right-sponson-in-arc': arcScenarios.tacticalMapRightSponsonArcTokens,
  'vehicle-locked-turret-out-of-arc':
    arcScenarios.tacticalMapLockedTurretTokens,
  'vehicle-chin-turret-pivot': arcScenarios.tacticalMapChinTurretPivotTokens,
  'same-hex-weapon-blocked': sameHex.tacticalMapSameHexTokens,
  'elevation-los-blocked': elevationLos.tacticalMapElevationLosTokens,
  'woods-los-blocked': elevationLos.tacticalMapWoodsLosTokens,
  'stacked-smoke-woods-los-blocked': stackedLos.tacticalMapStackedLosTokens,
  'prone-combat-modifiers': proneCombat.tacticalMapProneCombatTokens,
  'immobile-combat-modifier': immobileCombat.tacticalMapImmobileCombatTokens,
  'heat-combat-modifier': heatCombat.tacticalMapHeatCombatTokens,
  'walk-combat-modifier': movementCombat.tacticalMapWalkCombatTokens,
  'movement-combat-modifier': movementCombat.tacticalMapMovementCombatTokens,
  'jump-combat-modifier': movementCombat.tacticalMapJumpCombatTokens,
  'runtime-height-bridge-clearance': movement.tacticalMapRuntimeHeightTokens,
  'occupied-destination-blocked':
    occupiedDestination.tacticalMapOccupiedDestinationTokens,
  'lam-mek-elevation-blocked': lamConversion.tacticalMapLamMekTokens,
  'lam-airmek-elevation-crossing': lamConversion.tacticalMapLamAirMekTokens,
  'lam-airmek-long-cruise-heat':
    lamConversion.tacticalMapLamAirMekLongCruiseTokens,
  'lam-fighter-grounded-elevation-blocked':
    lamConversion.tacticalMapLamFighterTokens,
  'lam-fighter-airborne-ground-movement-blocked':
    lamAirborneFighter.tacticalMapLamAirborneFighterTokens,
  'quadvee-mek-elevation-climb': quadveeConversion.tacticalMapQuadveeMekTokens,
  'quadvee-vehicle-elevation-blocked':
    quadveeConversion.tacticalMapQuadveeVehicleTokens,
  'run-water-walk-fallback': runWater.tacticalMapRunWaterFallbackTokens,
  'tracked-elevation-blocked':
    trackedElevation.tacticalMapTrackedElevationTokens,
  'hover-water-crossing': hoverWater.tacticalMapHoverWaterTokens,
  'naval-landfall-blocked': naval.tacticalMapNavalLandfallTokens,
  'biped-swim-elevation': swim.tacticalMapSwimTokens,
  'frogman-deep-water': frogman.tacticalMapFrogmanTokens,
  'prone-stand-up': standUp.tacticalMapStandUpTokens,
  'impossible-stand-up': standUp.tacticalMapImpossibleStandUpTokens,
} satisfies Record<string, typeof tacticalMapTokens>;

export const movementRangeByScenario = {
  'battlefield-wreck-rough-terrain':
    wreck.tacticalMapBattlefieldWreckMovementRange,
  'jump-elevation-cost': movement.tacticalMapJumpElevationMovementRange,
  'vtol-elevation-cost': movement.tacticalMapVtolElevationMovementRange,
  'biped-option-projection': movement.tacticalMapBipedOptionMovementRange,
  'runtime-height-bridge-clearance':
    movement.tacticalMapRuntimeHeightMovementRange,
  'occupied-destination-blocked':
    occupiedDestination.tacticalMapOccupiedDestinationMovementRange,
  'lam-mek-elevation-blocked': lamConversion.tacticalMapLamMekMovementRange,
  'lam-airmek-elevation-crossing':
    lamConversion.tacticalMapLamAirMekMovementRange,
  'lam-airmek-long-cruise-heat':
    lamConversion.tacticalMapLamAirMekLongCruiseMovementRange,
  'lam-fighter-grounded-elevation-blocked':
    lamConversion.tacticalMapLamFighterMovementRange,
  'lam-fighter-airborne-ground-movement-blocked':
    lamAirborneFighter.tacticalMapLamAirborneFighterMovementRange,
  'quadvee-mek-elevation-climb':
    quadveeConversion.tacticalMapQuadveeMekMovementRange,
  'quadvee-vehicle-elevation-blocked':
    quadveeConversion.tacticalMapQuadveeVehicleMovementRange,
  'run-water-walk-fallback': runWater.tacticalMapRunWaterFallbackMovementRange,
  'tracked-elevation-blocked':
    trackedElevation.tacticalMapTrackedElevationMovementRange,
  'hover-water-crossing': hoverWater.tacticalMapHoverWaterMovementRange,
  'naval-landfall-blocked': naval.tacticalMapNavalLandfallMovementRange,
  'biped-swim-elevation': swim.tacticalMapSwimMovementRange,
  'frogman-deep-water': frogman.tacticalMapFrogmanMovementRange,
  'prone-stand-up': standUp.tacticalMapStandUpMovementRange,
  'impossible-stand-up': standUp.tacticalMapImpossibleStandUpMovementRange,
} satisfies Record<string, typeof tacticalMapMovementRange>;

export const mpLegendByScenario = {
  'battlefield-wreck-rough-terrain': wreck.tacticalMapBattlefieldWreckMpLegend,
  'jump-elevation-cost': movement.tacticalMapJumpElevationMpLegend,
  'vtol-elevation-cost': movement.tacticalMapVtolElevationMpLegend,
  'biped-option-projection': movement.tacticalMapBipedOptionMpLegend,
  'runtime-height-bridge-clearance': movement.tacticalMapRuntimeHeightMpLegend,
  'occupied-destination-blocked':
    occupiedDestination.tacticalMapOccupiedDestinationMpLegend,
  'lam-mek-elevation-blocked': lamConversion.tacticalMapLamMekMpLegend,
  'lam-airmek-elevation-crossing': lamConversion.tacticalMapLamAirMekMpLegend,
  'lam-airmek-long-cruise-heat': lamConversion.tacticalMapLamAirMekMpLegend,
  'lam-fighter-grounded-elevation-blocked':
    lamConversion.tacticalMapLamFighterMpLegend,
  'lam-fighter-airborne-ground-movement-blocked':
    lamAirborneFighter.tacticalMapLamAirborneFighterMpLegend,
  'quadvee-mek-elevation-climb':
    quadveeConversion.tacticalMapQuadveeMekMpLegend,
  'quadvee-vehicle-elevation-blocked':
    quadveeConversion.tacticalMapQuadveeVehicleMpLegend,
  'run-water-walk-fallback': runWater.tacticalMapRunWaterFallbackMpLegend,
  'tracked-elevation-blocked':
    trackedElevation.tacticalMapTrackedElevationMpLegend,
  'hover-water-crossing': hoverWater.tacticalMapHoverWaterMpLegend,
  'naval-landfall-blocked': naval.tacticalMapNavalLandfallMpLegend,
  'biped-swim-elevation': swim.tacticalMapSwimMpLegend,
  'frogman-deep-water': frogman.tacticalMapFrogmanMpLegend,
  'prone-stand-up': standUp.tacticalMapStandUpMpLegend,
  'impossible-stand-up': standUp.tacticalMapStandUpMpLegend,
} satisfies Record<string, typeof tacticalMapMpLegend>;

export const selectedHexByScenario = {
  'battlefield-wreck-rough-terrain':
    wreck.tacticalMapBattlefieldWreckSelectedHex,
  'biped-option-projection': movement.tacticalMapBipedOptionSelectedHex,
  'legend-mode-selection': movement.tacticalMapLegendSelectionSelectedHex,
  'runtime-height-bridge-clearance':
    movement.tacticalMapRuntimeHeightSelectedHex,
  'occupied-destination-blocked':
    occupiedDestination.tacticalMapOccupiedDestinationSelectedHex,
  'lam-mek-elevation-blocked':
    lamConversion.tacticalMapLamConversionSelectedHex,
  'lam-airmek-elevation-crossing':
    lamConversion.tacticalMapLamConversionSelectedHex,
  'lam-airmek-long-cruise-heat':
    lamConversion.tacticalMapLamConversionSelectedHex,
  'lam-fighter-grounded-elevation-blocked':
    lamConversion.tacticalMapLamConversionSelectedHex,
  'lam-fighter-airborne-ground-movement-blocked':
    lamConversion.tacticalMapLamConversionSelectedHex,
  'quadvee-mek-elevation-climb':
    quadveeConversion.tacticalMapQuadveeConversionSelectedHex,
  'quadvee-vehicle-elevation-blocked':
    quadveeConversion.tacticalMapQuadveeConversionSelectedHex,
  'run-water-walk-fallback': runWater.tacticalMapRunWaterFallbackSelectedHex,
  'tracked-elevation-blocked':
    trackedElevation.tacticalMapTrackedElevationSelectedHex,
  'hover-water-crossing': hoverWater.tacticalMapHoverWaterSelectedHex,
  'naval-landfall-blocked': naval.tacticalMapNavalLandfallSelectedHex,
  'biped-swim-elevation': swim.tacticalMapSwimSelectedHex,
  'frogman-deep-water': frogman.tacticalMapFrogmanSelectedHex,
  'prone-stand-up': standUp.tacticalMapStandUpSelectedHex,
  'impossible-stand-up': standUp.tacticalMapStandUpSelectedHex,
} satisfies Record<string, { readonly q: number; readonly r: number }>;

export const hexTerrainByScenario = {
  'battlefield-wreck-rough-terrain':
    wreck.tacticalMapBattlefieldWreckHexTerrain,
  'runtime-height-bridge-clearance':
    movement.tacticalMapRuntimeHeightBridgeHexTerrain,
  'occupied-destination-blocked':
    occupiedDestination.tacticalMapOccupiedDestinationHexTerrain,
  'lam-mek-elevation-blocked': lamConversion.tacticalMapLamConversionHexTerrain,
  'lam-airmek-elevation-crossing':
    lamConversion.tacticalMapLamConversionHexTerrain,
  'lam-airmek-long-cruise-heat':
    lamConversion.tacticalMapLamAirMekLongCruiseHexTerrain,
  'lam-fighter-grounded-elevation-blocked':
    lamConversion.tacticalMapLamFighterConversionHexTerrain,
  'lam-fighter-airborne-ground-movement-blocked':
    lamConversion.tacticalMapLamFighterConversionHexTerrain,
  'quadvee-mek-elevation-climb':
    quadveeConversion.tacticalMapQuadveeConversionHexTerrain,
  'quadvee-vehicle-elevation-blocked':
    quadveeConversion.tacticalMapQuadveeConversionHexTerrain,
  'run-water-walk-fallback': runWater.tacticalMapRunWaterFallbackHexTerrain,
  'tracked-elevation-blocked':
    trackedElevation.tacticalMapTrackedElevationHexTerrain,
  'hover-water-crossing': hoverWater.tacticalMapHoverWaterHexTerrain,
  'naval-landfall-blocked': naval.tacticalMapNavalLandfallHexTerrain,
  'elevation-los-blocked': elevationLos.tacticalMapElevationLosHexTerrain,
  'woods-los-blocked': elevationLos.tacticalMapWoodsLosHexTerrain,
  'stacked-smoke-woods-los-blocked': stackedLos.tacticalMapStackedLosHexTerrain,
  'fog-los-terrain-blocked': visibility.tacticalMapFogLosHexTerrain,
  'underwater-environment-restrictions':
    combatScenarios.tacticalMapUnderwaterEnvironmentHexTerrain,
  'prone-combat-modifiers': proneCombat.tacticalMapProneCombatHexTerrain,
  'immobile-combat-modifier':
    immobileCombat.tacticalMapImmobileCombatHexTerrain,
  'heat-combat-modifier': heatCombat.tacticalMapHeatCombatHexTerrain,
  'walk-combat-modifier': movementCombat.tacticalMapMovementCombatHexTerrain,
  'movement-combat-modifier':
    movementCombat.tacticalMapMovementCombatHexTerrain,
  'jump-combat-modifier': movementCombat.tacticalMapMovementCombatHexTerrain,
  'biped-swim-elevation': swim.tacticalMapSwimHexTerrain,
  'frogman-deep-water': frogman.tacticalMapFrogmanHexTerrain,
  'prone-stand-up': standUp.tacticalMapStandUpHexTerrain,
  'impossible-stand-up': standUp.tacticalMapStandUpHexTerrain,
  'capped-isometric-stack':
    cappedStack.tacticalMapCappedIsometricStackHexTerrain,
  'multi-isometric-occluders':
    multiOccluders.tacticalMapMultiIsometricOccludersHexTerrain,
} satisfies Record<string, typeof tacticalMapHexTerrain>;

export const mapRadiusByScenario = {
  'lam-airmek-long-cruise-heat': 6,
} satisfies Record<string, number>;
