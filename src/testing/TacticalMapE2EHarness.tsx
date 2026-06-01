import { useRouter } from 'next/router';
import { useState } from 'react';

import type { MapMovementKind } from '@/components/gameplay/HexMapDisplay/HexMapDisplay.types';

import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
import * as aerospace from '@/testing/tactical-map.aerospace-scenarios';
import * as arcScenarios from '@/testing/tactical-map.arc-scenarios';
import * as battleArmor from '@/testing/tactical-map.battle-armor-scenarios';
import * as wreck from '@/testing/tactical-map.battlefield-wreck-scenario';
import * as c3 from '@/testing/tactical-map.c3-scenario';
import * as cappedStack from '@/testing/tactical-map.capped-isometric-stack-scenario';
import * as combatScenarios from '@/testing/tactical-map.combat-scenarios';
import { tacticalMapUnitWeaponsForE2EScenario } from '@/testing/tactical-map.e2e-unit-weapons';
import * as elevationLos from '@/testing/tactical-map.elevation-los-scenario';
import {
  tacticalMapCombatState,
  tacticalMapHexTerrain,
  tacticalMapHighlightPath,
  tacticalMapMovementRange,
  tacticalMapMpLegend,
  tacticalMapOutOfRangeSelectedWeaponIds,
  tacticalMapSelectedWeaponIds,
  tacticalMapTokens,
} from '@/testing/tactical-map.fixtures';
import * as frogman from '@/testing/tactical-map.frogman-scenario';
import * as heatCombat from '@/testing/tactical-map.heat-combat-scenario';
import * as hoverWater from '@/testing/tactical-map.hover-water-scenario';
import * as immobileCombat from '@/testing/tactical-map.immobile-combat-scenario';
import { tacticalMapIndirectFireHarnessScenarios as indirectFireHarnessScenarios } from '@/testing/tactical-map.indirect-fire-harness';
import * as lamAirborneFighter from '@/testing/tactical-map.lam-airborne-fighter-scenario';
import * as lamConversion from '@/testing/tactical-map.lam-conversion-scenario';
import * as mixedVehicle from '@/testing/tactical-map.mixed-vehicle-volley-scenario';
import * as movementCombat from '@/testing/tactical-map.movement-combat-scenario';
import * as movement from '@/testing/tactical-map.movement-scenarios';
import * as multiOccluders from '@/testing/tactical-map.multi-isometric-occluders-scenario';
import * as naval from '@/testing/tactical-map.naval-landfall-scenario';
import * as occupiedDestination from '@/testing/tactical-map.occupied-destination-scenario';
import * as proneCombat from '@/testing/tactical-map.prone-combat-scenario';
import * as quadveeConversion from '@/testing/tactical-map.quadvee-conversion-scenario';
import * as runWater from '@/testing/tactical-map.run-water-fallback-scenario';
import * as sameHex from '@/testing/tactical-map.same-hex-scenarios';
import * as stackedLos from '@/testing/tactical-map.stacked-los-scenario';
import * as standUp from '@/testing/tactical-map.standup-scenario';
import * as swim from '@/testing/tactical-map.swim-scenario';
import * as targetTerrain from '@/testing/tactical-map.target-terrain-scenarios';
import * as trackedElevation from '@/testing/tactical-map.tracked-elevation-scenario';
import * as visibility from '@/testing/tactical-map.visibility-scenarios';

const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_MODE === 'true';

