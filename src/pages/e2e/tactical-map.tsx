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
  const isRuntimeHeightScenario =
    router.query.scenario === 'runtime-height-bridge-clearance';
  const isRunWaterFallbackScenario =
    router.query.scenario === 'run-water-walk-fallback';
  const isTrackedElevationScenario =
    router.query.scenario === 'tracked-elevation-blocked';
  const isHoverWaterScenario = router.query.scenario === 'hover-water-crossing';
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
          : isRuntimeHeightScenario
            ? null
            : isRunWaterFallbackScenario
              ? null
              : isTrackedElevationScenario
                ? null
                : isHoverWaterScenario
                  ? null
                  : isSelectedWeaponOutOfArcScenario
                    ? tacticalMapOutOfArcTargetId
                    : isSameHexWeaponScenario
                      ? tacticalMapSameHexTargetId
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
                    : isRuntimeHeightScenario
                      ? tacticalMapRuntimeHeightTokens
                      : isRunWaterFallbackScenario
                        ? tacticalMapRunWaterFallbackTokens
                        : isTrackedElevationScenario
                          ? tacticalMapTrackedElevationTokens
                          : isHoverWaterScenario
                            ? tacticalMapHoverWaterTokens
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
                : tacticalMapCombatState;
  const unitWeapons = isSelectedWeaponOutOfArcScenario
    ? tacticalMapOutOfArcUnitWeapons
    : tacticalMapUnitWeapons;
  const movementRange =
    isAerospaceVelocityScenario ||
    isAirborneAerospaceMinimumRangeScenario ||
    isTargetTerrainModifierScenario ||
    isMixedVisibilityScenario ||
    isSelectedWeaponOutOfArcScenario ||
    isSameHexWeaponScenario
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
                    : tacticalMapMovementRange;
  const mpLegend =
    isAerospaceVelocityScenario ||
    isAirborneAerospaceMinimumRangeScenario ||
    isTargetTerrainModifierScenario ||
    isMixedVisibilityScenario ||
    isSelectedWeaponOutOfArcScenario ||
    isSameHexWeaponScenario
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
            : isSelectedWeaponOutOfArcScenario ||
                isSameHexWeaponScenario ||
                isMountedBattleArmorScenario ||
                isAerospaceVelocityScenario
              ? { q: 0, r: 0 }
              : { q: -1, r: 0 };
  const highlightPath =
    isAerospaceVelocityScenario ||
    isAirborneAerospaceMinimumRangeScenario ||
    isTargetTerrainModifierScenario ||
    isMixedVisibilityScenario ||
    isSelectedWeaponOutOfArcScenario ||
    isSameHexWeaponScenario ||
    isRuntimeHeightScenario ||
    isRunWaterFallbackScenario ||
    isTrackedElevationScenario ||
    isHoverWaterScenario
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
