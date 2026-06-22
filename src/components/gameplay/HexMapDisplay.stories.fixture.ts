import {
  TerrainType,
  IHexTerrain,
  IMovementRangeHex,
  Facing,
  GameSide,
  IUnitToken,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';

const allTerrainTypeCoordinates = [
  { q: 0, r: -2 },
  { q: 1, r: -2 },
  { q: 2, r: -2 },
  { q: -1, r: -1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: 2, r: -1 },
  { q: -2, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 2, r: 0 },
  { q: -2, r: 1 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
  { q: 1, r: 1 },
  { q: -2, r: 2 },
  { q: -1, r: 2 },
  { q: 0, r: 2 },
];

export const terrainWithSelectionMovementRange: readonly IMovementRangeHex[] = [
  {
    hex: { q: 0, r: 1 },
    mpCost: 2,
    reachable: true,
    movementType: MovementType.Walk,
  },
  {
    hex: { q: 1, r: 1 },
    mpCost: 2,
    reachable: true,
    movementType: MovementType.Walk,
  },
  {
    hex: { q: 2, r: 0 },
    mpCost: 3,
    reachable: true,
    movementType: MovementType.Walk,
  },
  {
    hex: { q: 2, r: -1 },
    mpCost: 4,
    reachable: false,
    movementType: MovementType.Run,
  },
];

export const allTerrainTypesTerrain: IHexTerrain[] = Object.values(
  TerrainType,
).map((type, index) => ({
  coordinate: allTerrainTypeCoordinates[index],
  elevation: (index % 7) - 3,
  features: [
    {
      type,
      level: type === TerrainType.Clear ? 0 : 1,
    },
  ],
}));

export const overlayTerrain: IHexTerrain[] = [
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
    coordinate: { q: 0, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.Rough, level: 1 }],
  },
  {
    coordinate: { q: 1, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.Building, level: 2 }],
  },
  {
    coordinate: { q: -1, r: 1 },
    elevation: 0,
    features: [{ type: TerrainType.Swamp, level: 1 }],
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
    coordinate: { q: -1, r: -1 },
    elevation: 0,
    features: [{ type: TerrainType.Rubble, level: 1 }],
  },
  {
    coordinate: { q: 2, r: -1 },
    elevation: 0,
    features: [{ type: TerrainType.Smoke, level: 1 }],
  },
];

export const overlayToken: IUnitToken = {
  unitId: 'atlas-overlay',
  name: 'Atlas AS7-D',
  designation: 'A1',
  position: { q: 0, r: 0 },
  facing: Facing.North,
  side: GameSide.Player,
  isDestroyed: false,
  isSelected: true,
  isValidTarget: false,
  unitType: TokenUnitType.Mech,
};

