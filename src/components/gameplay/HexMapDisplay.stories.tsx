import type { Meta, StoryObj } from '@storybook/react';

import { HexMapDisplay } from './HexMapDisplay';
import {
  allTerrainTypesTerrain,
  attackOverlayRange,
  attackOverlayTokens,
  badgeDenseMovementRange,
  badgeDenseTerrain,
  badgeDenseToken,
  isometricAdjacentCliffTerrain,
  isometricMountainTerrain,
  isometricPitTerrain,
  isometricPitToken,
  mountainRotationToken,
  movementAndPathHighlightPath,
  movementAndPathMovementRange,
  movementEncodingRange,
  movementEncodingTerrain,
  movementOverlayToken,
  overlayTerrain,
  overlayToken,
  terrainWithSelectionMovementRange,
} from './HexMapDisplay.stories.fixture';
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
    movementRange: terrainWithSelectionMovementRange,
    showCoordinates: true,
  },
};

export const AllTerrainTypes: Story = {
  args: {
    radius: 2,
    tokens: [],
    selectedHex: null,
    hexTerrain: allTerrainTypesTerrain,
    showCoordinates: true,
  },
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
    tokens: [mountainRotationToken],
    selectedHex: { q: 1, r: -1 },
    hexTerrain: isometricMountainTerrain,
    showCoordinates: true,
    projectionMode: 'isometric2d',
  },
};

export const MovementAndPathOverlay: Story = {
  args: {
    radius: 4,
    tokens: [movementOverlayToken],
    selectedHex: { q: -1, r: 0 },
    hexTerrain: overlayTerrain,
    showCoordinates: true,
    movementRange: movementAndPathMovementRange,
    highlightPath: movementAndPathHighlightPath,
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
    attackRange: attackOverlayRange,
  },
};
