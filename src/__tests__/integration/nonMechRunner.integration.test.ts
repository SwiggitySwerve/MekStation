import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { IAIPlayer, IAIUnitState } from '@/simulation/ai/IAIPlayer';

import { buildPreparedBattleData } from '@/components/gameplay/pages/preBattleSessionBuilder';
import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import { requireRecordedCustomCombatSnapshot } from '@/engine/InteractiveSession.recovery';
import { COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK } from '@/lib/events/replay/CombatLifecycleBaselineSchemaPack';
import { ReplaySchemaRegistry } from '@/lib/events/replay/ReplaySchemaRegistry';
import { ForceRepository } from '@/services/forces/ForceRepository';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { resetCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { parseCustomCombatDefinition } from '@/services/units/customCombatDefinition';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import {
  listServerCustomCombatRefs,
  readServerCustomCombatDefinition,
} from '@/services/units/serverCustomCombatDefinition';
import { mapAerospaceDefinitionToState } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import { isDefinitionForFamily } from '@/services/units/unitLoaderService/definitionTypes';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { UnitRepository } from '@/services/units/UnitRepository';
import { InvariantRunner } from '@/simulation/invariants/InvariantRunner';
import { SimulationRunner } from '@/simulation/runner/SimulationRunner';
import {
  createInitialState,
  synthesizeGameUnits,
} from '@/simulation/runner/SimulationRunnerState';
import { UnitContract } from '@/types/contracts';
import { customCombatSnapshotSchema } from '@/types/contracts/CustomCombatSnapshot';
import { ForceType } from '@/types/force';
import {
  GameEventType,
  GameSide,
  type IGameCreatedPayload,
  type IGameState,
} from '@/types/gameplay';
import { Era } from '@/types/temporal/Era';
import { deriveState } from '@/utils/gameplay/gameState';
import {
  serializeCustomAerospaceState,
  serializeCustomVehicleState,
} from '@/utils/serialization/CustomUnitSerializer';

const replaySchemas = new ReplaySchemaRegistry({
  events: COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK,
});
const catalog = getNodeCanonicalUnitService();
const refs = ['vehicles:schrek-ppc-carrier', 'aerospace:stuka-stu-k5'];
let repository: UnitRepository;
let denyCustomReads = false;

function load(ref: string) {
  const unit = catalog.getByIdSync(ref);
  if (!unit) throw new Error(`Missing fixture ${ref}`);
  return unit;
}

function savedDefinition(
  family: 'vehicles' | 'aerospace',
  reference = family === 'vehicles' ? refs[0] : refs[1],
) {
  const identity = {
    id: `custom-${family}`,
    chassis: `Saved ${family}`,
    variant: 'UL24',
    era: Era.DARK_AGE,
  };
  if (family === 'vehicles')
    return serializeCustomVehicleState(
      mapToVehicleState(load(reference)),
      identity,
    );
  const definition = UnitContract.parse(load(reference));
  if (!isDefinitionForFamily('aerospace', definition))
    throw new Error('Wrong fixture family');
  return serializeCustomAerospaceState(
    mapAerospaceDefinitionToState(definition),
    identity,
  );
}

const fetchFile: typeof fetch = async (input) => {
  const url = new URL(String(input), 'http://localhost');
  const custom = url.pathname.match(/^\/api\/units\/custom\/(.+)$/);
  if (custom) {
    if (denyCustomReads)
      throw new Error('Live custom definitions are unavailable');
    const record = repository.getById(decodeURIComponent(custom[1]));
    return {
      ok: !!record,
      status: record ? 200 : 404,
      json: async () =>
        record ? { ...record, parsedData: JSON.parse(record.data) } : null,
    } as Response;
  }
  const file = path.join(
    process.cwd(),
    'public',
    decodeURIComponent(url.pathname),
  );
  const ok = fs.existsSync(file);
  return {
    ok,
    status: ok ? 200 : 404,
    json: async () => (ok ? JSON.parse(fs.readFileSync(file, 'utf8')) : null),
  } as Response;
};

beforeEach(() => {
  resetSQLiteService();
  getSQLiteService({ path: ':memory:' }).initialize();
  repository = new UnitRepository();
  denyCustomReads = false;
  resetCanonicalUnitService();
  jest.spyOn(globalThis, 'fetch').mockImplementation(fetchFile);
});
afterEach(() => {
  resetSQLiteService();
  jest.restoreAllMocks();
});

class StationaryShooter implements IAIPlayer {
  evaluateRetreat(): null {
    return null;
  }
  playMovementPhase(): null {
    return null;
  }
  playPhysicalAttackPhase(): null {
    return null;
  }
  playAttackPhase(unit: IAIUnitState, units: readonly IAIUnitState[]) {
    const prefix = unit.unitId.startsWith('player-') ? 'opponent-' : 'player-';
    const target = units.find(
      (other) =>
        other.unitId === prefix + unit.unitId.split('-').at(-1) &&
        !other.destroyed,
    );
    if (!target || !unit.weapons.length) return null;
    const weapon =
      unit.weapons.find((candidate) => candidate.heat > 0) ?? unit.weapons[0];
    return {
      type: GameEventType.AttackDeclared as const,
      payload: {
        attackerId: unit.unitId,
        targetId: target.unitId,
        weapons: [weapon.id],
      },
    };
  }
}

async function duelSession(ref: string, definition?: unknown) {
  const units = [GameSide.Player, GameSide.Opponent].map((side) => ({
    id: `${side}-proof`,
    name: 'Transport proof',
    side,
    unitRef: ref,
    pilotRef: `${side}-pilot`,
    gunnery: 0,
    piloting: 5,
  }));
  const adapted = await Promise.all(
    units.map(async (unit) => {
      const value = await adaptUnit(
        ref,
        { side: unit.side },
        definition === undefined ? undefined : () => definition,
      );
      if (!value) throw new Error('Missing transport fixture');
      return { ...value, id: unit.id };
    }),
  );
  return new GameEngine({ seed: 123, mapRadius: 3, turnLimit: 1 })
    .createInteractiveSession([adapted[0]], [adapted[1]], units)
    .getSession();
}

it.each(['vehicles', 'aerospace'] as const)(
  'admits a saved %s snapshot and strictly revalidates recorded construction',
  async (family) => {
    const saved = savedDefinition(family);
    const reference = `${family}:${saved.id}`;
    const snapshot = parseCustomCombatDefinition(saved, saved.id);
    expect(snapshot).not.toBeNull();
    expect(snapshot).toMatchObject({
      family,
      unitType: saved.unitType,
      armor: saved.armor,
      movement: saved.movement,
    });
    expect(snapshot).not.toHaveProperty(
      family === 'vehicles' ? 'vehicleEditor' : 'aerospaceEditor',
    );
    expect(() =>
      requireRecordedCustomCombatSnapshot(snapshot, reference),
    ).not.toThrow();
    expect(() =>
      requireRecordedCustomCombatSnapshot(
        { ...snapshot, injected: true },
        reference,
      ),
    ).toThrow(/invalid/i);
    expect(() =>
      requireRecordedCustomCombatSnapshot(
        { ...snapshot, movement: { ...saved.movement, injected: true } },
        reference,
      ),
    ).toThrow(/invalid/i);
    expect(() =>
      requireRecordedCustomCombatSnapshot(snapshot, 'custom-wrong'),
    ).toThrow(/identity/i);
    expect(() =>
      requireRecordedCustomCombatSnapshot(
        snapshot,
        `${family === 'vehicles' ? 'aerospace' : 'vehicles'}:${saved.id}`,
      ),
    ).toThrow(/family/i);
    expect(() =>
      requireRecordedCustomCombatSnapshot(
        { ...snapshot, tonnage: 10000 },
        reference,
      ),
    ).toThrow(/invalid/i);
    expect(
      parseCustomCombatDefinition(
        { ...saved, family: family === 'vehicles' ? 'aerospace' : 'vehicles' },
        saved.id,
      ),
    ).toBeNull();
    expect(
      parseCustomCombatDefinition({ ...saved, unitType: 'Infantry' }, saved.id),
    ).toBeNull();
    const adapted = await adaptUnit(reference, {}, () => saved);
    expect(adapted?.customUnitDefinition).toEqual(snapshot);
    expect(adapted?.vehicleInit ?? adapted?.aerospaceInit).toBeDefined();
  },
);

it.each([
  'AerospaceFighter',
  'ConventionalFighter',
  'FixedWingSupport',
  'SmallCraft',
])(
  'retains saved %s construction through snapshot admission',
  async (subType) => {
    const source = catalog
      .getIndexSync({ family: 'aerospace' })
      .map((entry) => load(`aerospace:${entry.id}`))
      .find((unit) => unit.subType === subType);
    if (!source) throw new Error(`Missing subtype fixture ${subType}`);
    const saved = savedDefinition('aerospace', `aerospace:${source.id}`);
    const adapted = await adaptUnit(`aerospace:${saved.id}`, {}, () => saved);
    expect(adapted?.customUnitDefinition).toMatchObject({
      subType,
      structuralIntegrity: saved.structuralIntegrity,
    });
    if (subType === 'SmallCraft')
      expect(adapted?.aerospaceInit?.maxSI).toBe(saved.structuralIntegrity);
  },
);

it('hydrates both native families and records the same native construction in GameCreated', async () => {
  const hydration = new Map(
    refs.map((ref, i) => [
      `player-${i + 1}`,
      {
        runnerUnitId: `player-${i + 1}`,
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit: { ...load(ref), unitRef: ref },
        aiWeapons: [],
      },
    ]),
  );
  const config = {
    seed: 123,
    turnLimit: 4,
    mapRadius: 3,
    unitCount: { player: 2, opponent: 0 },
  };
  const state = createInitialState(config, hydration);
  expect(state.units['player-1'].combatState?.kind).toBe('vehicle');
  expect(state.units['player-2'].combatState?.kind).toBe('aero');
  const units = synthesizeGameUnits(config, hydration);
  expect(units[0].vehicleInit).toBeDefined();
  expect(units[1].aerospaceInit).toBeDefined();
});

it('records the runner aerospace heat total through the same projection as replay', async () => {
  const saved = {
    ...savedDefinition('aerospace'),
    id: 'custom-heat-proof',
    heatSinks: { type: 'SINGLE', count: 0 },
  };
  const session = await duelSession(`aerospace:${saved.id}`, saved);
  const observed = jest.spyOn(InvariantRunner.prototype, 'runAll');
  const runner = await SimulationRunner.fromSession(
    123,
    session,
    () => new StationaryShooter(),
  );
  const result = runner.run({
    seed: 123,
    turnLimit: 1,
    mapRadius: 3,
    unitCount: { player: 1, opponent: 1 },
  });
  const replay = deriveState(
    result.events[0].gameId,
    JSON.parse(JSON.stringify(result.events)),
  );
  for (const unit of Object.values(observed.mock.calls.at(-1)![0].units)) {
    expect(unit.heat).toBeGreaterThan(0);
    expect(replay.units[unit.id].combatState).toEqual(unit.combatState);
  }
});

it('keeps recorded ammunition consumption on native vehicle hits and replay', async () => {
  const prepared = await duelSession('vehicles:scorpion-light-tank');
  // The current adapter reads ammo from Mech critical slots. Explicit recorded
  // bins exercise runner transport independently of that native adapter gap.
  const session = {
    ...prepared,
    units: prepared.units.map((unit) => ({
      ...unit,
      ammoConstruction: [
        {
          binId: 'recorded-ac5',
          weaponType: 'autocannon-5',
          location: 'body',
          maxRounds: 20,
          damagePerRound: 5,
          isExplosive: true,
        },
      ],
    })),
  };
  const observed = jest.spyOn(InvariantRunner.prototype, 'runAll');
  const runner = await SimulationRunner.fromSession(
    123,
    session,
    () => new StationaryShooter(),
  );
  const result = runner.run({
    seed: 123,
    turnLimit: 1,
    mapRadius: 3,
    unitCount: { player: 1, opponent: 1 },
  });
  expect(
    result.events.filter((event) => event.type === GameEventType.AmmoConsumed),
  ).toHaveLength(2);
  const replay = deriveState(
    result.events[0].gameId,
    JSON.parse(JSON.stringify(result.events)),
  );
  for (const unit of Object.values(observed.mock.calls.at(-1)![0].units))
    expect(replay.units[unit.id].ammoState).toEqual(unit.ammoState);
});

it('keeps the recorded BattleMech construction bytes and 21-key shape unchanged', async () => {
  const saved = { ...load('atlas-as7-d'), id: 'custom-byte-atlas' };
  const expected = customCombatSnapshotSchema.strip().parse(saved);
  const adapted = await adaptUnit(saved.id, {}, () => saved);
  if (!adapted) throw new Error('Missing Mech adaptation');
  const session = new GameEngine({ seed: 123 })
    .createInteractiveSession(
      [adapted],
      [],
      [
        {
          id: adapted.id,
          name: 'Atlas',
          side: GameSide.Player,
          unitRef: saved.id,
          pilotRef: 'pilot',
          gunnery: 4,
          piloting: 5,
        },
      ],
    )
    .getSession();
  const recorded = (session.events[0].payload as IGameCreatedPayload).units[0]
    .customUnitDefinition;
  expect(JSON.stringify(recorded)).toBe(JSON.stringify(expected));
  expect(Object.keys(customCombatSnapshotSchema.shape)).toHaveLength(21);
  const sha = crypto
    .createHash('sha256')
    .update(JSON.stringify(recorded))
    .digest('hex');
  // Repinned after #2581 regenerated the Atlas AS7-D catalog entry: the only
  // snapshot change is quirks order (distracting before command_mech), which
  // is the order in the pinned mm-data Atlas AS7-D.mtf.
  expect(sha).toBe(
    'cdae21a4bd666705bcce2957dcefd5a7f3a84a4519dab403c89da57e04201061',
  );
  const runner = await SimulationRunner.fromSession(
    123,
    session,
    () => new StationaryShooter(),
  );
  const result = runner.run({
    seed: 123,
    turnLimit: 1,
    mapRadius: 3,
    unitCount: { player: 1, opponent: 0 },
  });
  const runnerUnit = (result.events[0].payload as IGameCreatedPayload).units[0];
  expect(runnerUnit.unitRef).toBe(saved.id);
  expect(JSON.stringify(runnerUnit.customUnitDefinition)).toBe(
    JSON.stringify(expected),
  );
});

it.each(['catalog', 'saved'] as const)(
  'completes a mixed %s pre-battle -> session -> SimulationRunner skirmish with combat replay agreement',
  async (source) => {
    const unitRefs =
      source === 'catalog'
        ? refs
        : (['vehicles', 'aerospace'] as const).map((family) => {
            const saved = savedDefinition(family);
            if (!saved.chassis) throw new Error('Missing saved chassis');
            const created = repository.create({
              chassis: saved.chassis,
              variant: saved.variant ?? '',
              data: saved,
            });
            if (!created.success || !created.data)
              throw new Error(JSON.stringify(created));
            return `${family}:${created.data.id}`;
          });
    const forces = new ForceRepository();
    const forceIds = ['Player', 'Opponent'].map((name) => {
      const created = forces.createForce({ name, forceType: ForceType.Lance });
      if (!created.id) throw new Error('Could not create force');
      const force = forces.getForceById(created.id)!;
      unitRefs.forEach((unitId, index) =>
        forces.updateAssignment(force.assignments[index].id, { unitId }),
      );
      return created.id;
    });
    const prepared = await buildPreparedBattleData({
      playerForce: forces.getForceById(forceIds[0])!,
      opponentForce: forces.getForceById(forceIds[1])!,
      pilots: [],
    });
    if (source === 'saved') {
      expect(listServerCustomCombatRefs().sort()).toEqual([...unitRefs].sort());
      expect(readServerCustomCombatDefinition(unitRefs[0])).not.toBeNull();
      expect(forces.getForceById(forceIds[0])!.stats.totalBV).toBeGreaterThan(
        0,
      );
    }
    const session = new GameEngine({ seed: 123, mapRadius: 3, turnLimit: 4 })
      .createInteractiveSession(
        prepared.playerAdapted,
        prepared.opponentAdapted,
        prepared.gameUnits,
      )
      .getSession();
    denyCustomReads = source === 'saved';
    if (source === 'saved')
      await expect(
        SimulationRunner.fromSession(123, {
          ...session,
          units: session.units.map(
            ({ customUnitDefinition: _snapshot, ...unit }) => unit,
          ),
        }),
      ).rejects.toThrow(/requires recorded/i);
    const observed = jest.spyOn(InvariantRunner.prototype, 'runAll');
    const runner = await SimulationRunner.fromSession(
      123,
      session,
      () => new StationaryShooter(),
    );
    const result = runner.run({
      seed: 123,
      turnLimit: 4,
      mapRadius: 3,
      unitCount: { player: 2, opponent: 2 },
    });
    expect(result.events.at(-1)?.type).toBe(GameEventType.GameEnded);
    const replay = deriveState(
      result.events[0].gameId,
      JSON.parse(JSON.stringify(result.events)),
    );
    const live: IGameState = observed.mock.calls.at(-1)![0];
    expect(
      Object.values(live.units).map((unit) => unit.combatState?.kind),
    ).toEqual(['vehicle', 'aero', 'vehicle', 'aero']);
    for (const unit of Object.values(live.units)) {
      expect(replay.units[unit.id].combatState).toEqual(unit.combatState);
      expect(replay.units[unit.id].armor).toEqual(unit.armor);
      expect(replay.units[unit.id].structure).toEqual(unit.structure);
      expect(replay.units[unit.id].position).toEqual(unit.position);
      expect(replay.units[unit.id].facing).toEqual(unit.facing);
      expect(replay.units[unit.id].heat).toBe(unit.heat);
    }
    const damage = result.events.filter(
      (event) => event.type === GameEventType.DamageApplied,
    );
    expect(damage.some((event) => 'aerospaceState' in event.payload)).toBe(
      true,
    );
    expect(damage.some((event) => !('aerospaceState' in event.payload))).toBe(
      true,
    );
    const created = result.events[0].payload as IGameCreatedPayload;
    expect(
      replaySchemas.upcast(
        GameEventType.GameCreated,
        1,
        JSON.parse(JSON.stringify(created)),
      ).payload,
    ).toEqual(created);
    expect(created.units.map((unit) => unit.unitRef)).toEqual([
      ...unitRefs,
      ...unitRefs,
    ]);
    if (source === 'saved')
      expect(
        created.units.every((unit) => unit.customUnitDefinition !== undefined),
      ).toBe(true);
    const repeated = await SimulationRunner.fromSession(
      123,
      JSON.parse(JSON.stringify(session)),
      () => new StationaryShooter(),
    );
    const rerun = repeated.run({
      seed: 123,
      turnLimit: 4,
      mapRadius: 3,
      unitCount: { player: 2, opponent: 2 },
    });
    expect(
      rerun.events.map((event) => [event.type, event.turn, event.payload]),
    ).toEqual(
      result.events.map((event) => [event.type, event.turn, event.payload]),
    );
  },
);

it('invalidates the prior Mech-only construction parser fingerprint', () => {
  const previous = new ReplaySchemaRegistry({
    events: COMBAT_LIFECYCLE_BASELINE_SCHEMA_PACK.map((event) => ({
      ...event,
      schemas: event.schemas.map((schema) => ({
        ...schema,
        schemaId:
          event.eventType === GameEventType.GameCreated
            ? 'combat.game_created.v1.custom-construction-1.quick-meta-1'
            : schema.schemaId,
      })),
    })),
  });
  const created = [{ eventType: GameEventType.GameCreated, schemaVersion: 1 }];
  expect(replaySchemas.fingerprintPipeline(created)).not.toBe(
    previous.fingerprintPipeline(created),
  );
  const unchanged = [
    { eventType: GameEventType.TurnStarted, schemaVersion: 1 },
  ];
  expect(replaySchemas.fingerprintPipeline(unchanged)).toBe(
    previous.fingerprintPipeline(unchanged),
  );
});
