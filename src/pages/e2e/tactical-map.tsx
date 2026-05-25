import { useRouter } from 'next/router';

import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
import {
  tacticalMapAerospaceCombatState,
  tacticalMapAerospaceTokens,
} from '@/testing/tactical-map.aerospace-scenarios';
import {
  tacticalMapOutOfArcCombatState,
  tacticalMapOutOfArcSelectedWeaponIds,
  tacticalMapOutOfArcTargetId,
  tacticalMapOutOfArcTokens,
  tacticalMapOutOfArcUnitWeapons,
} from '@/testing/tactical-map.arc-scenarios';
import {
  tacticalMapMountedBattleArmorCombatState,
  tacticalMapMountedBattleArmorTokens,
} from '@/testing/tactical-map.battle-armor-scenarios';
import {
  tacticalMapAirborneAerospaceMinimumRangeCombatState,
  tacticalMapAirborneAerospaceMinimumRangeSelectedWeaponIds,
  tacticalMapAirborneAerospaceMinimumRangeTargetId,
  tacticalMapAirborneAerospaceMinimumRangeTokens,
} from '@/testing/tactical-map.combat-scenarios';
import {
  tacticalMapElevationLosCombatState,
  tacticalMapElevationLosHexTerrain,
  tacticalMapElevationLosSelectedWeaponIds,
  tacticalMapElevationLosTargetId,
  tacticalMapElevationLosTokens,
} from '@/testing/tactical-map.elevation-los-scenario';
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
import {
  tacticalMapHoverWaterHexTerrain,
  tacticalMapHoverWaterMovementRange,
  tacticalMapHoverWaterMpLegend,
  tacticalMapHoverWaterSelectedHex,
  tacticalMapHoverWaterTokens,
} from '@/testing/tactical-map.hover-water-scenario';
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
import {
  tacticalMapRunWaterFallbackHexTerrain,
  tacticalMapRunWaterFallbackMovementRange,
  tacticalMapRunWaterFallbackMpLegend,
  tacticalMapRunWaterFallbackSelectedHex,
  tacticalMapRunWaterFallbackTokens,
} from '@/testing/tactical-map.run-water-fallback-scenario';
import {
  tacticalMapSameHexCombatState,
  tacticalMapSameHexSelectedWeaponIds,
  tacticalMapSameHexTargetId,
  tacticalMapSameHexTokens,
} from '@/testing/tactical-map.same-hex-scenarios';
import {
  tacticalMapSwimHexTerrain,
  tacticalMapSwimMovementRange,
  tacticalMapSwimMpLegend,
  tacticalMapSwimSelectedHex,
  tacticalMapSwimTokens,
} from '@/testing/tactical-map.swim-scenario';
import {
  tacticalMapTargetTerrainModifierCombatState,
  tacticalMapTargetTerrainModifierSelectedWeaponIds,
  tacticalMapTargetTerrainModifierTargetId,
  tacticalMapTargetTerrainModifierTokens,
} from '@/testing/tactical-map.target-terrain-scenarios';
import {
  tacticalMapTrackedElevationHexTerrain,
  tacticalMapTrackedElevationMovementRange,
  tacticalMapTrackedElevationMpLegend,
  tacticalMapTrackedElevationSelectedHex,
  tacticalMapTrackedElevationTokens,
} from '@/testing/tactical-map.tracked-elevation-scenario';
import {
  tacticalMapMixedVisibilityCombatState,
  tacticalMapMixedVisibilitySelectedWeaponIds,
  tacticalMapMixedVisibilityTokens,
} from '@/testing/tactical-map.visibility-scenarios';

const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_MODE === 'true';

