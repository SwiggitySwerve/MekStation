import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import { GameSide, ReplaySource, type IGameUnit } from '@/types/gameplay';

import { loadReplayLibraryNdjson } from '../ReplayLibraryLoadPipeline';

// Same catalog player roster as playtest-sp-smoke.spec.ts, with a fixed
// opposing roster so the corpus varies combat RNG rather than RAT selection.
const DESIGNS = [
  '2-star-league/standard/Atlas AS7-D.json',
  '3-succession-wars/standard/Marauder MAD-3R.json',
] as const;
const SEEDS = Array.from({ length: 16 }, (_, index) => index + 1);

describe('quick-game production writer/replay acceptance contract', () => {
  it('loads every emitted event type across the fixed combat seed corpus', () => {
    const designs = DESIGNS.map(
      (design) =>
        JSON.parse(
          readFileSync(
            path.resolve('public/data/units/battlemechs', design),
            'utf8',
          ),
        ) as IFullUnit,
    );
    const corpus = SEEDS.map((seed) => {
      const adapted = [GameSide.Player, GameSide.Opponent].flatMap((side) =>
        designs.map((data, index) => ({
          ...adaptUnitFromData(data, { side }),
          id: `${side}-${index}`,
        })),
      );
      const gameUnits: IGameUnit[] = adapted.map((unit) => ({
        id: unit.id,
        name: unit.id,
        side: unit.side,
        unitRef: designs[Number(unit.id.slice(-1))].id,
        pilotRef: 'Regular',
        gunnery: 4,
        piloting: 5,
      }));
      // Quick Game startBattle calls this production engine, then records
      // session.events. JSON serialization is essential: Infinity becomes null.
      const session = new GameEngine({ seed }).runToCompletion(
        adapted.filter((unit) => unit.side === GameSide.Player),
        adapted.filter((unit) => unit.side === GameSide.Opponent),
        gameUnits,
      );
      const raw = session.events
        .map((event) =>
          JSON.stringify({ ...event, replaySource: ReplaySource.Quick }),
        )
        .join('\n');
      const result = loadReplayLibraryNdjson(raw, `quick/seed-${seed}`);
      if (result.kind === 'loaded') {
        expect(result.events).toHaveLength(session.events.length);
        expect(result.census.eventsApplied).toBe(session.events.length);
      }
      const blocked = result.kind === 'blocked' ? result.blockedLines : [];
      return {
        seed,
        eventCount: session.events.length,
        eventTypes: [
          ...new Set(session.events.map((event) => event.type)),
        ].sort(),
        kind: result.kind,
        blocked: blocked.map((line) => ({
          ...line,
          event: JSON.parse(raw.split('\n')[line.line - 1]),
          // Keep the in-memory value visible after JSON has converted it.
          nonFiniteFields: Object.entries(session.events[line.line - 1].payload)
            .filter(
              ([, value]) =>
                typeof value === 'number' && !Number.isFinite(value),
            )
            .map(([field, value]) => ({ field, value: String(value) })),
        })),
      };
    });

    // Opt-in diagnostic evidence; ordinary execution only asserts the contract.
    if (process.env.REPLAY_WRITER_EVIDENCE) {
      writeFileSync(
        process.env.REPLAY_WRITER_EVIDENCE,
        JSON.stringify(corpus, null, 2),
      );
    }
    expect(corpus.filter((game) => game.kind !== 'loaded')).toEqual([]);
  }, 120_000);
});
