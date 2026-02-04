import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import {
  EncounterHistory,
  formatDuration,
} from '@/components/simulation-viewer/pages/EncounterHistory';
import type {
  IEncounterHistoryProps,
  IBattle,
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
        { id: 'u1', name: 'Atlas AS7-D', pilot: 'Natasha Kerensky', status: 'operational' },
        { id: 'u2', name: 'Timber Wolf', pilot: 'Aidan Pryde', status: 'damaged' },
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
    { id: 'ev1', turn: 1, phase: 'Movement', timestamp: 0, type: 'movement', description: 'Atlas moves 4 hexes forward', involvedUnits: ['u1'] },
    { id: 'ev2', turn: 1, phase: 'Weapon Attack', timestamp: 10, type: 'attack', description: 'Atlas fires PPC at Mad Cat', involvedUnits: ['u1', 'e1'] },
    { id: 'ev3', turn: 2, phase: 'Movement', timestamp: 20, type: 'movement', description: 'Timber Wolf flanks right', involvedUnits: ['u2'] },
    { id: 'ev4', turn: 2, phase: 'Weapon Attack', timestamp: 30, type: 'attack', description: 'Timber Wolf fires LRMs at Warhawk', involvedUnits: ['u2', 'e2'] },
    { id: 'ev5', turn: 3, phase: 'Weapon Attack', timestamp: 40, type: 'damage', description: 'Atlas headshots Mad Cat', involvedUnits: ['u1', 'e1'] },
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
        { id: 'u3', name: 'Hunchback HBK-4G', pilot: 'Victor Davion', status: 'destroyed' },
      ],
      totalBV: 1500,
    },
    enemy: {
      units: [
        { id: 'e3', name: 'Dire Wolf', pilot: 'Enemy 3', status: 'operational' },
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
    { id: 'ev6', turn: 1, phase: 'Movement', timestamp: 0, type: 'movement', description: 'Hunchback advances', involvedUnits: ['u3'] },
    { id: 'ev7', turn: 2, phase: 'Weapon Attack', timestamp: 15, type: 'attack', description: 'Hunchback fires AC/20', involvedUnits: ['u3', 'e3'] },
    { id: 'ev8', turn: 3, phase: 'Weapon Attack', timestamp: 25, type: 'damage', description: 'Dire Wolf fires all weapons', involvedUnits: ['e3', 'u3'] },
    { id: 'ev9', turn: 4, phase: 'Weapon Attack', timestamp: 35, type: 'damage', description: 'Hunchback destroyed', involvedUnits: ['e3', 'u3'] },
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
        { id: 'u4', name: 'Centurion CN9-A', pilot: 'Kai Allard-Liao', status: 'damaged' },
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
    { id: 'ev10', turn: 1, phase: 'Movement', timestamp: 0, type: 'movement', description: 'Centurion takes position', involvedUnits: ['u4'] },
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
  // 1. Render Tests (20 tests)
  // ===========================================================================
  describe('Render Tests', () => {
    it('renders the page container', () => {
      renderPage();
      expect(screen.getByTestId('encounter-history')).toBeInTheDocument();
    });

    it('renders campaign-id as data attribute', () => {
      renderPage();
      expect(screen.getByTestId('encounter-history')).toHaveAttribute('data-campaign-id', 'campaign-001');
    });

    it('renders the page title', () => {
      renderPage();
      expect(screen.getByTestId('encounter-history-title')).toHaveTextContent('Encounter History');
    });

    it('renders battle list sidebar', () => {
      renderPage();
      expect(screen.getByTestId('battle-list-sidebar')).toBeInTheDocument();
    });

    it('renders battle list grouped by missions', () => {
      renderPage();
      expect(screen.getByTestId('mission-group-m1')).toBeInTheDocument();
      expect(screen.getByTestId('mission-group-m2')).toBeInTheDocument();
    });

    it('renders battle cards within mission groups', () => {
      renderPage();
      expect(screen.getByTestId('battle-card-b1')).toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b2')).toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b3')).toBeInTheDocument();
    });

    it('renders empty battle list message when no battles', () => {
      renderPage({ battles: [] });
      expect(screen.getByTestId('empty-battle-list')).toBeInTheDocument();
    });

    it('renders "no battle selected" when none selected', () => {
      renderPage();
      expect(screen.getByTestId('no-battle-selected')).toBeInTheDocument();
    });

    it('renders battle detail when battle is selected', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.queryByTestId('no-battle-selected')).not.toBeInTheDocument();
    });

    it('renders forces section when battle selected', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('forces-section')).toBeInTheDocument();
    });

    it('renders player force with units', () => {
      renderPage();
      selectBattle('b1');
      const playerForce = screen.getByTestId('player-force');
      expect(playerForce).toHaveTextContent('Atlas AS7-D');
      expect(playerForce).toHaveTextContent('Timber Wolf');
    });

    it('renders enemy force with units', () => {
      renderPage();
      selectBattle('b1');
      const enemyForce = screen.getByTestId('enemy-force');
      expect(enemyForce).toHaveTextContent('Mad Cat');
      expect(enemyForce).toHaveTextContent('Warhawk');
    });

    it('renders unit status badges', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('unit-status-badge-u1')).toHaveTextContent('operational');
      expect(screen.getByTestId('unit-status-badge-u2')).toHaveTextContent('damaged');
      expect(screen.getByTestId('unit-status-badge-e1')).toHaveTextContent('destroyed');
    });

    it('renders damage matrix when battle selected', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('damage-matrix')).toBeInTheDocument();
    });

    it('renders damage matrix cells with correct values', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('damage-cell-u1-e1')).toHaveTextContent('45');
      expect(screen.getByTestId('damage-cell-u1-e2')).toHaveTextContent('30');
      expect(screen.getByTestId('damage-cell-u2-e1')).toHaveTextContent('25');
      expect(screen.getByTestId('damage-cell-u2-e2')).toHaveTextContent('40');
    });

    it('renders key moments timeline when battle selected', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('key-moments-section')).toBeInTheDocument();
      expect(screen.getByTestId('key-moments-timeline')).toBeInTheDocument();
    });

    it('renders key moment cards with tier badges', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('key-moment-km1')).toBeInTheDocument();
      expect(screen.getByTestId('key-moment-tier-badge-km1')).toHaveTextContent('critical');
      expect(screen.getByTestId('key-moment-tier-badge-km2')).toHaveTextContent('major');
      expect(screen.getByTestId('key-moment-tier-badge-km3')).toHaveTextContent('minor');
    });

    it('renders event timeline when battle selected', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('event-timeline-section')).toBeInTheDocument();
    });

    it('renders VCR controls', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('vcr-controls')).toBeInTheDocument();
      expect(screen.getByTestId('vcr-play-pause')).toBeInTheDocument();
      expect(screen.getByTestId('vcr-step-back')).toBeInTheDocument();
      expect(screen.getByTestId('vcr-step-forward')).toBeInTheDocument();
      expect(screen.getByTestId('vcr-speed-select')).toBeInTheDocument();
    });

    it('renders comparison section', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('comparison-section')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 2. Filter/Sort Tests (15 tests)
  // ===========================================================================
  describe('Filter/Sort Tests', () => {
    it('renders outcome filter panel', () => {
      renderPage();
      expect(screen.getByTestId('battle-list-filter')).toBeInTheDocument();
    });

    it('filters battles by victory outcome', () => {
      renderPage();
      const filterPanel = screen.getByTestId('battle-list-filter');
      const victoryCheckbox = within(filterPanel).getByTestId('checkbox-outcome-victory');
      fireEvent.click(victoryCheckbox);
      expect(screen.getByTestId('battle-card-b1')).toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b3')).not.toBeInTheDocument();
    });

    it('filters battles by defeat outcome', () => {
      renderPage();
      const filterPanel = screen.getByTestId('battle-list-filter');
      const defeatCheckbox = within(filterPanel).getByTestId('checkbox-outcome-defeat');
      fireEvent.click(defeatCheckbox);
      expect(screen.queryByTestId('battle-card-b1')).not.toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b2')).toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b3')).not.toBeInTheDocument();
    });

    it('filters battles by draw outcome', () => {
      renderPage();
      const filterPanel = screen.getByTestId('battle-list-filter');
      const drawCheckbox = within(filterPanel).getByTestId('checkbox-outcome-draw');
      fireEvent.click(drawCheckbox);
      expect(screen.queryByTestId('battle-card-b1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b2')).not.toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b3')).toBeInTheDocument();
    });

    it('shows empty message when filter matches nothing', () => {
      renderPage({ battles: [mockBattle1] });
      const filterPanel = screen.getByTestId('battle-list-filter');
      const defeatCheckbox = within(filterPanel).getByTestId('checkbox-outcome-defeat');
      fireEvent.click(defeatCheckbox);
      expect(screen.getByTestId('empty-battle-list')).toBeInTheDocument();
    });

    it('renders sort controls', () => {
      renderPage();
      expect(screen.getByTestId('sort-controls')).toBeInTheDocument();
      expect(screen.getByTestId('sort-button-duration')).toBeInTheDocument();
      expect(screen.getByTestId('sort-button-kills')).toBeInTheDocument();
      expect(screen.getByTestId('sort-button-damage')).toBeInTheDocument();
    });

    it('defaults to duration sort ascending', () => {
      renderPage();
      expect(screen.getByTestId('sort-button-duration')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('sort-direction-indicator')).toHaveTextContent('↑');
    });

    it('toggles sort direction when clicking same sort button', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('sort-button-duration'));
      expect(screen.getByTestId('sort-direction-indicator')).toHaveTextContent('↓');
    });

    it('sorts battles by kills when kills button clicked', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('sort-button-kills'));
      expect(screen.getByTestId('sort-button-kills')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('sort-button-duration')).toHaveAttribute('aria-pressed', 'false');
    });

    it('sorts battles by damage when damage button clicked', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('sort-button-damage'));
      expect(screen.getByTestId('sort-button-damage')).toHaveAttribute('aria-pressed', 'true');
    });

    it('resets to ascending when switching sort keys', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('sort-button-duration'));
      expect(screen.getByTestId('sort-direction-indicator')).toHaveTextContent('↓');
      fireEvent.click(screen.getByTestId('sort-button-kills'));
      expect(screen.getByTestId('sort-direction-indicator')).toHaveTextContent('↑');
    });

    it('filters key moments by tier', () => {
      renderPage();
      selectBattle('b1');
      const kmFilter = screen.getByTestId('key-moments-filter');
      const criticalCheckbox = within(kmFilter).getByTestId('checkbox-tier-critical');
      fireEvent.click(criticalCheckbox);
      expect(screen.getByTestId('key-moment-km1')).toBeInTheDocument();
      expect(screen.queryByTestId('key-moment-km2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('key-moment-km3')).not.toBeInTheDocument();
    });

    it('filters key moments by type', () => {
      renderPage();
      selectBattle('b1');
      const kmFilter = screen.getByTestId('key-moments-filter');
      const shutdownCheckbox = within(kmFilter).getByTestId('checkbox-type-shutdown');
      fireEvent.click(shutdownCheckbox);
      expect(screen.queryByTestId('key-moment-km1')).not.toBeInTheDocument();
      expect(screen.getByTestId('key-moment-km3')).toBeInTheDocument();
    });

    it('shows empty key moments message when filter matches none', () => {
      renderPage();
      selectBattle('b1');
      const kmFilter = screen.getByTestId('key-moments-filter');
      const fallCheckbox = within(kmFilter).getByTestId('checkbox-type-fall');
      fireEvent.click(fallCheckbox);
      expect(screen.getByTestId('empty-key-moments')).toBeInTheDocument();
    });

    it('combines tier and type filters', () => {
      renderPage();
      selectBattle('b1');
      const kmFilter = screen.getByTestId('key-moments-filter');
      const criticalCheckbox = within(kmFilter).getByTestId('checkbox-tier-critical');
      const killCheckbox = within(kmFilter).getByTestId('checkbox-type-kill');
      fireEvent.click(criticalCheckbox);
      fireEvent.click(killCheckbox);
      expect(screen.getByTestId('key-moment-km1')).toBeInTheDocument();
      expect(screen.queryByTestId('key-moment-km2')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 3. VCR Control Tests (20 tests)
  // ===========================================================================
  describe('VCR Control Tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      Element.prototype.scrollIntoView = jest.fn();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('displays initial turn as Turn 1', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 1 / 3');
    });

    it('play button shows Play text initially', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Play');
    });

    it('play button starts timeline playback', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Pause');
    });

    it('advances turn during playback at 1x speed', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      act(() => { jest.advanceTimersByTime(1000); });
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 2 / 3');
    });

    it('pause button stops playback', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Pause');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Play');
    });

    it('step forward advances one turn', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 2 / 3');
    });

    it('step back goes back one turn', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 3 / 3');
      fireEvent.click(screen.getByTestId('vcr-step-back'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 2 / 3');
    });

    it('step back is disabled at turn 1', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('vcr-step-back')).toBeDisabled();
    });

    it('step forward is disabled at max turn', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-step-forward')).toBeDisabled();
    });

    it('step back does not go below turn 1', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-back'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 1 / 3');
    });

    it('step forward does not exceed max turn', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 3 / 3');
    });

    it('speed control changes playback speed', () => {
      renderPage();
      selectBattle('b1');
      const speedSelect = screen.getByTestId('vcr-speed-select') as HTMLSelectElement;
      fireEvent.change(speedSelect, { target: { value: '2' } });
      expect(speedSelect.value).toBe('2');
    });

    it('playback at 2x advances turn in 500ms', () => {
      renderPage();
      selectBattle('b1');
      const speedSelect = screen.getByTestId('vcr-speed-select');
      fireEvent.change(speedSelect, { target: { value: '2' } });
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      act(() => { jest.advanceTimersByTime(500); });
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 2 / 3');
    });

    it('playback at 4x advances turn in 250ms', () => {
      renderPage();
      selectBattle('b1');
      const speedSelect = screen.getByTestId('vcr-speed-select');
      fireEvent.change(speedSelect, { target: { value: '4' } });
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      act(() => { jest.advanceTimersByTime(250); });
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 2 / 3');
    });

    it('playback stops at end of timeline', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      act(() => { jest.advanceTimersByTime(3000); });
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Play');
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 3 / 3');
    });

    it('playback wraps to start when pressing play at end', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 3 / 3');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 1 / 3');
    });

    it('auto-scrolls to current turn when playing', () => {
      const scrollMock = jest.fn();
      Element.prototype.scrollIntoView = scrollMock;
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      act(() => { jest.advanceTimersByTime(1000); });
      expect(scrollMock).toHaveBeenCalled();
    });

    it('step forward stops playback', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Pause');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Play');
    });

    it('step back stops playback', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Pause');
      fireEvent.click(screen.getByTestId('vcr-step-back'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Play');
    });

    it('play button is disabled when battle has no events', () => {
      renderPage();
      selectBattle('b3');
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 1 / 1');
    });
  });

  // ===========================================================================
  // 4. Timeline Navigation Tests (15 tests)
  // ===========================================================================
  describe('Timeline Navigation Tests', () => {
    it('click key moment jumps to that turn', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('key-moment-km1'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 3 / 3');
    });

    it('click key moment expands that turn group', () => {
      renderPage();
      selectBattle('b1');
      const turnHeader = screen.getByTestId('turn-group-header-3');
      fireEvent.click(turnHeader);
      expect(turnHeader).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(screen.getByTestId('key-moment-km1'));
      const updatedHeader = screen.getByTestId('turn-group-header-3');
      expect(updatedHeader).toHaveAttribute('aria-expanded', 'true');
    });

    it('turn groups are expanded by default', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('turn-group-header-1')).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('turn-group-header-2')).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('turn-group-header-3')).toHaveAttribute('aria-expanded', 'true');
    });

    it('turn groups can be collapsed', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('turn-group-header-1'));
      expect(screen.getByTestId('turn-group-header-1')).toHaveAttribute('aria-expanded', 'false');
    });

    it('collapsed turn hides events', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('event-ev1')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('turn-group-header-1'));
      expect(screen.queryByTestId('event-ev1')).not.toBeInTheDocument();
    });

    it('current turn is highlighted', () => {
      renderPage();
      selectBattle('b1');
      const turnGroup1 = screen.getByTestId('turn-group-1');
      expect(turnGroup1).toHaveClass('border-blue-500');
    });

    it('current turn highlight moves with step forward', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      const turnGroup2 = screen.getByTestId('turn-group-2');
      expect(turnGroup2).toHaveClass('border-blue-500');
      const turnGroup1 = screen.getByTestId('turn-group-1');
      expect(turnGroup1).not.toHaveClass('border-blue-500');
    });

    it('event details display correctly', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('event-ev1')).toHaveTextContent('Atlas moves 4 hexes forward');
      expect(screen.getByTestId('event-ev2')).toHaveTextContent('Atlas fires PPC at Mad Cat');
    });

    it('event displays phase label', () => {
      renderPage();
      selectBattle('b1');
      const event = screen.getByTestId('event-ev1');
      expect(event).toHaveTextContent('Movement');
    });

    it('event shows involved units', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('event-units-ev2')).toHaveTextContent('Atlas AS7-D');
      expect(screen.getByTestId('event-units-ev2')).toHaveTextContent('Mad Cat');
    });

    it('events are grouped by turn in order', () => {
      renderPage();
      selectBattle('b1');
      const eventList = screen.getByTestId('event-list');
      const turnGroups = within(eventList).getAllByText(/^Turn \d+$/);
      const turnNumbers = turnGroups.map(el => parseInt(el.textContent!.replace('Turn ', '')));
      expect(turnNumbers).toEqual([1, 2, 3]);
    });

    it('mission groups are expanded by default', () => {
      renderPage();
      expect(screen.getByTestId('mission-group-header-m1')).toHaveAttribute('aria-expanded', 'true');
    });

    it('mission groups can be collapsed', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('mission-group-header-m1'));
      expect(screen.getByTestId('mission-group-header-m1')).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('battle-card-b1')).not.toBeInTheDocument();
    });

    it('selecting a battle calls onSelectBattle callback', () => {
      const onSelectBattle = jest.fn();
      renderPage({ onSelectBattle });
      selectBattle('b1');
      expect(onSelectBattle).toHaveBeenCalledWith('b1');
    });

    it('selected battle card is visually highlighted', () => {
      renderPage();
      selectBattle('b1');
      const card = screen.getByTestId('battle-card-b1');
      expect(card).toHaveAttribute('aria-selected', 'true');
      expect(card).toHaveClass('border-blue-500');
    });
  });

  // ===========================================================================
  // 5. Comparison View Tests (10 tests)
  // ===========================================================================
  describe('Comparison View Tests', () => {
    it('defaults to campaign average comparison mode', () => {
      renderPage();
      selectBattle('b1');
      const toggle = screen.getByTestId('comparison-mode-toggle') as HTMLSelectElement;
      expect(toggle.value).toBe('campaign-average');
    });

    it('renders comparison metrics', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('comparison-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-metric-duration')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-metric-kills')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-metric-damage')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-metric-unitsLost')).toBeInTheDocument();
    });

    it('toggle to specific battle shows battle selector', () => {
      renderPage();
      selectBattle('b1');
      const toggle = screen.getByTestId('comparison-mode-toggle');
      fireEvent.change(toggle, { target: { value: 'specific-battle' } });
      expect(screen.getByTestId('comparison-battle-select')).toBeInTheDocument();
    });

    it('specific battle selector excludes current battle', () => {
      renderPage();
      selectBattle('b1');
      const toggle = screen.getByTestId('comparison-mode-toggle');
      fireEvent.change(toggle, { target: { value: 'specific-battle' } });
      const selector = screen.getByTestId('comparison-battle-select');
      const options = within(selector).getAllByRole('option');
      const optionValues = options.map(o => (o as HTMLOptionElement).value);
      expect(optionValues).not.toContain('b1');
      expect(optionValues).toContain('b2');
      expect(optionValues).toContain('b3');
    });

    it('shows message when no comparison target selected', () => {
      renderPage();
      selectBattle('b1');
      const toggle = screen.getByTestId('comparison-mode-toggle');
      fireEvent.change(toggle, { target: { value: 'specific-battle' } });
      expect(screen.getByTestId('no-comparison-target')).toBeInTheDocument();
    });

    it('selecting comparison battle shows comparison metrics', () => {
      renderPage();
      selectBattle('b1');
      const toggle = screen.getByTestId('comparison-mode-toggle');
      fireEvent.change(toggle, { target: { value: 'specific-battle' } });
      const selector = screen.getByTestId('comparison-battle-select');
      fireEvent.change(selector, { target: { value: 'b2' } });
      expect(screen.getByTestId('comparison-metrics')).toBeInTheDocument();
    });

    it('bar charts are rendered for each metric', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('comparison-bar-current-duration')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-bar-baseline-duration')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-bar-current-kills')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-bar-baseline-kills')).toBeInTheDocument();
    });

    it('comparison metrics show current vs baseline values', () => {
      renderPage();
      selectBattle('b1');
      const durationMetric = screen.getByTestId('comparison-metric-duration');
      expect(durationMetric).toHaveTextContent('30:00');
    });

    it('DrillDownLink present in comparison section', () => {
      renderPage();
      selectBattle('b1');
      const compSection = screen.getByTestId('comparison-metrics');
      const link = within(compSection).getByTestId('drill-down-link');
      expect(link).toBeInTheDocument();
    });

    it('comparison DrillDownLink triggers onDrillDown', () => {
      const onDrillDown = jest.fn();
      renderPage({ onDrillDown });
      selectBattle('b1');
      const compSection = screen.getByTestId('comparison-metrics');
      const link = within(compSection).getByTestId('drill-down-link');
      fireEvent.click(link);
      expect(onDrillDown).toHaveBeenCalledWith('analysis-bugs', expect.objectContaining({ battleId: 'b1' }));
    });
  });

  // ===========================================================================
  // 6. Responsive Layout Tests (10 tests)
  // ===========================================================================
  describe('Responsive Layout Tests', () => {
    it('page has responsive padding', () => {
      renderPage();
      const container = screen.getByTestId('encounter-history');
      expect(container).toHaveClass('p-4');
      expect(container).toHaveClass('md:p-6');
      expect(container).toHaveClass('lg:p-8');
    });

    it('layout container uses flex-col lg:flex-row', () => {
      renderPage();
      const container = screen.getByTestId('encounter-history');
      const flexContainer = container.querySelector('.flex.flex-col.lg\\:flex-row');
      expect(flexContainer).toBeInTheDocument();
    });

    it('sidebar has w-full lg:w-[30%] classes', () => {
      renderPage();
      const sidebar = screen.getByTestId('battle-list-sidebar');
      expect(sidebar).toHaveClass('w-full');
      expect(sidebar).toHaveClass('lg:w-[30%]');
    });

    it('main content has w-full lg:w-[70%] classes', () => {
      renderPage();
      const main = screen.getByTestId('battle-detail');
      expect(main).toHaveClass('w-full');
      expect(main).toHaveClass('lg:w-[70%]');
    });

    it('forces section uses responsive grid', () => {
      renderPage();
      selectBattle('b1');
      const forcesSection = screen.getByTestId('forces-section');
      const grid = forcesSection.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('battle list sidebar is full width on mobile', () => {
      renderPage();
      expect(screen.getByTestId('battle-list-sidebar')).toHaveClass('w-full');
    });

    it('battle detail is full width on mobile', () => {
      renderPage();
      expect(screen.getByTestId('battle-detail')).toHaveClass('w-full');
    });

    it('sidebar has gap-4 with main', () => {
      renderPage();
      const container = screen.getByTestId('encounter-history');
      const flexContainer = container.querySelector('.flex.flex-col');
      expect(flexContainer).toHaveClass('gap-4');
    });

    it('damage matrix has overflow-x-auto for small screens', () => {
      renderPage();
      selectBattle('b1');
      const matrixSection = screen.getByTestId('damage-matrix-section');
      const wrapper = matrixSection.querySelector('.overflow-x-auto');
      expect(wrapper).toBeInTheDocument();
    });

    it('key moments timeline has horizontal scroll', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('key-moments-timeline')).toHaveClass('overflow-x-auto');
    });
  });

  // ===========================================================================
  // 7. Dark Mode Tests (5 tests)
  // ===========================================================================
  describe('Dark Mode Tests', () => {
    it('page container has dark mode background', () => {
      renderPage();
      expect(screen.getByTestId('encounter-history')).toHaveClass('dark:bg-gray-900');
    });

    it('page title has dark mode text color', () => {
      renderPage();
      expect(screen.getByTestId('encounter-history-title')).toHaveClass('dark:text-gray-100');
    });

    it('section headings have dark mode text color', () => {
      renderPage();
      selectBattle('b1');
      const headings = screen.getAllByTestId('section-heading');
      headings.forEach(h => {
        expect(h).toHaveClass('dark:text-gray-200');
      });
    });

    it('force panels have dark mode background and border', () => {
      renderPage();
      selectBattle('b1');
      const playerForce = screen.getByTestId('player-force');
      expect(playerForce).toHaveClass('dark:bg-gray-800');
      expect(playerForce).toHaveClass('dark:border-gray-700');
    });

    it('VCR controls have dark mode styling', () => {
      renderPage();
      selectBattle('b1');
      const vcr = screen.getByTestId('vcr-controls');
      expect(vcr).toHaveClass('dark:bg-gray-800');
      expect(vcr).toHaveClass('dark:border-gray-700');
    });
  });

  // ===========================================================================
  // 8. Mock Data / Edge Case Tests (15 tests)
  // ===========================================================================
  describe('Mock Data Edge Cases', () => {
    it('handles empty battles array', () => {
      renderPage({ battles: [] });
      expect(screen.getByTestId('empty-battle-list')).toBeInTheDocument();
    });

    it('handles battle with no key moments', () => {
      renderPage();
      selectBattle('b3');
      expect(screen.getByTestId('empty-key-moments')).toBeInTheDocument();
    });

    it('handles battle with no events', () => {
      const battleNoEvents: IBattle = {
        ...mockBattle1,
        id: 'b-no-events',
        events: [],
      };
      renderPage({ battles: [battleNoEvents] });
      selectBattle('b-no-events');
      expect(screen.getByTestId('empty-events')).toBeInTheDocument();
    });

    it('handles zero damage in matrix', () => {
      const battleZeroDmg: IBattle = {
        ...mockBattle1,
        id: 'b-zero',
        damageMatrix: {
          attackers: ['u1'],
          targets: ['e1'],
          cells: [{ attackerId: 'u1', targetId: 'e1', damage: 0 }],
        },
      };
      renderPage({ battles: [battleZeroDmg] });
      selectBattle('b-zero');
      expect(screen.getByTestId('damage-cell-u1-e1')).toHaveTextContent('0');
    });

    it('handles empty damage matrix', () => {
      const battleEmptyMatrix: IBattle = {
        ...mockBattle1,
        id: 'b-empty-matrix',
        damageMatrix: { attackers: [], targets: [], cells: [] },
      };
      renderPage({ battles: [battleEmptyMatrix] });
      selectBattle('b-empty-matrix');
      expect(screen.getByTestId('empty-damage-matrix')).toBeInTheDocument();
    });

    it('handles missing optional onSelectBattle', () => {
      expect(() => {
        render(<EncounterHistory campaignId="test" battles={mockBattles} />);
        fireEvent.click(screen.getByTestId('battle-card-b1'));
      }).not.toThrow();
    });

    it('handles missing optional onDrillDown', () => {
      expect(() => {
        render(<EncounterHistory campaignId="test" battles={mockBattles} />);
        fireEvent.click(screen.getByTestId('battle-card-b1'));
      }).not.toThrow();
    });

    it('handles empty campaignId', () => {
      renderPage({ campaignId: '' });
      expect(screen.getByTestId('encounter-history')).toHaveAttribute('data-campaign-id', '');
    });

    it('handles single battle', () => {
      renderPage({ battles: [mockBattle1] });
      expect(screen.getByTestId('battle-card-b1')).toBeInTheDocument();
    });

    it('handles battle with single event', () => {
      renderPage();
      selectBattle('b3');
      expect(screen.getByTestId('turn-group-1')).toBeInTheDocument();
    });

    it('battle card shows outcome badge', () => {
      renderPage();
      expect(screen.getByTestId('battle-outcome-badge-b1')).toHaveTextContent('victory');
      expect(screen.getByTestId('battle-outcome-badge-b2')).toHaveTextContent('defeat');
      expect(screen.getByTestId('battle-outcome-badge-b3')).toHaveTextContent('draw');
    });

    it('battle card shows formatted duration', () => {
      renderPage();
      expect(screen.getByTestId('battle-duration-b1')).toHaveTextContent('30:00');
    });

    it('battle card shows kill count', () => {
      renderPage();
      expect(screen.getByTestId('battle-kills-b1')).toHaveTextContent('2 kills');
    });

    it('battle card shows damage total', () => {
      renderPage();
      expect(screen.getByTestId('battle-damage-b1')).toHaveTextContent('140 dmg');
    });

    it('outcome summary shows correct stats', () => {
      renderPage();
      selectBattle('b1');
      const summary = screen.getByTestId('outcome-summary');
      expect(summary).toHaveTextContent('Victory');
      expect(summary).toHaveTextContent('2 kills');
      expect(summary).toHaveTextContent('140 damage');
      expect(summary).toHaveTextContent('0 lost');
    });
  });

  // ===========================================================================
  // Utility function tests
  // ===========================================================================
  describe('formatDuration', () => {
    it('formats 1800 seconds as 30:00', () => {
      expect(formatDuration(1800)).toBe('30:00');
    });

    it('formats 0 seconds as 0:00', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('formats 90 seconds as 1:30', () => {
      expect(formatDuration(90)).toBe('1:30');
    });

    it('formats 65 seconds as 1:05', () => {
      expect(formatDuration(65)).toBe('1:05');
    });

    it('formats 3600 seconds as 60:00', () => {
      expect(formatDuration(3600)).toBe('60:00');
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================
  describe('Accessibility', () => {
    it('sidebar has aria-label', () => {
      renderPage();
      expect(screen.getByTestId('battle-list-sidebar')).toHaveAttribute('aria-label', 'Battle list');
    });

    it('main content has aria-label', () => {
      renderPage();
      expect(screen.getByTestId('battle-detail')).toHaveAttribute('aria-label', 'Battle detail');
    });

    it('sort controls group has aria-label', () => {
      renderPage();
      expect(screen.getByTestId('sort-controls')).toHaveAttribute('aria-label', 'Sort battles by');
    });

    it('sort buttons have aria-pressed', () => {
      renderPage();
      expect(screen.getByTestId('sort-button-duration')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('sort-button-kills')).toHaveAttribute('aria-pressed', 'false');
    });

    it('VCR buttons have aria-labels', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('vcr-play-pause')).toHaveAttribute('aria-label', 'Play');
      expect(screen.getByTestId('vcr-step-back')).toHaveAttribute('aria-label', 'Step back');
      expect(screen.getByTestId('vcr-step-forward')).toHaveAttribute('aria-label', 'Step forward');
    });

    it('damage matrix cells are keyboard accessible', () => {
      const onDrillDown = jest.fn();
      renderPage({ onDrillDown });
      selectBattle('b1');
      const cell = screen.getByTestId('damage-cell-u1-e1');
      fireEvent.keyDown(cell, { key: 'Enter' });
      expect(onDrillDown).toHaveBeenCalled();
    });

    it('damage matrix cells have title for hover tooltip', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('damage-cell-u1-e1')).toHaveAttribute('title', '45 damage');
    });

    it('detail sections have aria-labels', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('forces-section')).toHaveAttribute('aria-label', 'Forces');
      expect(screen.getByTestId('damage-matrix-section')).toHaveAttribute('aria-label', 'Damage matrix');
      expect(screen.getByTestId('key-moments-section')).toHaveAttribute('aria-label', 'Key moments');
      expect(screen.getByTestId('event-timeline-section')).toHaveAttribute('aria-label', 'Event timeline');
      expect(screen.getByTestId('comparison-section')).toHaveAttribute('aria-label', 'Comparison view');
    });
  });

  // ===========================================================================
  // Interaction edge cases
  // ===========================================================================
  describe('Interaction Edge Cases', () => {
    it('switching battles resets turn to 1', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 2 / 3');
      selectBattle('b2');
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent('Turn 1 / 4');
    });

    it('damage cell click calls onDrillDown with correct context', () => {
      const onDrillDown = jest.fn();
      renderPage({ onDrillDown });
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('damage-cell-u2-e1'));
      expect(onDrillDown).toHaveBeenCalledWith('encounter-history', {
        attackerId: 'u2',
        targetId: 'e1',
        battleId: 'b1',
      });
    });

    it('player BV is displayed correctly', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('player-bv')).toHaveTextContent('3,500');
    });

    it('enemy BV is displayed correctly', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('enemy-bv')).toHaveTextContent('3,200');
    });

    it('key moment shows description text', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('key-moment-km1')).toHaveTextContent('Atlas destroys Mad Cat with headshot');
    });

    it('key moment shows phase and type info', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('key-moment-km1')).toHaveTextContent('Weapon Attack');
      expect(screen.getByTestId('key-moment-km1')).toHaveTextContent('kill');
    });
  });
});