export default function TacticalMapE2EHarness(): React.JSX.Element {
  const router = useRouter();
  const isOutOfRangeScenario = router.query.scenario === 'out-of-range';
  const isJumpElevationScenario =
    router.query.scenario === 'jump-elevation-cost';
  const isVtolElevationScenario =
    router.query.scenario === 'vtol-elevation-cost';
  const isBipedOptionScenario =
    router.query.scenario === 'biped-option-projection';
  const isMountedBattleArmorScenario =
    router.query.scenario === 'mounted-ba-passenger';
  const isAerospaceVelocityScenario =
    router.query.scenario === 'aerospace-velocity-projection';
  const isAirborneAerospaceMinimumRangeScenario =
    router.query.scenario === 'airborne-aerospace-minimum-range';
  const isTargetTerrainModifierScenario =
    router.query.scenario === 'target-terrain-modifier';
  const isMixedVisibilityScenario =
    router.query.scenario === 'mixed-visibility-targets';
  const isSelectedWeaponOutOfArcScenario =
    router.query.scenario === 'selected-weapon-out-of-arc';
  const isSameHexWeaponScenario =
    router.query.scenario === 'same-hex-weapon-blocked';
  const isElevationLosScenario =
    router.query.scenario === 'elevation-los-blocked';
  const isRuntimeHeightScenario =
    router.query.scenario === 'runtime-height-bridge-clearance';
  const isRunWaterFallbackScenario =
    router.query.scenario === 'run-water-walk-fallback';
  const isTrackedElevationScenario =
    router.query.scenario === 'tracked-elevation-blocked';
  const isHoverWaterScenario = router.query.scenario === 'hover-water-crossing';
  const isNavalLandfallScenario =
    router.query.scenario === 'naval-landfall-blocked';
  const isSwimScenario = router.query.scenario === 'biped-swim-elevation';
  const isFrogmanScenario = router.query.scenario === 'frogman-deep-water';
  const isCombatOnlyScenario =
    isAerospaceVelocityScenario ||
    isAirborneAerospaceMinimumRangeScenario ||
    isTargetTerrainModifierScenario ||
    isMixedVisibilityScenario ||
    isSelectedWeaponOutOfArcScenario ||
    isSameHexWeaponScenario ||
    isElevationLosScenario;
  const isMovementFixtureScenario =
    isRuntimeHeightScenario ||
    isRunWaterFallbackScenario ||
    isTrackedElevationScenario ||
    isHoverWaterScenario ||
    isNavalLandfallScenario ||
    isSwimScenario ||
    isFrogmanScenario;
  const selectedWeaponIds = isAerospaceVelocityScenario
    ? []
    : isAirborneAerospaceMinimumRangeScenario
      ? tacticalMapAirborneAerospaceMinimumRangeSelectedWeaponIds
      : isTargetTerrainModifierScenario
        ? tacticalMapTargetTerrainModifierSelectedWeaponIds
        : isMixedVisibilityScenario
          ? tacticalMapMixedVisibilitySelectedWeaponIds
          : isSelectedWeaponOutOfArcScenario
            ? tacticalMapOutOfArcSelectedWeaponIds
            : isSameHexWeaponScenario
              ? tacticalMapSameHexSelectedWeaponIds
              : isElevationLosScenario
                ? tacticalMapElevationLosSelectedWeaponIds
                : isOutOfRangeScenario
                  ? tacticalMapOutOfRangeSelectedWeaponIds
                  : tacticalMapSelectedWeaponIds;
  const targetUnitId = isAerospaceVelocityScenario
    ? null
    : isAirborneAerospaceMinimumRangeScenario
      ? tacticalMapAirborneAerospaceMinimumRangeTargetId
      : isTargetTerrainModifierScenario
        ? tacticalMapTargetTerrainModifierTargetId
        : isMixedVisibilityScenario
          ? null
          : isMovementFixtureScenario
            ? null
            : isSelectedWeaponOutOfArcScenario
              ? tacticalMapOutOfArcTargetId
              : isSameHexWeaponScenario
                ? tacticalMapSameHexTargetId
                : isElevationLosScenario
                  ? tacticalMapElevationLosTargetId
                  : isOutOfRangeScenario
                    ? 'medium-target'
                    : 'occluded';
  const tokens = isVtolElevationScenario
    ? tacticalMapVtolTokens
    : isBipedOptionScenario
      ? tacticalMapBipedOptionTokens
      : isMountedBattleArmorScenario
        ? tacticalMapMountedBattleArmorTokens
        : isAerospaceVelocityScenario
          ? tacticalMapAerospaceTokens
          : isAirborneAerospaceMinimumRangeScenario
            ? tacticalMapAirborneAerospaceMinimumRangeTokens
            : isTargetTerrainModifierScenario
              ? tacticalMapTargetTerrainModifierTokens
              : isMixedVisibilityScenario
                ? tacticalMapMixedVisibilityTokens
                : isSelectedWeaponOutOfArcScenario
                  ? tacticalMapOutOfArcTokens
                  : isSameHexWeaponScenario
                    ? tacticalMapSameHexTokens
                    : isElevationLosScenario
                      ? tacticalMapElevationLosTokens
                      : isRuntimeHeightScenario
                        ? tacticalMapRuntimeHeightTokens
                        : isRunWaterFallbackScenario
                          ? tacticalMapRunWaterFallbackTokens
                          : isTrackedElevationScenario
                            ? tacticalMapTrackedElevationTokens
                            : isHoverWaterScenario
                              ? tacticalMapHoverWaterTokens
                              : isNavalLandfallScenario
                                ? tacticalMapNavalLandfallTokens
                                : isSwimScenario
                                  ? tacticalMapSwimTokens
                                  : isFrogmanScenario
                                    ? tacticalMapFrogmanTokens
                                    : tacticalMapTokens;
  const combatState = isMountedBattleArmorScenario
    ? tacticalMapMountedBattleArmorCombatState
    : isAerospaceVelocityScenario
      ? tacticalMapAerospaceCombatState
      : isAirborneAerospaceMinimumRangeScenario
        ? tacticalMapAirborneAerospaceMinimumRangeCombatState
        : isTargetTerrainModifierScenario
          ? tacticalMapTargetTerrainModifierCombatState
          : isMixedVisibilityScenario
            ? tacticalMapMixedVisibilityCombatState
            : isSelectedWeaponOutOfArcScenario
              ? tacticalMapOutOfArcCombatState
              : isSameHexWeaponScenario
                ? tacticalMapSameHexCombatState
                : isElevationLosScenario
                  ? tacticalMapElevationLosCombatState
                  : tacticalMapCombatState;
  const unitWeapons = isSelectedWeaponOutOfArcScenario
    ? tacticalMapOutOfArcUnitWeapons
    : tacticalMapUnitWeapons;
  const movementRange = isCombatOnlyScenario
    ? undefined
    : isJumpElevationScenario
      ? tacticalMapJumpElevationMovementRange
      : isVtolElevationScenario
        ? tacticalMapVtolElevationMovementRange
        : isBipedOptionScenario
          ? tacticalMapBipedOptionMovementRange
          : isRuntimeHeightScenario
            ? tacticalMapRuntimeHeightMovementRange
            : isRunWaterFallbackScenario
              ? tacticalMapRunWaterFallbackMovementRange
              : isTrackedElevationScenario
                ? tacticalMapTrackedElevationMovementRange
                : isHoverWaterScenario
                  ? tacticalMapHoverWaterMovementRange
                  : isNavalLandfallScenario
                    ? tacticalMapNavalLandfallMovementRange
                    : isSwimScenario
                      ? tacticalMapSwimMovementRange
                      : isFrogmanScenario
                        ? tacticalMapFrogmanMovementRange
                        : tacticalMapMovementRange;
  const mpLegend = isCombatOnlyScenario
    ? undefined
    : isJumpElevationScenario
      ? tacticalMapJumpElevationMpLegend
      : isVtolElevationScenario
        ? tacticalMapVtolElevationMpLegend
        : isBipedOptionScenario
          ? tacticalMapBipedOptionMpLegend
          : isRuntimeHeightScenario
            ? tacticalMapRuntimeHeightMpLegend
            : isRunWaterFallbackScenario
              ? tacticalMapRunWaterFallbackMpLegend
              : isTrackedElevationScenario
                ? tacticalMapTrackedElevationMpLegend
                : isHoverWaterScenario
                  ? tacticalMapHoverWaterMpLegend
                  : isNavalLandfallScenario
                    ? tacticalMapNavalLandfallMpLegend
                    : isSwimScenario
                      ? tacticalMapSwimMpLegend
                      : isFrogmanScenario
                        ? tacticalMapFrogmanMpLegend
                        : tacticalMapMpLegend;
  const selectedHex = isBipedOptionScenario
    ? tacticalMapBipedOptionSelectedHex
    : isRuntimeHeightScenario
      ? tacticalMapRuntimeHeightSelectedHex
      : isRunWaterFallbackScenario
        ? tacticalMapRunWaterFallbackSelectedHex
        : isTrackedElevationScenario
          ? tacticalMapTrackedElevationSelectedHex
          : isHoverWaterScenario
            ? tacticalMapHoverWaterSelectedHex
            : isNavalLandfallScenario
              ? tacticalMapNavalLandfallSelectedHex
              : isSwimScenario
                ? tacticalMapSwimSelectedHex
                : isFrogmanScenario
                  ? tacticalMapFrogmanSelectedHex
                  : isSelectedWeaponOutOfArcScenario ||
                      isSameHexWeaponScenario ||
                      isElevationLosScenario ||
                      isMountedBattleArmorScenario ||
                      isAerospaceVelocityScenario
                    ? { q: 0, r: 0 }
                    : { q: -1, r: 0 };
  const highlightPath =
    isCombatOnlyScenario || isMovementFixtureScenario
      ? undefined
      : tacticalMapHighlightPath;
  const hexTerrain = isRuntimeHeightScenario
    ? tacticalMapRuntimeHeightBridgeHexTerrain
    : isRunWaterFallbackScenario
      ? tacticalMapRunWaterFallbackHexTerrain
      : isTrackedElevationScenario
        ? tacticalMapTrackedElevationHexTerrain
        : isHoverWaterScenario
          ? tacticalMapHoverWaterHexTerrain
          : isNavalLandfallScenario
            ? tacticalMapNavalLandfallHexTerrain
            : isElevationLosScenario
              ? tacticalMapElevationLosHexTerrain
              : isSwimScenario
                ? tacticalMapSwimHexTerrain
                : isFrogmanScenario
                  ? tacticalMapFrogmanHexTerrain
                  : tacticalMapHexTerrain;

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