export const badgeDenseTerrain: IHexTerrain[] = [
  {
    coordinate: { q: 0, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: { q: 1, r: 0 },
    elevation: 4,
    features: [{ type: TerrainType.Building, level: 2 }],
  },
  {
    coordinate: { q: 0, r: 1 },
    elevation: -1,
    features: [{ type: TerrainType.Water, level: 1 }],
  },
  {
    coordinate: { q: -1, r: 1 },
    elevation: -2,
    features: [{ type: TerrainType.Water, level: 3 }],
  },
  {
    coordinate: { q: 1, r: -1 },
    elevation: 2,
    features: [{ type: TerrainType.Rough, level: 1 }],
  },
  {
    coordinate: { q: 2, r: -1 },
    elevation: 3,
    features: [{ type: TerrainType.HeavyWoods, level: 2 }],
  },
  {
    coordinate: { q: -1, r: 0 },
    elevation: 1,
    features: [{ type: TerrainType.Rubble, level: 1 }],
  },
  {
    coordinate: { q: 0, r: -1 },
    elevation: -1,
    features: [{ type: TerrainType.Swamp, level: 1 }],
  },
];

export const badgeDenseToken: IUnitToken = {
  ...overlayToken,
  unitId: 'shadow-hawk-badge-density',
  name: 'Shadow Hawk SHD-2H',
  designation: 'SHD',
  position: { q: 1, r: 0 },
  facing: Facing.Southwest,
  isSelected: false,
};

export const badgeDenseMovementRange: readonly IMovementRangeHex[] = [
  {
    hex: { q: 1, r: 0 },
    mpCost: 3,
    terrainCost: 0,
    elevationDelta: 1,
    elevationCost: 1,
    heatGenerated: 0,
    movementMode: 'biped',
    reachable: true,
    movementType: MovementType.Walk,
  },
  {
    hex: { q: 2, r: -1 },
    mpCost: 5,
    terrainCost: 2,
    elevationDelta: 1,
    elevationCost: 1,
    heatGenerated: 2,
    movementMode: 'biped',
    reachable: true,
    movementType: MovementType.Run,
  },
  {
    hex: { q: -1, r: 1 },
    mpCost: 6,
    terrainCost: 0,
    elevationDelta: -2,
    elevationCost: 0,
    heatGenerated: 3,
    movementMode: 'jump',
    reachable: false,
    movementType: MovementType.Jump,
    blockedReason: 'Water depth exceeds safe landing profile',
    movementInvalidReason: 'TerrainBlocked',
    movementInvalidDetails: 'Water depth exceeds safe landing profile',
  },
];

export const isometricAdjacentCliffTerrain: IHexTerrain[] = [
  {
    coordinate: { q: 0, r: 0 },
    elevation: 5,
    features: [{ type: TerrainType.Rough, level: 1 }],
  },
  {
    coordinate: { q: 1, r: 0 },
    elevation: 1,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: { q: 0, r: 1 },
    elevation: 4,
    features: [{ type: TerrainType.HeavyWoods, level: 1 }],
  },
  {
    coordinate: { q: -1, r: 1 },
    elevation: -1,
    features: [{ type: TerrainType.Water, level: 1 }],
  },
  {
    coordinate: { q: 1, r: -1 },
    elevation: 3,
    features: [{ type: TerrainType.Rubble, level: 1 }],
  },
];

export const isometricPitTerrain: IHexTerrain[] = [
  {
    coordinate: { q: 0, r: 0 },
    elevation: -2,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: { q: 1, r: 0 },
    elevation: 4,
    features: [{ type: TerrainType.Building, level: 1 }],
  },
  {
    coordinate: { q: 0, r: 1 },
    elevation: 2,
    features: [{ type: TerrainType.Rough, level: 1 }],
  },
  {
    coordinate: { q: -1, r: 0 },
    elevation: 1,
    features: [{ type: TerrainType.LightWoods, level: 1 }],
  },
];

export const isometricPitToken: IUnitToken = {
  ...overlayToken,
  unitId: 'pit-shadow-hawk',
  name: 'Shadow Hawk SHD-2H',
  designation: 'SHD',
  position: { q: 0, r: 0 },
  facing: Facing.Northeast,
  isSelected: true,
};

export const isometricMountainTerrain: IHexTerrain[] = [
  ...isometricAdjacentCliffTerrain,
  {
    coordinate: { q: -1, r: 0 },
    elevation: 2,
    features: [{ type: TerrainType.LightWoods, level: 1 }],
  },
  {
    coordinate: { q: 2, r: -1 },
    elevation: 6,
    features: [{ type: TerrainType.Building, level: 2 }],
  },
  {
    coordinate: { q: -2, r: 2 },
    elevation: 3,
    features: [{ type: TerrainType.HeavyIndustrial, level: 1 }],
  },
  {
    coordinate: { q: 2, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.Road, level: 0 }],
  },
];

export const mountainRotationToken: IUnitToken = {
  ...badgeDenseToken,
  unitId: 'mountain-griffin',
  name: 'Griffin GRF-1N',
  designation: 'GRF',
  position: { q: 1, r: -1 },
  facing: Facing.Southeast,
};

export const movementOverlayToken: IUnitToken = {
  ...overlayToken,
  unitId: 'griffin-move',
  name: 'Griffin GRF-1N',
  designation: 'G1',
  position: { q: -1, r: 0 },
  facing: Facing.Northeast,
};

