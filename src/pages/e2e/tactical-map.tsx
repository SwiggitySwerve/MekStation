import type { IHexTerrain, IUnitToken, IWeaponStatus } from '@/types/gameplay';

import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
import {
  Facing,
  FiringArc,
  GameSide,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';

const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_MODE === 'true';

const tokens: readonly IUnitToken[] = [
  {
    unitId: 'attacker',
    name: 'Shadow Hawk SHD-2H',
    designation: 'SHD',
    position: { q: -1, r: 0 },
    facing: Facing.Northeast,
    side: GameSide.Player,
    isDestroyed: false,
    isSelected: true,
    isValidTarget: false,
    unitType: TokenUnitType.Mech,
  },
  {
    unitId: 'occluded',
    name: 'Hunchback HBK-4G',
    designation: 'HBK',
    position: { q: 0, r: 0 },
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isDestroyed: false,
    isSelected: false,
    isValidTarget: true,
    isActiveTarget: true,
    unitType: TokenUnitType.Mech,
  },
];

const hexTerrain: readonly IHexTerrain[] = [
  {
    coordinate: { q: 1, r: 0 },
    elevation: 4,
    features: [{ type: TerrainType.Building, level: 1 }],
  },
  {
    coordinate: { q: -1, r: 0 },
    elevation: 5,
    features: [{ type: TerrainType.Building, level: 1 }],
  },
  {
    coordinate: { q: 0, r: 1 },
    elevation: 1,
    features: [{ type: TerrainType.LightWoods, level: 1 }],
  },
  {
    coordinate: { q: -1, r: 1 },
    elevation: -1,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
  {
    coordinate: { q: 1, r: -1 },
    elevation: 0,
    features: [{ type: TerrainType.Rough, level: 1 }],
  },
];

const unitWeapons: Record<string, readonly IWeaponStatus[]> = {
  attacker: [
    {
      id: 'medium-laser',
      name: 'Medium Laser',
      location: 'right_arm',
      mountingArc: FiringArc.Front,
      destroyed: false,
      firedThisTurn: false,
      heat: 3,
      damage: 5,
      ranges: {
        short: 3,
        medium: 6,
        long: 9,
      },
    },
  ],
};

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
            radius={2}
            tokens={tokens}
            selectedHex={{ q: -1, r: 0 }}
            targetUnitId="occluded"
            hexTerrain={hexTerrain}
            unitWeapons={unitWeapons}
            selectedWeaponIds={['medium-laser']}
            showCoordinates
            movementRange={[
              {
                hex: { q: 0, r: 1 },
                mpCost: 3,
                terrainCost: 2,
                elevationDelta: 1,
                elevationCost: 1,
                heatGenerated: 0,
                movementMode: 'tracked',
                reachable: true,
                movementType: MovementType.Walk,
                path: [
                  { q: -1, r: 0 },
                  { q: 0, r: 0 },
                  { q: 0, r: 1 },
                ],
              },
              {
                hex: { q: 0, r: 1 },
                mpCost: 4,
                terrainCost: 2,
                elevationDelta: 1,
                elevationCost: 1,
                heatGenerated: 2,
                movementMode: 'tracked',
                reachable: true,
                movementType: MovementType.Run,
                path: [
                  { q: -1, r: 0 },
                  { q: 0, r: 0 },
                  { q: 0, r: 1 },
                ],
              },
              {
                hex: { q: 0, r: 1 },
                mpCost: 3,
                terrainCost: 0,
                elevationDelta: 1,
                elevationCost: 0,
                heatGenerated: 3,
                movementMode: 'jump',
                reachable: true,
                movementType: MovementType.Jump,
                path: [
                  { q: -1, r: 0 },
                  { q: 0, r: 1 },
                ],
              },
            ]}
            highlightPath={[
              { q: -1, r: 0 },
              { q: 0, r: 0 },
              { q: 0, r: 1 },
            ]}
            mpLegend={{
              active: 'run',
              movementMode: 'tracked',
              walkMP: 4,
              runMP: 6,
              jumpMP: 3,
              jumpAvailable: true,
            }}
          />
        </div>
      </section>
    </main>
  );
}
