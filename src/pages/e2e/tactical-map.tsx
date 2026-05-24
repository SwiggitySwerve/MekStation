import { useRouter } from 'next/router';

import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
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
  tacticalMapJumpElevationMovementRange,
  tacticalMapJumpElevationMpLegend,
  tacticalMapVtolElevationMovementRange,
  tacticalMapVtolElevationMpLegend,
  tacticalMapVtolTokens,
} from '@/testing/tactical-map.movement-scenarios';

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
  const selectedWeaponIds = isOutOfRangeScenario
    ? tacticalMapOutOfRangeSelectedWeaponIds
    : tacticalMapSelectedWeaponIds;
  const targetUnitId = isOutOfRangeScenario ? 'medium-target' : 'occluded';
  const tokens = isVtolElevationScenario
    ? tacticalMapVtolTokens
    : tacticalMapTokens;
  const movementRange = isJumpElevationScenario
    ? tacticalMapJumpElevationMovementRange
    : isVtolElevationScenario
      ? tacticalMapVtolElevationMovementRange
      : tacticalMapMovementRange;
  const mpLegend = isJumpElevationScenario
    ? tacticalMapJumpElevationMpLegend
    : isVtolElevationScenario
      ? tacticalMapVtolElevationMpLegend
      : tacticalMapMpLegend;

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
            selectedHex={{ q: -1, r: 0 }}
            targetUnitId={targetUnitId}
            hexTerrain={tacticalMapHexTerrain}
            unitWeapons={tacticalMapUnitWeapons}
            combatState={tacticalMapCombatState}
            selectedWeaponIds={selectedWeaponIds}
            showCoordinates
            movementRange={movementRange}
            highlightPath={tacticalMapHighlightPath}
            mpLegend={mpLegend}
          />
        </div>
      </section>
    </main>
  );
}