const combatOnlyScenarios = new Set([
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

const movementFixtureScenarios = new Set([
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

const selectedWeaponIdsByScenario = {
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

const targetUnitIdByScenario = {
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

const tokensByScenario = {
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

const combatStateByScenario = {
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

const movementRangeByScenario = {
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

const mpLegendByScenario = {
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

const selectedHexByScenario = {
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

const hexTerrainByScenario = {
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

const mapRadiusByScenario = {
  'lam-airmek-long-cruise-heat': 6,
} satisfies Record<string, number>;

function scenarioValue<T>(
  scenario: string,
  values: Partial<Record<string, T>>,
  fallback: T,
): T {
  return Object.prototype.hasOwnProperty.call(values, scenario)
    ? values[scenario]!
    : fallback;
}

export default function TacticalMapE2EHarness(): React.JSX.Element {
  const router = useRouter();
  const [legendMode, setLegendMode] = useState<MapMovementKind>('run');
  const scenario =
    typeof router.query.scenario === 'string' ? router.query.scenario : '';
  const harnessScenario =
    scenario in indirectFireHarnessScenarios
      ? indirectFireHarnessScenarios[
          scenario as keyof typeof indirectFireHarnessScenarios
        ]
      : scenario in mixedVehicle.tacticalMapMixedVehicleVolleyHarnessScenarios
        ? mixedVehicle.tacticalMapMixedVehicleVolleyHarnessScenarios[
            scenario as keyof typeof mixedVehicle.tacticalMapMixedVehicleVolleyHarnessScenarios
          ]
        : undefined;
  const harnessUnitWeapons =
    harnessScenario && 'unitWeapons' in harnessScenario
      ? harnessScenario.unitWeapons
      : undefined;
  const isCombatOnlyScenario = combatOnlyScenarios.has(scenario);
  const isMovementFixtureScenario = movementFixtureScenarios.has(scenario);
  const selectedWeaponIds =
    harnessScenario?.selectedWeaponIds ??
    scenarioValue(
      scenario,
      selectedWeaponIdsByScenario,
      tacticalMapSelectedWeaponIds,
    );
  const targetUnitId = isMovementFixtureScenario
    ? null
    : (harnessScenario?.targetUnitId ??
      scenarioValue(scenario, targetUnitIdByScenario, 'occluded'));
  const tokens =
    harnessScenario?.tokens ??
    scenarioValue(scenario, tokensByScenario, tacticalMapTokens);
  const combatState =
    harnessScenario?.combatState ??
    scenarioValue(scenario, combatStateByScenario, tacticalMapCombatState);
  const unitWeapons =
    harnessUnitWeapons ?? tacticalMapUnitWeaponsForE2EScenario(scenario);
  const movementRange =
    isCombatOnlyScenario || scenario === 'legend-mode-selection'
      ? scenario === 'legend-mode-selection'
        ? movement.tacticalMapLegendSelectionMovementRangeByMode[legendMode]
        : undefined
      : scenarioValue(
          scenario,
          movementRangeByScenario,
          tacticalMapMovementRange,
        );
  const mpLegend =
    isCombatOnlyScenario || scenario === 'legend-mode-selection'
      ? scenario === 'legend-mode-selection'
        ? movement.tacticalMapLegendSelectionMpLegend(legendMode)
        : undefined
      : scenarioValue(scenario, mpLegendByScenario, tacticalMapMpLegend);
  const selectedHex =
    harnessScenario?.selectedHex ??
    scenarioValue(
      scenario,
      selectedHexByScenario,
      isCombatOnlyScenario ? { q: 0, r: 0 } : { q: -1, r: 0 },
    );
  const highlightPath =
    isCombatOnlyScenario || isMovementFixtureScenario
      ? undefined
      : tacticalMapHighlightPath;
  const hexTerrain =
    harnessScenario?.hexTerrain ??
    scenarioValue(scenario, hexTerrainByScenario, tacticalMapHexTerrain);
  const mapRadius = scenarioValue(scenario, mapRadiusByScenario, 3);

  if (!isTestEnv) {
    return <main style={{ padding: 40 }}>Not Available</main>;
  }

  return (
    <main
      className="min-h-screen bg-slate-950 p-4 text-slate-100"
      data-testid="tactical-map-e2e-harness"
    >
      <section className="mx-auto flex max-w-6xl flex-col gap-3">
        <h1 className="text-lg font-semibold">Tactical Map E2E Harness</h1>
        <div className="h-[680px] overflow-hidden rounded border border-slate-700 bg-slate-900">
          <HexMapDisplay
            mapId="tactical-map-e2e"
            radius={mapRadius}
            tokens={tokens}
            selectedHex={selectedHex}
            targetUnitId={targetUnitId}
            hexTerrain={hexTerrain}
            unitWeapons={unitWeapons}
            combatState={combatState}
            selectedWeaponIds={selectedWeaponIds}
            showCoordinates
            movementRange={movementRange}
            highlightPath={highlightPath}
            mpLegend={mpLegend}
            onMovementModeSelect={
              scenario === 'legend-mode-selection' ? setLegendMode : undefined
            }
          />
        </div>
      </section>
    </main>
  );
}
