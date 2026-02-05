import type { Meta, StoryObj } from '@storybook/react';

import {
  TerrainType,
  IHexTerrain,
  Facing,
  GameSide,
  IUnitToken,
  MovementType,
} from '@/types/gameplay';

import { HexMapDisplay } from './HexMapDisplay';

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
};

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
    hexTerrain: [
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
    ],
    showCoordinates: true,
  },
};

export const WoodsPatterns: Story = {
  args: {
    radius: 3,
    tokens: [],
    selectedHex: null,
    hexTerrain: [
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
    ],
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

export const AllTerrainTypes: Story = {
  args: {
    radius: 4,
    tokens: [],
    selectedHex: null,
    hexTerrain: Object.values(TerrainType).map((type, index) => {
      const angle = (index / Object.values(TerrainType).length) * 2 * Math.PI;
      const radius = 2;
      const q = Math.round(radius * Math.cos(angle));
      const r = Math.round(radius * Math.sin(angle));
      return {
        coordinate: { q, r },
        elevation: 0,
        features: [{ type, level: type === TerrainType.Water ? 2 : 1 }],
      };
    }),
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
};

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
