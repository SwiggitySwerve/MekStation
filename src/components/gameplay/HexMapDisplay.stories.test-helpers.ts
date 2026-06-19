import {
  TerrainType,
  IHexTerrain,
  Facing,
  GameSide,
  IUnitToken,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';

import { HexMapDisplay } from './HexMapDisplay';

const sampleTerrain: IHexTerrain[] = [
  {
    coordinate: { q: 0, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: { q: 1, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.LightWoods, level: 1 }],
  },
  {
    coordinate: { q: 2, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.HeavyWoods, level: 2 }],
  },
  {
    coordinate: { q: -1, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 1 }],
  },
  {
    coordinate: { q: -2, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
  {
    coordinate: { q: -2, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 3 }],
  },
  {
    coordinate: { q: 0, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.Rough, level: 1 }],
  },
  {
    coordinate: { q: 1, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.Rubble, level: 1 }],
  },
  {
    coordinate: { q: 2, r: -1 },
    elevation: 0,
    features: [{ type: TerrainType.Building, level: 1 }],
  },
  {
    coordinate: { q: 0, r: -1 },
    elevation: 0,
    features: [{ type: TerrainType.Pavement, level: 0 }],
  },
  {
    coordinate: { q: 1, r: -1 },
    elevation: 0,
    features: [{ type: TerrainType.Road, level: 0 }],
  },
  {
    coordinate: { q: -1, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.Sand, level: 0 }],
  },
  {
    coordinate: { q: -1, r: -1 },
    elevation: 0,
    features: [{ type: TerrainType.Mud, level: 0 }],
  },
  {
    coordinate: { q: 2, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.Snow, level: 0 }],
  },
  {
    coordinate: { q: -2, r: -1 },
    elevation: 0,
    features: [{ type: TerrainType.Ice, level: 0 }],
  },
  {
    coordinate: { q: 0, r: 2 },
    elevation: 0,
    features: [{ type: TerrainType.Swamp, level: 0 }],
  },
  {
    coordinate: { q: 1, r: 2 },
    elevation: 0,
    features: [{ type: TerrainType.Fire, level: 0 }],
  },
  {
    coordinate: { q: -1, r: 2 },
    elevation: 0,
    features: [{ type: TerrainType.Smoke, level: 0 }],
  },
];

const sampleToken: IUnitToken = {
  unitId: 'atlas-1',
  name: 'Atlas AS7-D',
  designation: 'AS7',
  position: { q: 0, r: 0 },
  facing: Facing.North,
  side: GameSide.Player,
  isDestroyed: false,
  isSelected: false,
  isValidTarget: false,
  unitType: TokenUnitType.Mech,
};

const waterDepthGradientTerrain = [
  {
    coordinate: { q: 0, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 0 }],
  },
  {
    coordinate: { q: 1, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 1 }],
  },
  {
    coordinate: { q: -1, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
  {
    coordinate: { q: 0, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 3 }],
  },
  {
    coordinate: { q: 1, r: -1 },
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 4 }],
  },
  {
    coordinate: { q: -1, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.Water, level: 5 }],
  },
];

const woodsPatternTerrain = [
  {
    coordinate: { q: 0, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.LightWoods, level: 1 }],
  },
  {
    coordinate: { q: 1, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.LightWoods, level: 1 }],
  },
  {
    coordinate: { q: -1, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.LightWoods, level: 1 }],
  },
  {
    coordinate: { q: 0, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.HeavyWoods, level: 2 }],
  },
  {
    coordinate: { q: 1, r: -1 },
    elevation: 0,
    features: [{ type: TerrainType.HeavyWoods, level: 2 }],
  },
  {
    coordinate: { q: -1, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.HeavyWoods, level: 2 }],
  },
];

export {
  sampleTerrain,
  sampleToken,
  waterDepthGradientTerrain,
  woodsPatternTerrain,
};
