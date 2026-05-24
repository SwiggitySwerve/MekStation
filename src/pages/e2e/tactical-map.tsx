import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
import {
  tacticalMapCombatState,
  tacticalMapHexTerrain,
  tacticalMapHighlightPath,
  tacticalMapMovementRange,
  tacticalMapMpLegend,
  tacticalMapSelectedWeaponIds,
  tacticalMapTokens,
  tacticalMapUnitWeapons,
} from '@/testing/tactical-map.fixtures';

const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_MODE === 'true';

export default function TacticalMapE2EHarness(): React.JSX.Element {
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
            tokens={tacticalMapTokens}
            selectedHex={{ q: -1, r: 0 }}
            targetUnitId="occluded"
            hexTerrain={tacticalMapHexTerrain}
            unitWeapons={tacticalMapUnitWeapons}
            combatState={tacticalMapCombatState}
            selectedWeaponIds={tacticalMapSelectedWeaponIds}
            showCoordinates
            movementRange={tacticalMapMovementRange}
            highlightPath={tacticalMapHighlightPath}
            mpLegend={tacticalMapMpLegend}
          />
        </div>
      </section>
    </main>
  );
}
