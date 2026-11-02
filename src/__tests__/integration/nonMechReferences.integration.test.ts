import fs from 'node:fs';
import path from 'node:path';

import { buildPreparedBattleData } from '@/components/gameplay/pages/preBattleSessionBuilder';
import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import { deriveServerAdaptedUnits } from '@/lib/multiplayer/server/matchUnitBootstrap';
import { ForceRepository } from '@/services/forces/ForceRepository';
import { resolveNodeCanonicalUnitStats } from '@/services/forces/ForceRepository.helpers.server';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getCanonicalUnitService,
  resetCanonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { ForceType } from '@/types/force';
import { GameEventType } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateUnitBV } from '@/utils/construction/bvAdapter';
import { deriveState } from '@/utils/gameplay/gameState';
import {
  buildFromSkirmishConfig,
  getSkirmishConfigError,
} from '@/utils/gameplay/preBattleSessionBuilder';

const catalog = getNodeCanonicalUnitService();
const fetchFile: typeof fetch = async (input) => {
  const url = new URL(String(input), 'http://localhost');
  const file = path.join(
    process.cwd(),
    'public',
    decodeURIComponent(url.pathname),
  );
  const ok = fs.existsSync(file);
  // Only the fetch response boundary is replaced; catalog parsing and adaptation are real.
  return {
    ok,
    status: ok ? 200 : 404,
    json: async () => (ok ? JSON.parse(fs.readFileSync(file, 'utf8')) : null),
  } as Response;
};

beforeEach(() => {
  resetCanonicalUnitService();
  resetSQLiteService();
  getSQLiteService({ path: ':memory:' }).initialize();
  jest.spyOn(globalThis, 'fetch').mockImplementation(fetchFile);
});
afterEach(() => {
  resetSQLiteService();
  jest.restoreAllMocks();
});

it('keeps both tomahawk-c force references distinct after save, reload and swap', async () => {
  const repo = new ForceRepository({
    canonicalUnitStatsResolver: resolveNodeCanonicalUnitStats,
  });
  const created = repo.createForce({
    name: 'UL24 collision',
    forceType: ForceType.Lance,
  });
  if (!created.id) throw new Error(created.error);
  const slots = repo.getForceById(created.id)!.assignments;
  repo.updateAssignment(slots[0].id, { unitId: 'tomahawk-c' });
  repo.updateAssignment(slots[1].id, { unitId: 'aerospace:tomahawk-c' });
  const reloaded = new ForceRepository({
    canonicalUnitStatsResolver: resolveNodeCanonicalUnitStats,
  }).getForceById(created.id)!;
  expect(reloaded.assignments.slice(0, 2).map((a) => a.unitId)).toEqual([
    'tomahawk-c',
    'aerospace:tomahawk-c',
  ]);
  const nodeMech = catalog.getByIdSync(reloaded.assignments[0].unitId!);
  const nodeAero = catalog.getByIdSync(reloaded.assignments[1].unitId!);
  expect(nodeMech?.unitType).toBe(UnitType.BATTLEMECH);
  expect(nodeAero?.unitType).toBe(UnitType.AEROSPACE);
  if (!nodeMech || !nodeAero)
    throw new Error('Missing collision catalog fixture');
  const browserAero = await getCanonicalUnitService().getById(
    'aerospace:tomahawk-c',
  );
  expect(browserAero?.unitType).toBe(UnitType.AEROSPACE);
  expect(await getCanonicalUnitService().getById('tomahawk-c')).toMatchObject({
    unitType: UnitType.BATTLEMECH,
  });
  const prepared = await buildPreparedBattleData({
    playerForce: reloaded,
    opponentForce: undefined,
    pilots: [],
  });
  expect(prepared.playerAdapted.map((u) => u.unitType)).toEqual([
    UnitType.BATTLEMECH,
    UnitType.AEROSPACE,
  ]);
  expect(prepared.gameUnits.map((u) => u.unitRef)).toEqual([
    'tomahawk-c',
    'aerospace:tomahawk-c',
  ]);
  const aerospaceBV = adaptUnitFromData(nodeAero).bv;
  if (aerospaceBV === undefined) throw new Error('Missing aerospace BV');
  expect(reloaded.stats.totalBV).toBe(calculateUnitBV(nodeMech) + aerospaceBV);
  expect(reloaded.stats.totalTonnage).toBe(nodeMech.tonnage + nodeAero.tonnage);
  repo.swapAssignments(slots[0].id, slots[1].id);
  expect(
    repo
      .getForceById(created.id)!
      .assignments.slice(0, 2)
      .map((a) => a.unitId),
  ).toEqual(['aerospace:tomahawk-c', 'tomahawk-c']);
});