export const movementEncodingTerrain: IHexTerrain[] = [
  {
    coordinate: { q: -1, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: { q: 0, r: 0 },
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  },
  {
    coordinate: { q: 1, r: 0 },
    elevation: 1,
    features: [{ type: TerrainType.Rough, level: 1 }],
  },
  {
    coordinate: { q: 2, r: 0 },
    elevation: 2,
    features: [{ type: TerrainType.Building, level: 1 }],
  },
  {
    coordinate: { q: 0, r: 1 },
    elevation: -1,
    features: [{ type: TerrainType.Water, level: 2 }],
  },
];

export const movementEncodingRange: readonly IMovementRangeHex[] = [
  {
    hex: { q: 0, r: 0 },
    mpCost: 1,
    terrainCost: 0,
    elevationDelta: 0,
    elevationCost: 0,
    heatGenerated: 0,
    movementMode: 'biped',
    reachable: true,
    movementType: MovementType.Walk,
  },
  {
    hex: { q: 1, r: 0 },
    mpCost: 4,
    terrainCost: 1,
    elevationDelta: 1,
    elevationCost: 1,
    heatGenerated: 2,
    movementMode: 'biped',
    reachable: true,
    movementType: MovementType.Run,
  },
  {
    hex: { q: 2, r: 0 },
    mpCost: 7,
    terrainCost: 2,
    elevationDelta: 2,
    elevationCost: 2,
    heatGenerated: 0,
    movementMode: 'biped',
    reachable: false,
    movementType: MovementType.Run,
    blockedReason: 'Destination exceeds remaining MP',
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: 'Destination exceeds remaining MP',
  },
  {
    hex: { q: 0, r: 1 },
    mpCost: 3,
    terrainCost: 0,
    elevationDelta: -1,
    elevationCost: 0,
    heatGenerated: 3,
    movementMode: 'jump',
    reachable: true,
    movementType: MovementType.Jump,
  },
];

export const movementAndPathMovementRange: readonly IMovementRangeHex[] = [
  {
    hex: { q: 0, r: 0 },
    mpCost: 1,
    reachable: true,
    movementType: MovementType.Walk,
  },
  {
    hex: { q: 1, r: 0 },
    mpCost: 2,
    reachable: true,
    movementType: MovementType.Walk,
  },
  {
    hex: { q: 2, r: 0 },
    mpCost: 4,
    reachable: true,
    movementType: MovementType.Run,
  },
  {
    hex: { q: 2, r: -1 },
    mpCost: 5,
    reachable: false,
    movementType: MovementType.Run,
  },
  {
    hex: { q: 0, r: 2 },
    mpCost: 3,
    reachable: true,
    movementType: MovementType.Jump,
  },
];

export const movementAndPathHighlightPath = [
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 2, r: 0 },
];

export const attackOverlayTokens: IUnitToken[] = [
  {
    ...overlayToken,
    unitId: 'warhammer-attacker',
    name: 'Warhammer WHM-6R',
    designation: 'W6',
    position: { q: 0, r: 0 },
    facing: Facing.Northeast,
    isSelected: true,
  },
  {
    ...overlayToken,
    unitId: 'hunchback-target',
    name: 'Hunchback HBK-4G',
    designation: 'H4',
    position: { q: 3, r: -1 },
    facing: Facing.Southwest,
    side: GameSide.Opponent,
    isSelected: false,
    isValidTarget: true,
    isActiveTarget: true,
  },
  {
    ...overlayToken,
    unitId: 'locust-target',
    name: 'Locust LCT-1V',
    designation: 'L1',
    position: { q: 2, r: 1 },
    facing: Facing.Northwest,
    side: GameSide.Opponent,
    isSelected: false,
    isValidTarget: true,
  },
];

export const attackOverlayRange = [
  { q: 1, r: 0 },
  { q: 2, r: 0 },
  { q: 3, r: -1 },
  { q: 2, r: 1 },
  { q: 1, r: -1 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
];
