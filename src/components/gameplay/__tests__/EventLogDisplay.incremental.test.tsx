/**
 * Perf: the event log formats only appended events. This pins that the
 * incremental derivation renders exactly what a full derivation renders,
 * through appends, rewinds, corrections, replay seeks, filter changes and
 * unit or weapon renames, and that an append formats only the new events.
 *
 * The reference is the log's derivation before the incremental cache:
 * filter, format every event, group oldest-first, reverse. It runs in full
 * at every step and renders every row without the row memo, so the two
 * DOMs must match byte for byte (text, markup and row order).
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

import type { IEventLogFilter, IGameEvent } from '@/types/gameplay';

import { EventLogDisplay } from '@/components/gameplay/EventLogDisplay';
import { formatEvent } from '@/components/gameplay/EventLogDisplay.formatters';
import {
  annotateGroupedEvents,
  filterEvents,
} from '@/components/gameplay/EventLogDisplay.helpers';
import { EventRow } from '@/components/gameplay/EventLogDisplayRow';
import {
  Facing,
  GameEventType,
  GamePhase,
  MovementType,
} from '@/types/gameplay';

jest.mock('@/components/gameplay/EventLogDisplay.formatters', () => {
  const actual = jest.requireActual(
    '@/components/gameplay/EventLogDisplay.formatters',
  );
  return { ...actual, formatEvent: jest.fn(actual.formatEvent) };
});

const formatEventSpy = formatEvent as jest.MockedFunction<typeof formatEvent>;

type Lookup = Record<string, string> | undefined;

interface ILogProps {
  readonly events: readonly IGameEvent[];
  readonly filter?: IEventLogFilter;
  readonly weaponLookup?: Lookup;
  readonly actorLookup?: Lookup;
}

interface IStep extends ILogProps {
  readonly name: string;
  /** formatEvent calls the step may make, when it is an append. */
  readonly formats?: number;
}

const UNITS = ['unit-a', 'unit-b', 'unit-c'] as const;

function makeEvent(
  sequence: number,
  type: GameEventType,
  payload: Record<string, unknown>,
): IGameEvent {
  return {
    id: `event-${sequence}`,
    gameId: 'game-1',
    sequence,
    timestamp: `2026-11-19T00:00:00.${String(sequence % 1000).padStart(3, '0')}Z`,
    type,
    turn: 1 + Math.floor(sequence / 20),
    phase: GamePhase.WeaponAttack,
    actorId: UNITS[sequence % 3],
    payload,
  } as IGameEvent;
}

/**
 * Event `sequence` of a game: a repeating mix that exercises every grouping
 * rule (attack parent, nested damage, overflow, breach, orphan damage) and
 * every lookup the formatter reads (actor names and weapon names).
 * `mp` changes a movement's content without changing its id.
 */
function gameEvent(sequence: number, mp = 3): IGameEvent {
  const unit = UNITS[sequence % 3];
  const attack = `atk-${Math.floor(sequence / 10)}`;
  switch (sequence % 10) {
    case 0:
      return makeEvent(sequence, GameEventType.MovementDeclared, {
        unitId: unit,
        from: { q: 0, r: 0 },
        to: { q: mp, r: 0 },
        facing: Facing.South,
        movementType: MovementType.Walk,
        mode: MovementType.Walk,
        path: [],
        mpUsed: mp,
        heatGenerated: 1,
      });
    case 1:
      return makeEvent(sequence, GameEventType.HeatGenerated, {
        unitId: unit,
        amount: 2,
        newTotal: sequence % 7,
        source: 'movement',
      });
    case 2:
      return makeEvent(sequence, GameEventType.AttackResolved, {
        attackId: attack,
        attackerId: 'unit-a',
        targetId: 'unit-b',
        weaponId: sequence % 4 === 0 ? 'w-ml' : 'w-ppc',
        hit: true,
        roll: 9,
        toHitNumber: 7,
        damage: 5,
        location: 'left_arm',
      });
    case 3:
    case 4:
      return makeEvent(sequence, GameEventType.DamageApplied, {
        attackId: attack,
        unitId: 'unit-b',
        location: sequence % 10 === 3 ? 'left_arm' : 'left_torso',
        damage: 5,
        armorRemaining: 0,
        structureRemaining: 4,
        locationDestroyed: false,
      });
    case 5:
      return makeEvent(sequence, GameEventType.CriticalHit, {
        unitId: 'unit-b',
        location: 'left_torso',
      });
    case 6:
      return makeEvent(sequence, GameEventType.PhysicalAttackDeclared, {
        attackerId: 'unit-c',
        targetId: 'unit-a',
        attackType: 'punch',
        toHitNumber: 6,
      });
    case 7:
    case 8:
      return makeEvent(sequence, GameEventType.DamageApplied, {
        attackId: `orphan-${Math.floor(sequence / 10)}`,
        unitId: 'unit-c',
        location: 'right_leg',
        damage: 2,
        armorRemaining: 3,
        structureRemaining: 6,
        locationDestroyed: sequence % 10 === 8,
      });
    default:
      return makeEvent(sequence, GameEventType.PhaseChanged, {
        fromPhase: GamePhase.WeaponAttack,
        toPhase: GamePhase.PhysicalAttack,
      });
  }
}