it('launches a catalog vehicle and fighter on each side through pre-battle and completes with replay', async () => {
  const repo = new ForceRepository({
    canonicalUnitStatsResolver: resolveNodeCanonicalUnitStats,
  });
  const ids = ['Player mixed', 'Opponent mixed'].map((name) => {
    const created = repo.createForce({ name, forceType: ForceType.Lance });
    if (!created.id) throw new Error(created.error);
    const slots = repo.getForceById(created.id)!.assignments;
    repo.updateAssignment(slots[0].id, {
      unitId: 'vehicles:schrek-ppc-carrier',
    });
    repo.updateAssignment(slots[1].id, { unitId: 'aerospace:stuka-stu-k5' });
    return created.id;
  });
  const prepared = await buildPreparedBattleData({
    playerForce: repo.getForceById(ids[0])!,
    opponentForce: repo.getForceById(ids[1])!,
    pilots: [],
  });
  expect(prepared.playerAdapted).toHaveLength(2);
  expect(prepared.opponentAdapted).toHaveLength(2);
  const session = new GameEngine({
    seed: 123,
    mapRadius: 8,
    turnLimit: 12,
  }).runToCompletion(
    prepared.playerAdapted,
    prepared.opponentAdapted,
    prepared.gameUnits,
  );
  expect(session.events.some((e) => e.type === GameEventType.GameEnded)).toBe(
    true,
  );
  expect(
    session.events.some(
      (e) =>
        e.type === GameEventType.DamageApplied && 'aerospaceState' in e.payload,
    ),
  ).toBe(true);
  expect(
    Object.values(session.currentState.units)
      .map((u) => u.combatState?.kind)
      .sort(),
  ).toEqual(['aero', 'aero', 'vehicle', 'vehicle']);
  expect(
    deriveState(session.id, JSON.parse(JSON.stringify(session.events))),
  ).toEqual(session.currentState);
  const recovered = await deriveServerAdaptedUnits(session);
  expect(recovered.map((u) => u.unitType)).toEqual(
    prepared.gameUnits.map((_, i) =>
      i % 2 === 0 ? UnitType.VEHICLE : UnitType.AEROSPACE,
    ),
  );
  console.info(
    'UL24_SKIRMISH',
    JSON.stringify({
      seed: 123,
      turns: session.currentState.turn,
      events: session.events.length,
      refs: session.units.map((u) => u.unitRef),
      replayEqual: true,
    }),
  );
});

it('fails closed on missing force units instead of shifting slots', async () => {
  const repo = new ForceRepository();
  const created = repo.createForce({
    name: 'Missing unit',
    forceType: ForceType.Lance,
  });
  if (!created.id) throw new Error(created.error);
  const force = repo.getForceById(created.id)!;
  repo.updateAssignment(force.assignments[0].id, {
    unitId: 'vehicles:no-such-unit',
  });
  await expect(
    buildPreparedBattleData({
      playerForce: repo.getForceById(created.id)!,
      opponentForce: undefined,
      pilots: [],
    }),
  ).rejects.toThrow(/unit|catalog/i);
});

it('rejects unsupported force references before catalog adaptation', async () => {
  const repo = new ForceRepository();
  const created = repo.createForce({
    name: 'Unsupported force',
    forceType: ForceType.Lance,
  });
  if (!created.id) throw new Error(created.error);
  const force = repo.getForceById(created.id)!;
  repo.updateAssignment(force.assignments[0].id, {
    unitId: 'capital:unsupported',
  });
  await expect(
    buildPreparedBattleData({
      playerForce: repo.getForceById(created.id)!,
      opponentForce: undefined,
      pilots: [],
    }),
  ).rejects.toThrow(/not supported|read.only/i);
});

it('invalidates the qualified cache without evicting an identically named Mech', async () => {
  const service = getCanonicalUnitService();
  const mech = await service.getById('tomahawk-c');
  const aero = await service.getById('aerospace:tomahawk-c');
  expect(aero).not.toBeNull();
  service.invalidateUnit('aerospace:tomahawk-c');
  expect(await service.getById('aerospace:tomahawk-c')).not.toBe(aero);
  expect(await service.getById('tomahawk-c')).toBe(mech);
});

it('rejects conflicting explicit and qualified families', async () => {
  expect(() =>
    catalog.getByIdSync('aerospace:tomahawk-c', { family: 'vehicles' }),
  ).toThrow(/family/i);
  await expect(
    getCanonicalUnitService().getById('aerospace:tomahawk-c', {
      family: 'vehicles',
    }),
  ).rejects.toThrow(/family/i);
  expect(() => catalog.getByIdSync('aerospace:')).toThrow(/id/i);
});

it.each(['capital', 'battlearmor', 'infantry', 'protomechs'])(
  'rejects %s combat before creating a session',
  (family) => {
    const unit = {
      unitId: `${family}:unsupported`,
      designation: 'Unsupported',
      tonnage: 20,
      bv: 0,
      pilot: { pilotId: 'pilot', callsign: 'Pilot', gunnery: 4, piloting: 5 },
    };
    const config = {
      encounterId: 'ul24',
      mapRadius: 8,
      terrainPreset: 'clear',
      player: { units: [unit] },
      opponent: { units: [unit] },
    };
    expect(getSkirmishConfigError(config)).toMatch(
      /not supported|not available|read.only/i,
    );
    expect(() => buildFromSkirmishConfig(config)).toThrow(
      /not supported|not available|read.only/i,
    );
  },
);
