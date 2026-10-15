import { readFileSync } from 'node:fs';
import path from 'node:path';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine, InteractiveSession } from '@/engine/GameEngine';
import { resetCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { GameSide, type IGameSession, type IGameUnit } from '@/types/gameplay';

import { DEMO_UNITS } from '../quickGameSetup.helpers';

describe('Quick Play catalog identity and recovery', () => {
  beforeEach(() => {
    resetCanonicalUnitService();
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      const file = path.join(
        process.cwd(),
        'public',
        decodeURIComponent(url.pathname),
      );
      const data: unknown = JSON.parse(readFileSync(file, 'utf8'));
      return { ok: true, status: 200, json: async () => data } as Response;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetCanonicalUnitService();
  });

  it.each(DEMO_UNITS)(
    '$name resolves through the real canonical catalog',
    async (unit) => {
      const adapted = await adaptUnit(unit.sourceUnitId, {
        side: GameSide.Player,
      });
      expect(adapted).not.toBeNull();
      expect(adapted?.weapons.length).toBeGreaterThan(0);
      expect(adapted?.walkMP).toBeGreaterThan(0);
    },
  );

  it('preserves the Locust combat capabilities after serialized session recovery', async () => {
    const locust = DEMO_UNITS.find((unit) => unit.variant === 'LCT-1V');
    if (!locust) throw new Error('Locust demo unit is missing');
    const adapted = await adaptUnit(locust.sourceUnitId, {
      side: GameSide.Player,
    });
    if (!adapted) throw new Error('Locust demo identity does not resolve');
    const id = 'player-locust-instance';
    const gameUnit: IGameUnit = {
      id,
      name: locust.name,
      unitRef: locust.sourceUnitId,
      side: GameSide.Player,
      pilotRef: 'regular-pilot',
      gunnery: 4,
      piloting: 5,
    };
    const live = new GameEngine({
      seed: 42,
      turnLimit: 0,
    }).createInteractiveSession([{ ...adapted, id }], [], [gameUnit]);
    const serialized = JSON.parse(
      JSON.stringify(live.getSession()),
    ) as IGameSession;
    const recovered = await InteractiveSession.fromSessionAsync(serialized);

    expect(recovered.getState().units[id].armor).toEqual(
      live.getState().units[id].armor,
    );
    expect(
      Object.values(recovered.getState().units[id].armor).some(
        (armor) => armor > 0,
      ),
    ).toBe(true);
    expect(recovered.getState().units[id].structure).toEqual(
      live.getState().units[id].structure,
    );
    expect(recovered.getUnitWeapons(id)).toEqual(live.getUnitWeapons(id));
    expect(recovered.getUnitWeapons(id).length).toBeGreaterThan(0);
    expect(recovered.getMovementCapability(id)).toEqual(
      live.getMovementCapability(id),
    );
    expect(recovered.getMovementCapability(id)).toMatchObject({
      walkMP: 8,
      runMP: 12,
      jumpMP: 0,
    });
  });
});
