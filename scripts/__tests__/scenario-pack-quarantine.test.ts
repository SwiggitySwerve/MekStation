import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { SCENARIO_PACK_MANIFEST } from '../../e2e/scenario-packs/manifest';
import {
  SCENARIO_PACK_QUARANTINES,
  validateScenarioPackQuarantines,
  type IQuarantineOwnerUnit,
  type IScenarioPackQuarantine,
} from '../../e2e/scenario-packs/quarantine';
import {
  summarizeRecaptureResults,
  type PackRecaptureResult,
} from '../qc/recapture-scenario-pack-stages';

// Adding a new exception requires an explicit review of this test allowlist.
const ALLOWED_QUARANTINED_PACKS = ['coop-host-review', 'coop-guest-proposal'];
const registered = SCENARIO_PACK_MANIFEST.map((entry) => entry.id);
const ledger = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      'openspec/planning/2026-09-12-roadmap-completion/units.json',
    ),
    'utf8',
  ),
) as { units: IQuarantineOwnerUnit[] };

function assertGuard(
  quarantines: readonly IScenarioPackQuarantine[],
  units = ledger.units,
) {
  for (const quarantine of quarantines) {
    if (!ALLOWED_QUARANTINED_PACKS.includes(quarantine.packId)) {
      throw new Error(
        `Quarantine ${quarantine.packId} is outside the test allowlist`,
      );
    }
  }
  validateScenarioPackQuarantines(quarantines, units, registered);
}

describe('owned scenario-pack quarantine guard', () => {
  it('validates every live quarantine against the actual ledger and diagnosis document', () => {
    expect(() => assertGuard(SCENARIO_PACK_QUARANTINES)).not.toThrow();
    for (const quarantine of SCENARIO_PACK_QUARANTINES) {
      expect(quarantine.reason).toBe(
        'no sanctioned co-op generator/checkpoint contract',
      );
      expect(
        fs.existsSync(path.join(process.cwd(), quarantine.diagnosisDoc)),
      ).toBe(true);
    }
  });

  it.each(['main-verified', 'complete', 'archived'])(
    'expires when the owner is %s',
    (state) => {
      const quarantine = SCENARIO_PACK_QUARANTINES[0];
      expect(() =>
        assertGuard([quarantine], [{ id: quarantine.ownerUnit, state }]),
      ).toThrow(/expired/);
    },
  );

  it('rejects an ownerUnit absent from the ledger', () => {
    expect(() =>
      assertGuard([
        { ...SCENARIO_PACK_QUARANTINES[0], ownerUnit: 'NONEXISTENT' },
      ]),
    ).toThrow(/does not exist/);
  });

  it('rejects quarantine of a registered pack outside the two co-op exceptions', () => {
    expect(() =>
      assertGuard([
        {
          ...SCENARIO_PACK_QUARANTINES[0],
          packId: 'combat-midbattle',
        } as unknown as IScenarioPackQuarantine,
      ]),
    ).toThrow(/outside the test allowlist/);
  });

  it('rejects duplicate quarantine records', () => {
    expect(() =>
      assertGuard([SCENARIO_PACK_QUARANTINES[0], SCENARIO_PACK_QUARANTINES[0]]),
    ).toThrow(/Duplicate quarantine/);
  });

  it('does not turn any non-quarantined failure green', () => {
    const quarantine: PackRecaptureResult = {
      packId: 'coop-host-review',
      status: 'QUARANTINED',
      ok: false,
      issues: [],
      committedSizeBytes: 1,
      freshSizeBytes: null,
      quarantine: SCENARIO_PACK_QUARANTINES[0],
    };
    const passed: PackRecaptureResult = {
      packId: 'navigation-briefing',
      status: 'PASS',
      ok: true,
      issues: [],
      committedSizeBytes: 1,
      freshSizeBytes: 1,
    };
    const failed: PackRecaptureResult = {
      ...passed,
      status: 'FAIL',
      ok: false,
      issues: ['schema pin mismatch'],
    };
    expect(summarizeRecaptureResults([passed, quarantine])).toEqual({
      passed: 1,
      failed: 0,
      quarantined: 1,
      total: 2,
      ok: true,
    });
    expect(summarizeRecaptureResults([failed, quarantine])).toEqual({
      passed: 0,
      failed: 1,
      quarantined: 1,
      total: 2,
      ok: false,
    });
  });

  it('keeps quarantines listed in CLI JSON without claiming PASS or invoking a minter', () => {
    const output = execFileSync(
      process.execPath,
      [
        'scripts/qc/recapture-scenario-packs.mjs',
        '--pack',
        'coop-host-review,coop-guest-proposal',
        '--json',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    const report = JSON.parse(output.slice(output.indexOf('{\n  "results":')));
    expect(report.summary).toEqual({
      passed: 0,
      failed: 0,
      quarantined: 2,
      total: 2,
      ok: true,
    });
    expect(report.results).toHaveLength(2);
    for (const result of report.results) {
      expect(result).toMatchObject({
        status: 'QUARANTINED',
        ok: false,
        freshSizeBytes: null,
        quarantine: {
          ownerUnit: 'P2J',
          reason: 'no sanctioned co-op generator/checkpoint contract',
        },
      });
    }
    expect(output).toContain('2 QUARANTINED');
    expect(output).not.toContain('[mint-scenario-pack] minting');
  });
});
