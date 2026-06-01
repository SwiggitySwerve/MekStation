import type { IAdaptedUnit } from '@/engine/types';
import type { IWeapon } from '@/simulation/ai/types';
import type {
  IGameUnit,
  ITerrainChangedPayload,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';

import { GameEngine, InteractiveSession } from '@/engine/GameEngine';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import {
  applyBattlefieldWreckTerrainToGrid,
  TAC_OPS_BATTLE_WRECK_OPTIONAL_RULE_KEY,
} from '@/utils/gameplay/battlefieldWreckTerrain';
import { createUnitDestroyedEvent } from '@/utils/gameplay/gameEvents';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  terrainFeaturesFromString,
  terrainStringFromFeatures,
} from '@/utils/gameplay/terrainEncoding';

function weapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function adaptedUnit(
  id: string,
  side: GameSide,
  position: IHexCoordinate,
): IAdaptedUnit {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [weapon(`${id}-ml`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function gameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  };
}

function roughLevel(features: readonly ITerrainFeature[]): number {
  return (
    features.find((feature) => feature.type === TerrainType.Rough)?.level ?? 0
  );
}

describe('battlefield wreck terrain', () => {
  it('does not mutate terrain unless TacOps battlefield wreckage is enabled', () => {
    const grid = createMinimalGrid(1);

    const result = applyBattlefieldWreckTerrainToGrid(
      grid,
      { unitId: 'destroyed', position: { q: 0, r: 0 }, weightTons: 65 },
      [],
    );

    expect(result.changed).toBe(false);
    expect(result.reason).toBe('option_disabled');
    expect(grid.hexes.get('0,0')?.terrain).toBe(TerrainType.Clear);
  });

  it('adds level-1 rough terrain for destroyed non-infantry units of at least 40 tons', () => {
    const grid = createMinimalGrid(1);

    const result = applyBattlefieldWreckTerrainToGrid(
      grid,
      { unitId: 'destroyed', position: { q: 0, r: 0 }, weightTons: 40 },
      [TAC_OPS_BATTLE_WRECK_OPTIONAL_RULE_KEY],
    );

    expect(result.changed).toBe(true);
    expect(result.reason).toBe('terrain_updated');
    expect(grid.hexes.get('0,0')?.terrain).toBe(TerrainType.Rough);
  });

  it('preserves MegaMek exclusions for light, infantry, battle armor, and protomech wrecks', () => {
    const grid = createMinimalGrid(1);
    const optionalRules = [TAC_OPS_BATTLE_WRECK_OPTIONAL_RULE_KEY];

    const lightResult = applyBattlefieldWreckTerrainToGrid(
      grid,
      { unitId: 'light', position: { q: 0, r: 0 }, weightTons: 35 },
      optionalRules,
    );
    const infantryResult = applyBattlefieldWreckTerrainToGrid(
      grid,
      {
        unitId: 'infantry',
        position: { q: 0, r: 0 },
        weightTons: 65,
        combatKind: 'platoon',
      },
      optionalRules,
    );
    const battleArmorResult = applyBattlefieldWreckTerrainToGrid(
      grid,
      {
        unitId: 'battle-armor',
        position: { q: 0, r: 0 },
        weightTons: 65,
        combatKind: 'squad',
      },
      optionalRules,
    );
    const protoResult = applyBattlefieldWreckTerrainToGrid(
      grid,
      {
        unitId: 'proto',
        position: { q: 0, r: 0 },
        weightTons: 65,
        combatKind: 'proto',
      },
      optionalRules,
    );

    expect(lightResult.reason).toBe('below_weight_threshold');
    expect(infantryResult.reason).toBe('excluded_unit_type');
    expect(battleArmorResult.reason).toBe('excluded_unit_type');
    expect(protoResult.reason).toBe('excluded_unit_type');
    expect(grid.hexes.get('0,0')?.terrain).toBe(TerrainType.Clear);
  });

  it('upgrades large support tank wrecks to level-2 rough without erasing stacked terrain', () => {
    const grid = createMinimalGrid(1);
    const existingTerrain = terrainStringFromFeatures([
      { type: TerrainType.Rough, level: 1 },
      { type: TerrainType.LightWoods, level: 1 },
    ]);
    grid.hexes.set('0,0', {
      ...grid.hexes.get('0,0')!,
      terrain: existingTerrain,
    });

    const result = applyBattlefieldWreckTerrainToGrid(
      grid,
      {
        unitId: 'large-support',
        position: { q: 0, r: 0 },
        weightTons: 80,
        isLargeSupportTank: true,
      },
      [TAC_OPS_BATTLE_WRECK_OPTIONAL_RULE_KEY],
    );
    const features = terrainFeaturesFromString(
      grid.hexes.get('0,0')?.terrain ?? '',
    );

    expect(result.changed).toBe(true);
    expect(roughLevel(features)).toBe(2);
    expect(
      features.some((feature) => feature.type === TerrainType.LightWoods),
    ).toBe(true);
  });

  it('emits replayable terrain conversion from live interactive UnitDestroyed events', () => {
    const grid = createMinimalGrid(7);
    const engine = new GameEngine({
      mapRadius: 7,
      grid,
      optionalRules: [TAC_OPS_BATTLE_WRECK_OPTIONAL_RULE_KEY],
    });
    const player = adaptedUnit('player-1', GameSide.Player, { q: -2, r: -5 });
    const opponent = adaptedUnit('opponent-1', GameSide.Opponent, {
      q: -2,
      r: 5,
    });
    const interactive = engine.createInteractiveSession(
      [player],
      [opponent],
      [
        gameUnit(player.id, GameSide.Player),
        gameUnit(opponent.id, GameSide.Opponent),
      ],
    );
    const session = interactive.getSession();
    const destroyedPosition = session.currentState.units[player.id].position;

    const destroyedEvent = createUnitDestroyedEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      GamePhase.WeaponAttack,
      player.id,
      'damage',
    );
    interactive.appendEvent(destroyedEvent);

    const terrainKey = coordToKey(destroyedPosition);
    const updatedSession = interactive.getSession();
    const terrainEvent = updatedSession.events.find(
      (event) => event.type === GameEventType.TerrainChanged,
    );

    expect(grid.hexes.get(terrainKey)?.terrain).toBe(TerrainType.Rough);
    expect(
      updatedSession.currentState.terrainOverrides?.[terrainKey]?.terrain,
    ).toBe(TerrainType.Rough);
    expect(terrainEvent).toBeDefined();

    const payload = terrainEvent?.payload as ITerrainChangedPayload | undefined;
    expect(payload?.sourceEventId).toBe(destroyedEvent.id);
    expect(payload?.sourceUnitId).toBe(player.id);
    expect(payload?.reason).toBe('battlefield_wreckage');

    const recovered = InteractiveSession.fromSession(updatedSession);
    expect(recovered.getGrid().hexes.get(terrainKey)?.terrain).toBe(
      TerrainType.Rough,
    );
  });
});
