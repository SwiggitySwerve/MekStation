import { useRouter } from 'next/router';

import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
import * as aerospace from '@/testing/tactical-map.aerospace-scenarios';
import * as arcScenarios from '@/testing/tactical-map.arc-scenarios';
import * as battleArmor from '@/testing/tactical-map.battle-armor-scenarios';
import * as combatScenarios from '@/testing/tactical-map.combat-scenarios';
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
  tacticalMapUnitWeapons,
} from '@/testing/tactical-map.fixtures';
import {
  tacticalMapFrogmanHexTerrain,
  tacticalMapFrogmanMovementRange,
  tacticalMapFrogmanMpLegend,
  tacticalMapFrogmanSelectedHex,
  tacticalMapFrogmanTokens,
} from '@/testing/tactical-map.frogman-scenario';
import * as heatCombat from '@/testing/tactical-map.heat-combat-scenario';
import {
  tacticalMapHoverWaterHexTerrain,
  tacticalMapHoverWaterMovementRange,
  tacticalMapHoverWaterMpLegend,
  tacticalMapHoverWaterSelectedHex,
  tacticalMapHoverWaterTokens,
} from '@/testing/tactical-map.hover-water-scenario';
import * as immobileCombat from '@/testing/tactical-map.immobile-combat-scenario';
import * as movementCombat from '@/testing/tactical-map.movement-combat-scenario';
import {
  tacticalMapBipedOptionMovementRange,
  tacticalMapBipedOptionMpLegend,
  tacticalMapBipedOptionSelectedHex,
  tacticalMapBipedOptionTokens,
  tacticalMapJumpElevationMovementRange,
  tacticalMapJumpElevationMpLegend,
  tacticalMapRuntimeHeightBridgeHexTerrain,
  tacticalMapRuntimeHeightMovementRange,
  tacticalMapRuntimeHeightMpLegend,
  tacticalMapRuntimeHeightSelectedHex,
  tacticalMapRuntimeHeightTokens,
  tacticalMapVtolElevationMovementRange,
  tacticalMapVtolElevationMpLegend,
  tacticalMapVtolTokens,
} from '@/testing/tactical-map.movement-scenarios';
import {
  tacticalMapNavalLandfallHexTerrain,
  tacticalMapNavalLandfallMovementRange,
  tacticalMapNavalLandfallMpLegend,
  tacticalMapNavalLandfallSelectedHex,
  tacticalMapNavalLandfallTokens,
} from '@/testing/tactical-map.naval-landfall-scenario';
import * as proneCombat from '@/testing/tactical-map.prone-combat-scenario';
import {
  tacticalMapRunWaterFallbackHexTerrain,
  tacticalMapRunWaterFallbackMovementRange,
  tacticalMapRunWaterFallbackMpLegend,
  tacticalMapRunWaterFallbackSelectedHex,
  tacticalMapRunWaterFallbackTokens,
} from '@/testing/tactical-map.run-water-fallback-scenario';
import * as sameHex from '@/testing/tactical-map.same-hex-scenarios';
import * as stackedLos from '@/testing/tactical-map.stacked-los-scenario';
import * as standUp from '@/testing/tactical-map.standup-scenario';
import {
  tacticalMapSwimHexTerrain,
  tacticalMapSwimMovementRange,
  tacticalMapSwimMpLegend,
  tacticalMapSwimSelectedHex,
  tacticalMapSwimTokens,
} from '@/testing/tactical-map.swim-scenario';
import * as targetTerrain from '@/testing/tactical-map.target-terrain-scenarios';
import {
  tacticalMapTrackedElevationHexTerrain,
  tacticalMapTrackedElevationMovementRange,
  tacticalMapTrackedElevationMpLegend,
  tacticalMapTrackedElevationSelectedHex,
  tacticalMapTrackedElevationTokens,
} from '@/testing/tactical-map.tracked-elevation-scenario';
import * as visibility from '@/testing/tactical-map.visibility-scenarios';

const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_MODE === 'true';

const combatOnlyScenarios = new Set([
  'aerospace-velocity-projection',
  'airborne-aerospace-minimum-range',
  'target-terrain-modifier',
  'mixed-visibility-targets',
  'selected-weapon-out-of-arc',
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
]);