function game(from: number, to: number): IGameEvent[] {
  return Array.from({ length: to - from }, (_, i) => gameEvent(from + i));
}

/** EventRow without its memo: every reference row renders at every step. */
const UnmemoizedEventRow = EventRow.type;

/** The log's derivation before the incremental cache, in full. */
function ReferenceRows({
  events,
  filter = {},
  weaponLookup,
  actorLookup,
}: ILogProps): React.ReactElement {
  const filtered = filterEvents(events, filter);
  const formatted = filtered.map((e) =>
    formatEvent(e, weaponLookup, actorLookup),
  );
  const rows = [...annotateGroupedEvents(filtered, formatted)].reverse();
  return (
    <>
      {rows.map((row) => (
        <UnmemoizedEventRow
          key={row.id}
          event={row}
          actorLookup={actorLookup}
        />
      ))}
    </>
  );
}

/** The scenario: every way the log's input can change, in one session. */
function scenario(size: number): IStep[] {
  const half = Math.floor(size / 2);
  const names = { 'unit-a': 'Atlas', 'unit-b': 'unit-b', 'unit-c': 'Catapult' };
  const weapons = { 'w-ml': 'Medium Laser', 'w-ppc': 'PPC' };
  const renamed = { ...names, 'unit-b': 'Blackjack' };
  const gmRenamed = { ...renamed, 'unit-a': 'Atlas II' };
  const base = game(0, size);
  const plusOne = [...base, gameEvent(size)];
  const plusFour = [...plusOne, ...game(size + 1, size + 4)];
  const corrected = plusFour.map((e, i) =>
    i === half ? gameEvent(e.sequence, 9) : e,
  );
  const correctedAndAppended = [
    ...corrected.map((e, i) => (i === 3 ? gameEvent(e.sequence, 7) : e)),
    gameEvent(size + 4),
  ];
  const rewound = correctedAndAppended.slice(0, half);
  const branched = [...rewound, gameEvent(half, 1), gameEvent(half + 1)];
  const branchedMore = [...branched, ...game(half + 2, half + 6)];
  // A replay seek back, then forward along the original timeline.
  const seekBack = base.slice(0, Math.floor(size / 4));
  const seekForward = base.slice(0, Math.floor((3 * size) / 4));
  const seekForwardMore = base.slice(0, Math.floor((3 * size) / 4) + 2);
  // Movement animations hide an event mid-list, then show it again.
  const hidden = seekForwardMore.filter((_, i) => i !== half);
  const unitFilter: IEventLogFilter = { unitId: 'unit-a' };
  const typeFilter: IEventLogFilter = {
    eventTypes: [GameEventType.DamageApplied, GameEventType.CriticalHit],
  };
  const turnFilter: IEventLogFilter = { turn: 2 };
  const filteredAppend = [
    ...seekForwardMore,
    ...game(seekForwardMore.length, seekForwardMore.length + 10),
  ];

  const at = (
    name: string,
    events: readonly IGameEvent[],
    extra: Partial<IStep> = {},
  ): IStep => ({
    name,
    events,
    weaponLookup: weapons,
    actorLookup: renamed,
    ...extra,
  });

  return [
    { name: 'mount', events: base, weaponLookup: weapons, actorLookup: names },
    {
      name: 'append 1',
      events: plusOne,
      weaponLookup: weapons,
      actorLookup: names,
      formats: 1,
    },
    {
      name: 'append 3',
      events: plusFour,
      weaponLookup: weapons,
      actorLookup: names,
      formats: 3,
    },
    {
      name: 'same names, new lookup objects',
      events: plusFour,
      weaponLookup: { ...weapons },
      actorLookup: { ...names },
      formats: 0,
    },
    at('fog reveal renames unit-b', plusFour),
    at('GM renames unit-a', plusFour, { actorLookup: gmRenamed }),
    at('GM rename reverted', plusFour),
    at('weapon renamed', plusFour, {
      weaponLookup: { ...weapons, 'w-ppc': 'ER PPC' },
    }),
    at('weapon name dropped', plusFour, { weaponLookup: { 'w-ml': 'ML' } }),
    at('lookups removed', plusFour, {
      weaponLookup: undefined,
      actorLookup: undefined,
    }),
    at('lookups back', plusFour),
    at('same-id correction mid-list', corrected),
    at('correction plus append', correctedAndAppended),
    at('rewind to half', rewound),
    at('new branch after rewind', branched),
    at('append on the branch', branchedMore, { formats: 4 }),
    at('replay seek back', seekBack),
    at('replay seek forward', seekForward),
    at('replay step forward', seekForwardMore, { formats: 2 }),
    at('animation hides an event', hidden),
    at('animation shows it again', seekForwardMore),
    at('filter by unit', seekForwardMore, { filter: unitFilter }),
    at('append while filtered', filteredAppend, { filter: unitFilter }),
    at('filter by type', filteredAppend, { filter: typeFilter }),
    at('filter by turn', filteredAppend, { filter: turnFilter }),
    at('filter cleared', filteredAppend),
    at('rename after filters', filteredAppend, { actorLookup: gmRenamed }),
    at('empty list', []),
    at('first event after empty', game(0, 1), { formats: 1 }),
  ];
}

