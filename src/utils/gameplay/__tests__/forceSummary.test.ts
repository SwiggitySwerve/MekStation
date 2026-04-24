/**
 * Tests for forceSummary utilities.
 *
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/after-combat-report/spec.md
 */

import { GameSide } from '@/types/gameplay';

import {
  DEFAULT_GUNNERY,
  DEFAULT_PILOTING,
  deriveForceSummary,
  type IForceSummaryUnitInput,
} from '../forceSummary';

const baseUnit = (
  overrides: Partial<IForceSummaryUnitInput> = {},
): IForceSummaryUnitInput => ({
  unitId: 'u-1',
  designation: 'Wasp WSP-1A',
  battleValue: 1820,
  tonnage: 45,
  heatSinks: 10,
  heatSinkType: 'single',
  gunnery: 4,
  piloting: 5,
  weapons: [],
  spas: [],
  ...overrides,
});

describe('deriveForceSummary', () => {
  it('returns zeroed summary for empty force', () => {
    const summary = deriveForceSummary({
      side: GameSide.Player,
      units: [],
    });
    expect(summary.totalBV).toBe(0);
    expect(summary.totalTonnage).toBe(0);
    expect(summary.heatDissipation).toBe(0);
    expect(summary.avgGunnery).toBe(0);
    expect(summary.avgPiloting).toBe(0);
    expect(summary.weaponDamagePerTurnPotential).toBe(0);
    expect(summary.spaSummary).toEqual([]);
    expect(summary.unitCount).toBe(0);
    expect(summary.warnings).toEqual([]);
  });

  it('aggregates BV across two mechs', () => {
    const summary = deriveForceSummary({
      side: GameSide.Player,
      units: [
        baseUnit({ unitId: 'u-1', battleValue: 1820 }),
        baseUnit({ unitId: 'u-2', battleValue: 2100 }),
      ],
    });
    expect(summary.totalBV).toBe(3920);
    expect(summary.unitCount).toBe(2);
  });

  it('aggregates tonnage across two mechs', () => {
    const summary = deriveForceSummary({
      side: GameSide.Player,
      units: [
        baseUnit({ unitId: 'u-1', tonnage: 45 }),
        baseUnit({ unitId: 'u-2', tonnage: 55 }),
      ],
    });
    expect(summary.totalTonnage).toBe(100);
  });

  it('mixes single and double heat sinks correctly (12 single + 14 double = 40)', () => {
    const summary = deriveForceSummary({
      side: GameSide.Player,
      units: [
        baseUnit({ unitId: 'u-1', heatSinks: 12, heatSinkType: 'single' }),
        baseUnit({ unitId: 'u-2', heatSinks: 14, heatSinkType: 'double' }),
      ],
    });
    expect(summary.heatDissipation).toBe(12 + 28);
  });

  it('averages pilot gunnery and piloting (3.5 / 4.5)', () => {
    const summary = deriveForceSummary({
      side: GameSide.Player,
      units: [
        baseUnit({ unitId: 'u-1', gunnery: 4, piloting: 5 }),
        baseUnit({ unitId: 'u-2', gunnery: 3, piloting: 4 }),
      ],
    });
    expect(summary.avgGunnery).toBe(3.5);
    expect(summary.avgPiloting).toBe(4.5);
  });

  it('falls back to default skill (4/5) when pilot is null and emits warning once', () => {
    const summary = deriveForceSummary({
      side: GameSide.Player,
      units: [
        baseUnit({ unitId: 'u-1', gunnery: null, piloting: null }),
        baseUnit({ unitId: 'u-2', gunnery: null, piloting: null }),
      ],
    });
    expect(summary.avgGunnery).toBe(DEFAULT_GUNNERY);
    expect(summary.avgPiloting).toBe(DEFAULT_PILOTING);
    expect(
      summary.warnings.filter((w) => w === 'Unit has no assigned pilot').length,
    ).toBe(1);
  });

  it('sums weapon damage as DPT potential without probability factor', () => {
    const summary = deriveForceSummary({
      side: GameSide.Player,
      units: [
        baseUnit({
          unitId: 'u-1',
          weapons: [{ damage: 5 }, { damage: 10 }, { damage: 15 }],
        }),
        baseUnit({
          unitId: 'u-2',
          weapons: [{ damage: 7 }, { damage: 8 }],
        }),
      ],
    });
    expect(summary.weaponDamagePerTurnPotential).toBe(45);
  });

  it('aggregates SPAs across pilots, deduplicating by spaId', () => {
    const summary = deriveForceSummary({
      side: GameSide.Player,
      units: [
        baseUnit({
          unitId: 'u-1',
          spas: [{ spaId: 'sniper', name: 'Sniper' }],
        }),
        baseUnit({
          unitId: 'u-2',
          spas: [
            { spaId: 'sniper', name: 'Sniper' },
            { spaId: 'marksman', name: 'Marksman' },
          ],
        }),
      ],
    });
    const sniper = summary.spaSummary.find((s) => s.spaId === 'sniper');
    const marksman = summary.spaSummary.find((s) => s.spaId === 'marksman');
    expect(sniper).toBeDefined();
    expect(sniper!.unitIds).toEqual(['u-1', 'u-2']);
    expect(marksman).toBeDefined();
    expect(marksman!.unitIds).toEqual(['u-2']);
    expect(summary.spaSummary).toHaveLength(2);
  });

  it('skips invalid units and emits warning', () => {
    const summary = deriveForceSummary({
      side: GameSide.Player,
      units: [
        baseUnit({ unitId: 'u-1', battleValue: 1000 }),
        baseUnit({ unitId: 'u-bad', battleValue: 999, invalid: true }),
      ],
    });
    expect(summary.totalBV).toBe(1000);
    expect(summary.unitCount).toBe(1);
    expect(summary.warnings).toContain('Force contains unknown units');
  });

  it('preserves the side field on the output', () => {
    const playerSummary = deriveForceSummary({
      side: GameSide.Player,
      units: [baseUnit()],
    });
    expect(playerSummary.side).toBe(GameSide.Player);

    const opponentSummary = deriveForceSummary({
      side: GameSide.Opponent,
      units: [baseUnit()],
    });
    expect(opponentSummary.side).toBe(GameSide.Opponent);
  });

  it('does not throw on empty force (no exception)', () => {
    expect(() =>
      deriveForceSummary({ side: GameSide.Player, units: [] }),
    ).not.toThrow();
  });

  // =============================================================================
  // Force Config Stability (game-session-management § Force Config
  // Stability). Emitted summaries SHALL be immutable snapshots — mutating
  // one SHALL NOT affect the source or a subsequent derivation.
  // =============================================================================
  describe('immutable snapshots (Force Config Stability)', () => {
    it('returns a frozen summary object (cannot be mutated at runtime)', () => {
      const summary = deriveForceSummary({
        side: GameSide.Player,
        units: [baseUnit()],
      });
      expect(Object.isFrozen(summary)).toBe(true);
      // Attempting to mutate a frozen object throws in strict mode
      // (Jest runs tests in strict mode via ESM semantics).
      expect(() => {
        (summary as { totalBV: number }).totalBV = 9999;
      }).toThrow();
    });

    it('returns a frozen spaSummary array (cannot push new entries)', () => {
      const summary = deriveForceSummary({
        side: GameSide.Player,
        units: [
          baseUnit({
            unitId: 'u-1',
            spas: [{ spaId: 'sniper', name: 'Sniper' }],
          }),
        ],
      });
      expect(Object.isFrozen(summary.spaSummary)).toBe(true);
      expect(() => {
        (
          summary.spaSummary as Array<{
            spaId: string;
            name: string;
            unitIds: readonly string[];
          }>
        ).push({ spaId: 'x', name: 'X', unitIds: [] });
      }).toThrow();
    });

    it('mutation of one snapshot does not affect a subsequent derivation on the same input', () => {
      // Spec scenario: "a subsequent onForcesChange emission SHALL
      // reflect the true session state (not the mutated snapshot)".
      const input = {
        side: GameSide.Player,
        units: [
          baseUnit({
            unitId: 'u-1',
            battleValue: 1500,
            spas: [{ spaId: 'sniper', name: 'Sniper' }],
          }),
        ],
      };

      const first = deriveForceSummary(input);

      // Attempt to mutate the first snapshot. Freezing guarantees this
      // throws; we catch so the test still exercises the stability
      // invariant regardless of strict-mode semantics.
      try {
        (
          first.spaSummary as Array<{
            spaId: string;
            name: string;
            unitIds: readonly string[];
          }>
        ).push({ spaId: 'tampered', name: 'Tampered', unitIds: ['u-fake'] });
      } catch {
        /* expected — object is frozen */
      }

      const second = deriveForceSummary(input);

      // Second derivation is a fresh object, untouched by the attempted
      // tampering on `first`.
      expect(second).not.toBe(first);
      expect(second.spaSummary).toHaveLength(1);
      expect(second.spaSummary[0].spaId).toBe('sniper');
      expect(second.totalBV).toBe(1500);
    });

    it('two derivations on the same input are deeply equal (stable snapshots)', () => {
      // Spec scenario: "Deep-equal snapshots across emissions". Same
      // input must produce deeply-equal output so subscribers can rely
      // on referential-stability semantics when nothing changed.
      const input = {
        side: GameSide.Player,
        units: [
          baseUnit({ unitId: 'u-1', battleValue: 1500 }),
          baseUnit({ unitId: 'u-2', battleValue: 2000 }),
        ],
      };
      const first = deriveForceSummary(input);
      const second = deriveForceSummary(input);
      expect(second).toEqual(first);
    });
  });
});