const movementFixtureScenarios = new Set([
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
  'target-terrain-modifier':
    targetTerrain.tacticalMapTargetTerrainModifierSelectedWeaponIds,
  'mixed-visibility-targets':
    visibility.tacticalMapMixedVisibilitySelectedWeaponIds,
  'selected-weapon-out-of-arc':
    arcScenarios.tacticalMapOutOfArcSelectedWeaponIds,
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
  'out-of-range': tacticalMapOutOfRangeSelectedWeaponIds,
} satisfies Record<string, readonly string[]>;

const targetUnitIdByScenario = {
  'aerospace-velocity-projection': null,
  'airborne-aerospace-minimum-range':
    combatScenarios.tacticalMapAirborneAerospaceMinimumRangeTargetId,
  'target-terrain-modifier':
    targetTerrain.tacticalMapTargetTerrainModifierTargetId,
  'mixed-visibility-targets': null,
  'selected-weapon-out-of-arc': arcScenarios.tacticalMapOutOfArcTargetId,
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
  'out-of-range': 'medium-target',
} satisfies Record<string, string | null>;

const tokensByScenario = {
  'vtol-elevation-cost': tacticalMapVtolTokens,
  'biped-option-projection': tacticalMapBipedOptionTokens,
  'mounted-ba-passenger': battleArmor.tacticalMapMountedBattleArmorTokens,
  'aerospace-velocity-projection': aerospace.tacticalMapAerospaceTokens,
  'airborne-aerospace-minimum-range':
    combatScenarios.tacticalMapAirborneAerospaceMinimumRangeTokens,
  'target-terrain-modifier':
    targetTerrain.tacticalMapTargetTerrainModifierTokens,
  'mixed-visibility-targets': visibility.tacticalMapMixedVisibilityTokens,
  'selected-weapon-out-of-arc': arcScenarios.tacticalMapOutOfArcTokens,
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
  'runtime-height-bridge-clearance': tacticalMapRuntimeHeightTokens,
  'run-water-walk-fallback': tacticalMapRunWaterFallbackTokens,
  'tracked-elevation-blocked': tacticalMapTrackedElevationTokens,
  'hover-water-crossing': tacticalMapHoverWaterTokens,
  'naval-landfall-blocked': tacticalMapNavalLandfallTokens,
  'biped-swim-elevation': tacticalMapSwimTokens,
  'frogman-deep-water': tacticalMapFrogmanTokens,
  'prone-stand-up': standUp.tacticalMapStandUpTokens,
  'impossible-stand-up': standUp.tacticalMapImpossibleStandUpTokens,
} satisfies Record<string, typeof tacticalMapTokens>;

const combatStateByScenario = {
  'mounted-ba-passenger': battleArmor.tacticalMapMountedBattleArmorCombatState,
  'aerospace-velocity-projection': aerospace.tacticalMapAerospaceCombatState,
  'airborne-aerospace-minimum-range':
    combatScenarios.tacticalMapAirborneAerospaceMinimumRangeCombatState,
  'target-terrain-modifier':
    targetTerrain.tacticalMapTargetTerrainModifierCombatState,
  'mixed-visibility-targets': visibility.tacticalMapMixedVisibilityCombatState,
  'selected-weapon-out-of-arc': arcScenarios.tacticalMapOutOfArcCombatState,
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
  'jump-elevation-cost': tacticalMapJumpElevationMovementRange,
  'vtol-elevation-cost': tacticalMapVtolElevationMovementRange,
  'biped-option-projection': tacticalMapBipedOptionMovementRange,
  'runtime-height-bridge-clearance': tacticalMapRuntimeHeightMovementRange,
  'run-water-walk-fallback': tacticalMapRunWaterFallbackMovementRange,
  'tracked-elevation-blocked': tacticalMapTrackedElevationMovementRange,
  'hover-water-crossing': tacticalMapHoverWaterMovementRange,
  'naval-landfall-blocked': tacticalMapNavalLandfallMovementRange,
  'biped-swim-elevation': tacticalMapSwimMovementRange,
  'frogman-deep-water': tacticalMapFrogmanMovementRange,
  'prone-stand-up': standUp.tacticalMapStandUpMovementRange,
  'impossible-stand-up': standUp.tacticalMapImpossibleStandUpMovementRange,
} satisfies Record<string, typeof tacticalMapMovementRange>;

const mpLegendByScenario = {
  'jump-elevation-cost': tacticalMapJumpElevationMpLegend,
  'vtol-elevation-cost': tacticalMapVtolElevationMpLegend,
  'biped-option-projection': tacticalMapBipedOptionMpLegend,
  'runtime-height-bridge-clearance': tacticalMapRuntimeHeightMpLegend,
  'run-water-walk-fallback': tacticalMapRunWaterFallbackMpLegend,
  'tracked-elevation-blocked': tacticalMapTrackedElevationMpLegend,
  'hover-water-crossing': tacticalMapHoverWaterMpLegend,
  'naval-landfall-blocked': tacticalMapNavalLandfallMpLegend,
  'biped-swim-elevation': tacticalMapSwimMpLegend,
  'frogman-deep-water': tacticalMapFrogmanMpLegend,
  'prone-stand-up': standUp.tacticalMapStandUpMpLegend,
  'impossible-stand-up': standUp.tacticalMapStandUpMpLegend,
} satisfies Record<string, typeof tacticalMapMpLegend>;

const selectedHexByScenario = {
  'biped-option-projection': tacticalMapBipedOptionSelectedHex,
  'runtime-height-bridge-clearance': tacticalMapRuntimeHeightSelectedHex,
  'run-water-walk-fallback': tacticalMapRunWaterFallbackSelectedHex,
  'tracked-elevation-blocked': tacticalMapTrackedElevationSelectedHex,
  'hover-water-crossing': tacticalMapHoverWaterSelectedHex,
  'naval-landfall-blocked': tacticalMapNavalLandfallSelectedHex,
  'biped-swim-elevation': tacticalMapSwimSelectedHex,
  'frogman-deep-water': tacticalMapFrogmanSelectedHex,
  'prone-stand-up': standUp.tacticalMapStandUpSelectedHex,
  'impossible-stand-up': standUp.tacticalMapStandUpSelectedHex,
  'selected-weapon-out-of-arc': { q: 0, r: 0 },
  'same-hex-weapon-blocked': { q: 0, r: 0 },
  'elevation-los-blocked': { q: 0, r: 0 },
  'woods-los-blocked': { q: 0, r: 0 },
  'stacked-smoke-woods-los-blocked': { q: 0, r: 0 },
  'prone-combat-modifiers': { q: 0, r: 0 },
  'immobile-combat-modifier': { q: 0, r: 0 },
  'heat-combat-modifier': { q: 0, r: 0 },
  'walk-combat-modifier': { q: 0, r: 0 },
  'movement-combat-modifier': { q: 0, r: 0 },
  'jump-combat-modifier': { q: 0, r: 0 },
  'mounted-ba-passenger': { q: 0, r: 0 },
  'aerospace-velocity-projection': { q: 0, r: 0 },
} satisfies Record<string, { readonly q: number; readonly r: number }>;

const hexTerrainByScenario = {
  'runtime-height-bridge-clearance': tacticalMapRuntimeHeightBridgeHexTerrain,
  'run-water-walk-fallback': tacticalMapRunWaterFallbackHexTerrain,
  'tracked-elevation-blocked': tacticalMapTrackedElevationHexTerrain,
  'hover-water-crossing': tacticalMapHoverWaterHexTerrain,
  'naval-landfall-blocked': tacticalMapNavalLandfallHexTerrain,
  'elevation-los-blocked': elevationLos.tacticalMapElevationLosHexTerrain,
  'woods-los-blocked': elevationLos.tacticalMapWoodsLosHexTerrain,
  'stacked-smoke-woods-los-blocked': stackedLos.tacticalMapStackedLosHexTerrain,
  'prone-combat-modifiers': proneCombat.tacticalMapProneCombatHexTerrain,
  'immobile-combat-modifier':
    immobileCombat.tacticalMapImmobileCombatHexTerrain,
  'heat-combat-modifier': heatCombat.tacticalMapHeatCombatHexTerrain,
  'walk-combat-modifier': movementCombat.tacticalMapMovementCombatHexTerrain,
  'movement-combat-modifier':
    movementCombat.tacticalMapMovementCombatHexTerrain,
  'jump-combat-modifier': movementCombat.tacticalMapMovementCombatHexTerrain,
  'biped-swim-elevation': tacticalMapSwimHexTerrain,
  'frogman-deep-water': tacticalMapFrogmanHexTerrain,
  'prone-stand-up': standUp.tacticalMapStandUpHexTerrain,
  'impossible-stand-up': standUp.tacticalMapStandUpHexTerrain,
} satisfies Record<string, typeof tacticalMapHexTerrain>;

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
  const scenario =
    typeof router.query.scenario === 'string' ? router.query.scenario : '';
  const isCombatOnlyScenario = combatOnlyScenarios.has(scenario);
  const isMovementFixtureScenario = movementFixtureScenarios.has(scenario);
  const selectedWeaponIds = scenarioValue(
    scenario,
    selectedWeaponIdsByScenario,
    tacticalMapSelectedWeaponIds,
  );
  const targetUnitId = isMovementFixtureScenario
    ? null
    : scenarioValue(scenario, targetUnitIdByScenario, 'occluded');
  const tokens = scenarioValue(scenario, tokensByScenario, tacticalMapTokens);
  const combatState = scenarioValue(
    scenario,
    combatStateByScenario,
    tacticalMapCombatState,
  );
  const unitWeapons =
    scenario === 'selected-weapon-out-of-arc'
      ? arcScenarios.tacticalMapOutOfArcUnitWeapons
      : tacticalMapUnitWeapons;
  const movementRange = isCombatOnlyScenario
    ? undefined
    : scenarioValue(
        scenario,
        movementRangeByScenario,
        tacticalMapMovementRange,
      );
  const mpLegend = isCombatOnlyScenario
    ? undefined
    : scenarioValue(scenario, mpLegendByScenario, tacticalMapMpLegend);
  const selectedHex = scenarioValue(scenario, selectedHexByScenario, {
    q: -1,
    r: 0,
  });
  const highlightPath =
    isCombatOnlyScenario || isMovementFixtureScenario
      ? undefined
      : tacticalMapHighlightPath;
  const hexTerrain = scenarioValue(
    scenario,
    hexTerrainByScenario,
    tacticalMapHexTerrain,
  );

  if (!isTestEnv) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>Not Available</h1>
        <p>This page is only available in development/test environments.</p>
      </div>
    );
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
            radius={3}
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
          />
        </div>
      </section>
    </main>
  );
}
