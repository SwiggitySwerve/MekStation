import type { Meta, StoryObj } from '@storybook/react';

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

import { HexMapDisplay } from './HexMapDisplay';
import {
  sampleTerrain,
  sampleToken,
  waterDepthGradientTerrain,
  woodsPatternTerrain,
} from './HexMapDisplay.stories.test-helpers';

const meta: Meta<typeof HexMapDisplay> = {
  title: 'Gameplay/HexMapDisplay',
  component: HexMapDisplay,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[600px] w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HexMapDisplay>;

export const Default: Story = {
  args: {
    radius: 3,
    tokens: [],
    selectedHex: null,
    showCoordinates: true,
  },
};

export const WithTerrain: Story = {
  args: {
    radius: 3,
    tokens: [],
    selectedHex: null,
    hexTerrain: sampleTerrain,
    showCoordinates: true,
  },
};

export const WaterDepthGradient: Story = {
  args: {
    radius: 3,
    tokens: [],
    selectedHex: null,
    hexTerrain: waterDepthGradientTerrain,
    showCoordinates: true,
  },
};

export const WoodsPatterns: Story = {
  args: {
    radius: 3,
    tokens: [],
    selectedHex: null,
    hexTerrain: woodsPatternTerrain,
    showCoordinates: false,
  },
};

export const TerrainWithUnit: Story = {
  args: {
    radius: 3,
    tokens: [sampleToken],
    selectedHex: null,
    hexTerrain: sampleTerrain,
    showCoordinates: false,
  },
};

export const TerrainWithSelection: Story = {
  args: {
    radius: 3,
    tokens: [sampleToken],
    selectedHex: { q: 1, r: 0 },
    hexTerrain: sampleTerrain,
    movementRange: [
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
    ],
    showCoordinates: true,
  },
};

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

export const AllTerrainTypes: Story = {
  args: {
    radius: 2,
    tokens: [],
    selectedHex: null,
    hexTerrain: Object.values(TerrainType).map((type, index) => ({
      coordinate: allTerrainTypeCoordinates[index],
      elevation: (index % 7) - 3,
      features: [
        {
          type,
          level: type === TerrainType.Clear ? 0 : 1,
        },
      ],
    })),
    showCoordinates: true,
  },
};

const overlayTerrain: IHexTerrain[] = [
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

const overlayToken: IUnitToken = {
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

const badgeDenseTerrain: IHexTerrain[] = [
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

const badgeDenseToken: IUnitToken = {
  ...overlayToken,
  unitId: 'shadow-hawk-badge-density',
  name: 'Shadow Hawk SHD-2H',
  designation: 'SHD',
  position: { q: 1, r: 0 },
  facing: Facing.Southwest,
  isSelected: false,
};

const badgeDenseMovementRange: readonly IMovementRangeHex[] = [
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

export const WithOverlays: Story = {
  args: {
    radius: 3,
    tokens: [overlayToken],
    selectedHex: { q: 0, r: 0 },
    hexTerrain: overlayTerrain,
    showCoordinates: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use the overlay toggle buttons (MP, Shield, Eye) in the bottom-right corner to enable movement cost, cover level, and LOS overlays. The LOS overlay requires a selected unit to show line-of-sight lines.',
      },
    },
  },
};

export const BadgeDenseElevationBoard: Story = {
  args: {
    radius: 3,
    tokens: [badgeDenseToken],
    selectedHex: { q: 0, r: 0 },
    hexTerrain: badgeDenseTerrain,
    movementRange: badgeDenseMovementRange,
    showCoordinates: true,
    mpLegend: {
      active: 'run',
      movementMode: 'biped',
      walkMP: 4,
      runMP: 6,
      jumpMP: 3,
      jumpAvailable: true,
    },
  },
};

const isometricAdjacentCliffTerrain: IHexTerrain[] = [
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

const isometricPitTerrain: IHexTerrain[] = [
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

const isometricPitToken: IUnitToken = {
  ...overlayToken,
  unitId: 'pit-shadow-hawk',
  name: 'Shadow Hawk SHD-2H',
  designation: 'SHD',
  position: { q: 0, r: 0 },
  facing: Facing.Northeast,
  isSelected: true,
};

const isometricMountainTerrain: IHexTerrain[] = [
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

export const IsometricAdjacentCliffs: Story = {
  args: {
    radius: 3,
    tokens: [],
    selectedHex: { q: 0, r: 0 },
    hexTerrain: isometricAdjacentCliffTerrain,
    showCoordinates: true,
    projectionMode: 'isometric2d',
  },
};

export const IsometricUnitInPitBehindWall: Story = {
  args: {
    radius: 3,
    tokens: [isometricPitToken],
    selectedHex: { q: 0, r: 0 },
    hexTerrain: isometricPitTerrain,
    showCoordinates: true,
    projectionMode: 'isometric2d',
  },
};

export const IsometricMountainRotationFixture: Story = {
  args: {
    radius: 4,
    tokens: [
      {
        ...badgeDenseToken,
        unitId: 'mountain-griffin',
        name: 'Griffin GRF-1N',
        designation: 'GRF',
        position: { q: 1, r: -1 },
        facing: Facing.Southeast,
      },
    ],
    selectedHex: { q: 1, r: -1 },
    hexTerrain: isometricMountainTerrain,
    showCoordinates: true,
    projectionMode: 'isometric2d',
  },
};

const movementOverlayToken: IUnitToken = {
  ...overlayToken,
  unitId: 'griffin-move',
  name: 'Griffin GRF-1N',
  designation: 'G1',
  position: { q: -1, r: 0 },
  facing: Facing.Northeast,
};

const movementEncodingTerrain: IHexTerrain[] = [
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

const movementEncodingRange: readonly IMovementRangeHex[] = [
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

const attackOverlayTokens: IUnitToken[] = [
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

export const MovementAndPathOverlay: Story = {
  args: {
    radius: 4,
    tokens: [movementOverlayToken],
    selectedHex: { q: -1, r: 0 },
    hexTerrain: overlayTerrain,
    showCoordinates: true,
    movementRange: [
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
    ],
    highlightPath: [
      { q: -1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ],
    hoverMpCost: 4,
    mpLegend: {
      active: 'run',
      jumpAvailable: true,
    },
  },
};

export const MovementEncodingCombinations: Story = {
  args: {
    radius: 3,
    tokens: [movementOverlayToken],
    selectedHex: { q: -1, r: 0 },
    hexTerrain: movementEncodingTerrain,
    movementRange: movementEncodingRange,
    showCoordinates: true,
    mpLegend: {
      active: 'run',
      movementMode: 'biped',
      walkMP: 4,
      runMP: 6,
      jumpMP: 3,
      jumpAvailable: true,
    },
  },
};

export const AttackTargetOverlay: Story = {
  args: {
    radius: 4,
    tokens: attackOverlayTokens,
    selectedHex: { q: 0, r: 0 },
    hexTerrain: overlayTerrain,
    showCoordinates: true,
    attackRange: [
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 3, r: -1 },
      { q: 2, r: 1 },
      { q: 1, r: -1 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
    ],
  },
};