describe.each([50, 2000])(
  'EventLogDisplay incremental formatting equals a full derivation (%i events)',
  (size) => {
    it('renders the same rows, in the same order, at every step', () => {
      const steps = scenario(size);
      const [first, ...rest] = steps;
      const { rerender } = render(<EventLogDisplay {...first} />);
      const reference = render(<ReferenceRows {...first} />);
      const content = () => screen.getByTestId('event-log-content');
      let rowsCompared = 0;

      for (const step of [first, ...rest]) {
        if (step !== first) {
          formatEventSpy.mockClear();
          rerender(<EventLogDisplay {...step} />);
          if (step.formats !== undefined) {
            expect({
              step: step.name,
              formats: formatEventSpy.mock.calls.length,
            }).toEqual({ step: step.name, formats: step.formats });
          }
        }
        reference.rerender(<ReferenceRows {...step} />);
        const expected = reference.container.innerHTML;
        if (expected === '') {
          expect(screen.getByTestId('event-log-empty')).toBeTruthy();
          continue;
        }
        const shown = content();
        expect({ step: step.name, html: shown.innerHTML }).toEqual({
          step: step.name,
          html: expected,
        });
        rowsCompared += shown.querySelectorAll(
          '[data-testid="event-row"]',
        ).length;
      }

      // Every step ran and compared rows (the counts go in the perf record).
      expect(steps).toHaveLength(29);
      expect(rowsCompared).toBeGreaterThan(size * 10);
      // eslint-disable-next-line no-console
      console.log(
        `incremental equivalence ${size}: ${steps.length} steps, ${rowsCompared} rows compared`,
      );
    });
  },
);
