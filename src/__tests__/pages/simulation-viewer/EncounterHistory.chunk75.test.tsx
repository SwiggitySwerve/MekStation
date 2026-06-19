import { render, screen, fireEvent, within, act } from '@testing-library/react';
import React from 'react';

import type {
  IEncounterHistoryProps,
  IBattle,
} from '@/components/simulation-viewer/pages/EncounterHistory';

import {
  EncounterHistory,
  formatDuration,
} from '@/components/simulation-viewer/pages/EncounterHistory';

/* ========================================================================== */
/*  Mock Data                                                                  */
/* ========================================================================== */

const mockBattle1: IBattle = {
  id: 'b1',
  missionId: 'm1',
  missionName: 'Raid on Tukayyid',
  timestamp: '2025-01-15T14:30:00Z',
  duration: 1800,
  outcome: 'victory',
  forces: {
    player: {
      units: [
        {
          id: 'u1',
          name: 'Atlas AS7-D',
          pilot: 'Natasha Kerensky',
          status: 'operational',
        },
        {
          id: 'u2',
          name: 'Timber Wolf',
          pilot: 'Aidan Pryde',
          status: 'damaged',
        },
      ],
      totalBV: 3500,
    },
    enemy: {
      units: [
        { id: 'e1', name: 'Mad Cat', pilot: 'Enemy 1', status: 'destroyed' },
        { id: 'e2', name: 'Warhawk', pilot: 'Enemy 2', status: 'destroyed' },
      ],
      totalBV: 3200,
    },
  },
  damageMatrix: {
    attackers: ['u1', 'u2'],
    targets: ['e1', 'e2'],
    cells: [
      { attackerId: 'u1', targetId: 'e1', damage: 45 },
      { attackerId: 'u1', targetId: 'e2', damage: 30 },
      { attackerId: 'u2', targetId: 'e1', damage: 25 },
      { attackerId: 'u2', targetId: 'e2', damage: 40 },
    ],
  },
  keyMoments: [
    {
      id: 'km1',
      turn: 3,
      phase: 'Weapon Attack',
      tier: 'critical',
      type: 'kill',
      description: 'Atlas destroys Mad Cat with headshot',
      involvedUnits: ['u1', 'e1'],
    },
    {
      id: 'km2',
      turn: 5,
      phase: 'Weapon Attack',
      tier: 'major',
      type: 'cripple',
      description: 'Timber Wolf cripples Warhawk',
      involvedUnits: ['u2', 'e2'],
    },
    {
      id: 'km3',
      turn: 2,
      phase: 'Status',
      tier: 'minor',
      type: 'shutdown',
      description: 'Mad Cat shutdown from heat',
      involvedUnits: ['e1'],
    },
  ],
  events: [
    {
      id: 'ev1',
      turn: 1,
      phase: 'Movement',
      timestamp: 0,
      type: 'movement',
      description: 'Atlas moves 4 hexes forward',
      involvedUnits: ['u1'],
    },
    {
      id: 'ev2',
      turn: 1,
      phase: 'Weapon Attack',
      timestamp: 10,
      type: 'attack',
      description: 'Atlas fires PPC at Mad Cat',
      involvedUnits: ['u1', 'e1'],
    },
    {
      id: 'ev3',
      turn: 2,
      phase: 'Movement',
      timestamp: 20,
      type: 'movement',
      description: 'Timber Wolf flanks right',
      involvedUnits: ['u2'],
    },
    {
      id: 'ev4',
      turn: 2,
      phase: 'Weapon Attack',
      timestamp: 30,
      type: 'attack',
      description: 'Timber Wolf fires LRMs at Warhawk',
      involvedUnits: ['u2', 'e2'],
    },
    {
      id: 'ev5',
      turn: 3,
      phase: 'Weapon Attack',
      timestamp: 40,
      type: 'damage',
      description: 'Atlas headshots Mad Cat',
      involvedUnits: ['u1', 'e1'],
    },
  ],
  stats: { totalKills: 2, totalDamage: 140, unitsLost: 0 },
};

