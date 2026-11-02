import { readFileSync } from 'fs';
import * as path from 'path';

import { resolveNodeCanonicalUnitStats } from '@/services/forces/ForceRepository.helpers.server';

import { calculateUnitBV, type UnitData } from '../bvAdapter';
import { calculateUnitBV as ownerBV } from '../mechBV/calculator';

const base = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const index: { units: { id: string; path: string }[] } = JSON.parse(
  readFileSync(path.join(base, 'index.json'), 'utf8'),
);
const load = (entry: { path: string }): UnitData =>
  JSON.parse(readFileSync(path.join(base, entry.path), 'utf8'));
const fixture = (id: string) => {
  const entry = index.units.find((unit) => unit.id === id);
  if (!entry) throw new Error(`Missing fixture ${id}`);
  return load(entry);
};

describe('force BV source parity', () => {
  it.each([
    'scorpion-scp-1n',
    'arion-unknown',
    'atlas-as7-d',
    'phoenix-hawk-pxh-1',
  ])('%s retains the editor and gate inputs', (id) => {
    const raw = fixture(id);
    const expected = ownerBV(
      { ...raw, id } as Parameters<typeof ownerBV>[0],
      id,
    ).bv;
    expect(calculateUnitBV(raw)).toBe(expected);
    expect(resolveNodeCanonicalUnitStats(id)?.bv).toBe(expected);
  });

  it('gives every catalog mech a finite positive force BV equal to the gate', () => {
    const failures = index.units.flatMap((entry) => {
      const raw = load(entry);
      const actual = resolveNodeCanonicalUnitStats(entry.id)?.bv;
      const expected = ownerBV(
        raw as Parameters<typeof ownerBV>[0],
        entry.id,
      ).bv;
      return actual !== undefined &&
        Number.isFinite(actual) &&
        actual > 0 &&
        actual === expected &&
        calculateUnitBV(raw) === actual
        ? []
        : [{ id: entry.id, actual, expected }];
    });
    expect(failures).toEqual([]);
  }, 120_000);

  it.each(['engine', 'movement', 'armor', 'heatSinks', 'equipment'])(
    'names a missing %s saved-unit input',
    (field) => {
      const raw = fixture('atlas-as7-d');
      Reflect.deleteProperty(raw, field);
      expect(() => calculateUnitBV(raw)).toThrow(field);
    },
  );

  it.each(['engine', 'gyro', 'structure'] as const)(
    'names a missing nested %s type',
    (field) => {
      const raw = fixture('atlas-as7-d');
      const component = raw[field];
      if (!component) throw new Error(`Missing fixture ${field}`);
      Reflect.deleteProperty(component, 'type');
      expect(() => calculateUnitBV(raw)).toThrow(`${field}.type`);
    },
  );

  it('rejects nonfinite saved-unit inputs', () => {
    const raw = fixture('atlas-as7-d');
    expect(() => calculateUnitBV({ ...raw, tonnage: NaN })).toThrow(/tonnage/i);
  });

  it('retains declared jump movement for saved designs without critical slots', () => {
    const raw = fixture('phoenix-hawk-pxh-1');
    const saved = { ...raw, criticalSlots: undefined };
    expect(calculateUnitBV(saved)).toBe(
      ownerBV(saved as Parameters<typeof ownerBV>[0], raw.id).bv,
    );
  });

  it('rejects a nonfinite result from malformed armor', () => {
    const raw = fixture('atlas-as7-d');
    raw.armor.allocation.HEAD = NaN;
    expect(() => calculateUnitBV(raw)).toThrow(/Invalid BattleMech BV/);
  });

  it('rejects a zero result for an empty saved design', () => {
    const raw = fixture('atlas-as7-d');
    const empty = {
      ...raw,
      tonnage: 0,
      engine: { type: 'FUSION', rating: 0 },
      movement: { walk: 0, jump: 0 },
      armor: { type: 'STANDARD', allocation: {} },
      equipment: [],
      criticalSlots: {},
    };
    expect(() => calculateUnitBV(empty)).toThrow(/Invalid BattleMech BV/);
  });

  it.each(['OmniMech', 'IndustrialMech'])(
    'routes %s saved designs to the mech owner',
    (unitType) => {
      const raw = fixture('atlas-as7-d');
      expect(calculateUnitBV({ ...raw, unitType })).toBe(1897);
    },
  );
});
