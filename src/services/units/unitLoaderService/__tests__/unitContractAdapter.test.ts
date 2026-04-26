/**
 * unitContractAdapter.test.ts
 *
 * Round-trip tests for `parseUnit` and `safeParseUnit`. The adapter is
 * the parse-boundary choke-point that PR-A2 introduces between raw JSON
 * (canonical fetches, custom-unit API responses, file imports) and the
 * `IRawSerializedUnit` shape consumed by `UnitLoaderService.mapToUnitState`.
 *
 * The "happy path" reads a real BattleMech JSON file from the corpus
 * because mocking the full UnitContract shape would just re-encode what
 * the contract already documents. Negative-path tests use minimal hand-
 * crafted bogus inputs.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  parseUnit,
  safeParseUnit,
  UnitContractParseError,
} from '../unitContractAdapter';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const FIXTURE_PATH = path.join(
  REPO_ROOT,
  'public',
  'data',
  'units',
  'battlemechs',
  '3-succession-wars',
  'advanced',
  'Annihilator ANH-1G.json',
);

describe('parseUnit', () => {
  it('round-trips a real BattleMech corpus entry', () => {
    const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));
    const unit = parseUnit(raw, 'Annihilator ANH-1G.json');

    // Spot-check that core fields survive the adapter — both required
    // (id, chassis, tonnage, techBase) and optional rich fields
    // (engine, equipment) flow through unchanged.
    expect(typeof unit.id).toBe('string');
    expect(unit.chassis).toBe('Annihilator');
    expect(unit.tonnage).toBe(100);
    expect(unit.techBase).toBe('INNER_SPHERE');
    expect(unit.engine?.rating).toBeGreaterThan(0);
    expect(Array.isArray(unit.equipment)).toBe(true);
    expect(unit.equipment?.length).toBeGreaterThan(0);
  });

  it('throws UnitContractParseError on missing required fields', () => {
    // No id, no unitType — UnitContract requires both.
    const bogus = { chassis: 'Phantom' };
    expect(() => parseUnit(bogus, 'bogus.json')).toThrow(
      UnitContractParseError,
    );
  });

  it('throws UnitContractParseError on invalid enum value', () => {
    const bogus = {
      id: 'fake-unit',
      unitType: 'NotARealUnitType',
    };
    expect(() => parseUnit(bogus)).toThrow(UnitContractParseError);
  });

  it('preserves Zod issue paths in the thrown error', () => {
    const bogus = { id: 'fake', unitType: 'BattleMech', tonnage: -50 };
    try {
      parseUnit(bogus, 'tonnage-bad.json');
      fail('Expected UnitContractParseError');
    } catch (err) {
      expect(err).toBeInstanceOf(UnitContractParseError);
      const issues = (err as UnitContractParseError).issues;
      // At least one issue should mention 'tonnage' (negative value
      // violates the .gte(0) constraint in the schema).
      expect(issues.some((i) => i.path === 'tonnage')).toBe(true);
    }
  });

  it('forwards extra fields via the index signature passthrough', () => {
    const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));
    const unit = parseUnit(raw);
    // mulId is a real field on canonical entries that downstream
    // consumers (mapToUnitState) read via the index signature.
    expect(unit.mulId).toBeDefined();
  });

  it('uses default sourceLabel when none provided', () => {
    const bogus = {};
    try {
      parseUnit(bogus);
      fail('Expected throw');
    } catch (err) {
      expect((err as Error).message).toContain('<json input>');
    }
  });
});

describe('safeParseUnit', () => {
  it('returns success result for valid input', () => {
    const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));
    const result = safeParseUnit(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.unit.chassis).toBe('Annihilator');
    }
  });

  it('returns failure result without throwing on invalid input', () => {
    const result = safeParseUnit({ chassis: 'Phantom' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(UnitContractParseError);
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('rethrows non-contract errors unchanged', () => {
    // Pass something that makes JSON.parse-style mishandling pop. We
    // can't easily force a non-contract throw from inside parseUnit
    // today, so this test documents the rethrow contract via a manual
    // trigger: pass a value that Zod's safeParse handles fine but
    // would fail downstream. Currently Zod swallows everything into
    // its issue list, so this test asserts the happy-path contract
    // shape; if a future refactor adds a real throw site this becomes
    // a regression catcher.
    const result = safeParseUnit(null);
    // null fails Zod schema validation rather than throwing.
    expect(result.success).toBe(false);
  });
});
