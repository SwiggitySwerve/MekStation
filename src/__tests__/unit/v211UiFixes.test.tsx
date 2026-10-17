/**
 * v2.1.1 L0 UI defects: custom unit detail mapping (L0-09), Games list
 * labels (L0-10), event-log unit names (L0-11) and non-weapon catalog noise
 * (L0-11).
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import type { MatchLogSummary } from '@/services/matchLog/MatchLogService';

import { EventLogDisplay } from '@/components/gameplay/EventLogDisplay';
import { buildEventActorLookup } from '@/components/gameplay/GameplayLayout.viewModel';
import { extractWeapons } from '@/engine/adapters/CompendiumAdapter.weapons';
import GamesListPage, { getServerSideProps } from '@/pages/gameplay/games';
import CustomUnitDetailPage from '@/pages/units/[id]';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
} from '@/types/gameplay';
import { logger } from '@/utils/logger';

const mockRouterPush = jest.fn();
let mockQuery: Record<string, string> = {};
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/',
    query: mockQuery,
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));

const mockListMatchLogs = jest.fn<readonly MatchLogSummary[], [number?]>();
jest.mock('@/services/matchLog/MatchLogService', () => ({
  listMatchLogs: (limit?: number) => mockListMatchLogs(limit),
}));

// Shape persisted by the customizer (ISerializedUnit), as returned by
// GET /api/units/custom/:id (record columns + parsedData). Note: the record
// has no weightClass column.
const SAVED_CUSTOM_UNIT = {
  id: 'custom-3318c6ef',
  chassis: 'Hunchback',
  variant: 'HBK-4G-L0',
  tonnage: 50,
  techBase: 'Inner Sphere',
  era: 'Succession Wars',
  rulesLevel: 'STANDARD',
  unitType: 'BattleMech',
  currentVersion: 1,
  createdAt: '2026-10-17T10:00:00.000Z',
  updatedAt: '2026-10-17T10:00:00.000Z',
  data: '{}',
  parsedData: {
    engine: { type: 'FUSION', rating: 200 },
    structure: { type: 'STANDARD' },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 4, jump: 0 },
    armor: {
      type: 'STANDARD',
      allocation: {
        HEAD: 9,
        CENTER_TORSO: { front: 20, rear: 8 },
        LEFT_ARM: 16,
      },
    },
    equipment: [
      { id: 'medium-laser', location: 'LEFT_ARM' },
      { id: 'definitely-not-in-catalog-ammo', location: 'RIGHT_TORSO' },
    ],
  },
};

describe('L0-09 custom unit detail page', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockQuery = { id: SAVED_CUSTOM_UNIT.id };
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => SAVED_CUSTOM_UNIT,
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps the saved ISerializedUnit shape onto the detail cards', async () => {
    const { container } = render(React.createElement(CustomUnitDetailPage));

    await waitFor(() =>
      expect(screen.getByText('Physical Properties')).toBeInTheDocument(),
    );

    // Derived weight class instead of an "undefined" badge / blank row.
    expect(container.textContent).not.toContain('undefined');
    expect(screen.getAllByText('Medium').length).toBeGreaterThan(0);

    // Movement: walk 4 -> run 6 (jump 0 hidden).
    expect(screen.getByText('Walk MP').nextSibling?.textContent).toBe('4');
    expect(screen.getByText('Run MP').nextSibling?.textContent).toBe('6');

    // Armor: allocation entries + computed total (9 + 20 + 8 + 16 = 53).
    expect(screen.getByText('Total Armor').nextSibling?.textContent).toBe('53');
    expect(screen.getByText('CENTER TORSO').nextSibling?.textContent).toBe(
      '28',
    );

    // Heat sinks use `count`.
    expect(screen.getByText('Heat Sinks').nextSibling?.textContent).toBe('10');

    // Equipment rows are named (catalog name, or a readable id fallback).
    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    expect(
      screen.getByText('Definitely Not In Catalog Ammo'),
    ).toBeInTheDocument();
  });
});

describe('L0-10 Games list labels', () => {
  beforeEach(() => mockListMatchLogs.mockReset());

  it('labels winner and end reason instead of Player/Opponent', async () => {
    mockListMatchLogs.mockReturnValue([
      {
        id: 'match-1',
        version: 1,
        winner: 'opponent',
        reason: 'destruction',
        turnCount: 7,
        createdAt: Date.parse('2026-10-17T12:00:00.000Z'),
      },
    ]);
    const result = (await getServerSideProps({} as never)) as {
      props: { games: React.ComponentProps<typeof GamesListPage>['games'] };
    };

    render(React.createElement(GamesListPage, result.props));

    const card = screen.getByTestId('game-card-match-1');
    expect(card.textContent).not.toContain('Player:');
    expect(card.textContent).not.toContain('Winner: opponent');
    expect(screen.getByText('Result:').parentElement?.textContent).toContain(
      'Opponent victory',
    );
    expect(screen.getByText('Reason:').parentElement?.textContent).toContain(
      'Last side standing',
    );
  });
});

describe('L0-11 event log names', () => {
  it('prefers the unit display name over the catalog unitRef id', () => {
    const lookup = buildEventActorLookup([
      {
        id: 'unit-k8bj4ws',
        name: 'Shadow Hawk SHD-2H',
        side: GameSide.Opponent,
        unitRef: 'shadow-hawk-shd-2h',
      },
      {
        id: 'unit-p1',
        name: 'Hunchback HBK-4G-L0',
        side: GameSide.Player,
        unitRef: 'custom-3318c6ef',
      },
    ] as unknown as Parameters<typeof buildEventActorLookup>[0]);

    expect(lookup).toEqual({
      'unit-k8bj4ws': 'Shadow Hawk SHD-2H',
      'unit-p1': 'Hunchback HBK-4G-L0',
    });
  });

  it('resolves unit ids inside event text, not only the actor column', () => {
    const event = (
      id: string,
      type: GameEventType,
      payload: Record<string, unknown>,
    ): IGameEvent =>
      ({
        id,
        gameId: 'g1',
        sequence: 1,
        timestamp: '2026-10-17T12:00:00.000Z',
        type,
        turn: 2,
        phase: GamePhase.WeaponAttack,
        payload,
      }) as unknown as IGameEvent;

    render(
      React.createElement(EventLogDisplay, {
        events: [
          event('e1', GameEventType.UnitDestroyed, {
            unitId: 'unit-k8bj4ws',
            cause: 'damage',
          }),
          event('e2', GameEventType.DamageApplied, {
            unitId: 'unit-k8bj4ws',
            location: 'left_torso',
            damage: 5,
            armorRemaining: 3,
            structureRemaining: 10,
            locationDestroyed: false,
          }),
        ],
        actorLookup: { 'unit-k8bj4ws': 'Shadow Hawk SHD-2H' },
      }),
    );

    const texts = screen.getAllByTestId('event-text').map((n) => n.textContent);
    expect(texts.join('\n')).toContain('Shadow Hawk SHD-2H destroyed');
    expect(texts.join('\n')).toContain('Shadow Hawk SHD-2H took 5 damage');
    expect(texts.join('\n')).not.toContain('unit-k8bj4ws');
  });
});

describe('L0-11 catalog warnings', () => {
  it('does not warn about ammo or heat sink mounts as missing weapons', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const weapons = extractWeapons(
      [
        { id: 'medium-laser', location: 'LEFT_ARM' },
        { id: 'ac-20-ammo', location: 'RIGHT_TORSO' },
        { id: 'single-heat-sink', location: 'CENTER_TORSO' },
      ],
      'unit-1',
      {},
    );

    expect(weapons.map((w) => w.name)).toEqual(['Medium Laser']);
    const messages = warn.mock.calls.map((call) => String(call[0]));
    expect(
      messages.filter((m) => /ac-20-ammo|single-heat-sink/.test(m)),
    ).toEqual([]);
    warn.mockRestore();
  });
});