const mockBattle2: IBattle = {
  id: 'b2',
  missionId: 'm1',
  missionName: 'Raid on Tukayyid',
  timestamp: '2025-01-16T10:00:00Z',
  duration: 2400,
  outcome: 'defeat',
  forces: {
    player: {
      units: [
        {
          id: 'u3',
          name: 'Hunchback HBK-4G',
          pilot: 'Victor Davion',
          status: 'destroyed',
        },
      ],
      totalBV: 1500,
    },
    enemy: {
      units: [
        {
          id: 'e3',
          name: 'Dire Wolf',
          pilot: 'Enemy 3',
          status: 'operational',
        },
      ],
      totalBV: 2800,
    },
  },
  damageMatrix: {
    attackers: ['u3'],
    targets: ['e3'],
    cells: [{ attackerId: 'u3', targetId: 'e3', damage: 20 }],
  },
  keyMoments: [
    {
      id: 'km4',
      turn: 4,
      phase: 'Weapon Attack',
      tier: 'critical',
      type: 'headshot',
      description: 'Dire Wolf headshots Hunchback',
      involvedUnits: ['e3', 'u3'],
    },
  ],
  events: [
    {
      id: 'ev6',
      turn: 1,
      phase: 'Movement',
      timestamp: 0,
      type: 'movement',
      description: 'Hunchback advances',
      involvedUnits: ['u3'],
    },
    {
      id: 'ev7',
      turn: 2,
      phase: 'Weapon Attack',
      timestamp: 15,
      type: 'attack',
      description: 'Hunchback fires AC/20',
      involvedUnits: ['u3', 'e3'],
    },
    {
      id: 'ev8',
      turn: 3,
      phase: 'Weapon Attack',
      timestamp: 25,
      type: 'damage',
      description: 'Dire Wolf fires all weapons',
      involvedUnits: ['e3', 'u3'],
    },
    {
      id: 'ev9',
      turn: 4,
      phase: 'Weapon Attack',
      timestamp: 35,
      type: 'damage',
      description: 'Hunchback destroyed',
      involvedUnits: ['e3', 'u3'],
    },
  ],
  stats: { totalKills: 0, totalDamage: 20, unitsLost: 1 },
};

const mockBattle3: IBattle = {
  id: 'b3',
  missionId: 'm2',
  missionName: 'Defense of Luthien',
  timestamp: '2025-01-17T08:00:00Z',
  duration: 900,
  outcome: 'draw',
  forces: {
    player: {
      units: [
        {
          id: 'u4',
          name: 'Centurion CN9-A',
          pilot: 'Kai Allard-Liao',
          status: 'damaged',
        },
      ],
      totalBV: 1200,
    },
    enemy: {
      units: [
        { id: 'e4', name: 'Stormcrow', pilot: 'Enemy 4', status: 'damaged' },
      ],
      totalBV: 1400,
    },
  },
  damageMatrix: {
    attackers: ['u4'],
    targets: ['e4'],
    cells: [{ attackerId: 'u4', targetId: 'e4', damage: 35 }],
  },
  keyMoments: [],
  events: [
    {
      id: 'ev10',
      turn: 1,
      phase: 'Movement',
      timestamp: 0,
      type: 'movement',
      description: 'Centurion takes position',
      involvedUnits: ['u4'],
    },
  ],
  stats: { totalKills: 0, totalDamage: 35, unitsLost: 0 },
};

const mockBattles: IBattle[] = [mockBattle1, mockBattle2, mockBattle3];

const defaultProps: IEncounterHistoryProps = {
  campaignId: 'campaign-001',
  battles: mockBattles,
  onSelectBattle: jest.fn(),
  onDrillDown: jest.fn(),
};

function renderPage(overrides: Partial<IEncounterHistoryProps> = {}) {
  const props = {
    ...defaultProps,
    ...overrides,
    onSelectBattle: overrides.onSelectBattle ?? jest.fn(),
    onDrillDown: overrides.onDrillDown ?? jest.fn(),
  };
  return render(<EncounterHistory {...props} />);
}

function selectBattle(battleId: string) {
  fireEvent.click(screen.getByTestId(`battle-card-${battleId}`));
}

/* ========================================================================== */
/*  Tests                                                                      */
/* ========================================================================== */

describe('EncounterHistory', () => {
  // ===========================================================================
  // 5. Comparison View Tests (10 tests)
  // ===========================================================================
  describe('Comparison View Tests', () => {
    it('selecting comparison battle shows comparison metrics', () => {
      renderPage();
      selectBattle('b1');
      const toggle = screen.getByTestId('comparison-mode-toggle');
      fireEvent.change(toggle, { target: { value: 'specific-battle' } });
      const selector = screen.getByTestId('comparison-battle-select');
      fireEvent.change(selector, { target: { value: 'b2' } });
      expect(screen.getByTestId('comparison-metrics')).toBeInTheDocument();
    });
  });
});
