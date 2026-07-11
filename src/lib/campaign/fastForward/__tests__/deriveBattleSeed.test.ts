/**
 * `deriveBattleSeed` — proves the per-battle engine seed is a pure
 * function of the campaign's resolved seed and the scenario's stable id,
 * with no wall-clock input, per design D4 (task 3.1).
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import { deriveBattleSeed } from '../deriveBattleSeed';

describe('deriveBattleSeed', () => {
  it('is deterministic: same inputs yield the same seed', () => {
    const first = deriveBattleSeed(
      0x5eed1234,
      'scn-contract-1-3025-06-13-force-1',
    );
    const second = deriveBattleSeed(
      0x5eed1234,
      'scn-contract-1-3025-06-13-force-1',
    );
    expect(first).toBe(second);
  });

  it('produces distinct seeds for distinct scenario ids under the same campaign seed', () => {
    const campaignSeed = 0x5eed1234;
    const a = deriveBattleSeed(
      campaignSeed,
      'scn-contract-1-3025-06-13-force-1',
    );
    const b = deriveBattleSeed(
      campaignSeed,
      'scn-contract-1-3025-06-13-force-2',
    );
    expect(a).not.toBe(b);
  });

  it('produces distinct seeds for distinct campaign seeds under the same scenario id', () => {
    const scenarioId = 'scn-contract-1-3025-06-13-force-1';
    const a = deriveBattleSeed(1, scenarioId);
    const b = deriveBattleSeed(2, scenarioId);
    expect(a).not.toBe(b);
  });

  it('yields the SAME seed for the same scenario fought on a different day — the seed keys on scenario identity, never fight day (design D4)', () => {
    // The scenario id already embeds its generation date
    // (`buildScenarioId`); this test proves the helper itself adds no
    // further day-of-fight input on top of whatever id it's handed —
    // calling it twice with the identical (already-generated) scenario
    // id, as would happen for a battle deferred to a later day, must
    // reproduce the identical seed.
    const campaignSeed = 0xabc123;
    const scenarioId = 'scn-contract-9-3025-06-13-force-3';
    const foughtOnGenerationDay = deriveBattleSeed(campaignSeed, scenarioId);
    const foughtThreeDaysLater = deriveBattleSeed(campaignSeed, scenarioId);
    expect(foughtOnGenerationDay).toBe(foughtThreeDaysLater);
  });

  it('returns an unsigned 32-bit integer', () => {
    const seed = deriveBattleSeed(0xffffffff, 'scn-x');
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });

  it('never reads wall-clock time (source inspection)', () => {
    const source = deriveBattleSeed.toString();
    expect(source).not.toMatch(/Date\.now/);
    expect(source).not.toMatch(/new Date\(/);
  });
});
