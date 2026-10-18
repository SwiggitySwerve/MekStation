import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { SCENARIO_PACK_MANIFEST } from '../../e2e/scenario-packs/manifest';
import {
  classifyGenesisSource,
  remintPack,
  validateAndCompareFreshStage,
  validateCommittedPayloadStage,
  type RecaptureStageDeps,
} from '../qc/recapture-scenario-pack-stages';

describe('scenario pack recapture dispatch', () => {
  const matchlog = jest.fn();
  const deps: RecaptureStageDeps = {
    validatePayloadAgainstSchemaAndPins: () => ({ ok: true, issues: [] }),
    assertFlowCheckpointInvariant: jest.fn(),
    assertMatchlogSeedAgnosticInvariants: matchlog,
    deriveComparableTransactions: () => [],
    deriveImpliedStartingBalanceCents: () => 0,
    mintScriptPath: '',
    repoRoot: '',
  };

  it.each(['coop-host-review', 'coop-guest-proposal'])(
    'reports %s as unsupported campaign genesis without invoking the combat comparator',
    (id) => {
      matchlog.mockClear();
      const entry = SCENARIO_PACK_MANIFEST.find(
        (candidate) => candidate.id === id,
      )!;
      const genesis = classifyGenesisSource(entry);
      const result = validateCommittedPayloadStage(
        entry,
        {},
        genesis,
        42,
        [],
        deps,
      );
      expect(genesis).toBe('campaign-anchor');
      expect(result?.ok).toBe(false);
      expect(result?.issues.join('\n')).toContain('no sanctioned co-op minter');
      expect(matchlog).not.toHaveBeenCalled();
    },
  );

  it('retains combat match-log validation for encounter anchors', () => {
    matchlog.mockClear();
    const entry = SCENARIO_PACK_MANIFEST.find(
      (candidate) => candidate.id === 'combat-midbattle',
    )!;
    const payload = { events: [] };
    expect(
      validateCommittedPayloadStage(
        entry,
        payload,
        classifyGenesisSource(entry),
        42,
        [],
        deps,
      ),
    ).toBeNull();
    expect(matchlog).toHaveBeenCalledWith(
      payload,
      'combat-midbattle (committed)',
    );
  });

  it('cannot compare an unsupported fresh campaign as deterministic finances', () => {
    const entry = SCENARIO_PACK_MANIFEST.find(
      (candidate) => candidate.id === 'coop-host-review',
    )!;
    const deriveFinances = jest.fn(() => []);
    const result = validateAndCompareFreshStage({
      entry,
      genesisClass: classifyGenesisSource(entry),
      committedRaw: {},
      freshRaw: {},
      freshSizeBytes: 42,
      committedSizeBytes: 42,
      provenanceBackup: { absolutePath: '', existed: false, content: null },
      provenanceAbsolutePath: '',
      issues: [],
      deps: { ...deps, deriveComparableTransactions: deriveFinances },
    });
    expect(result.ok).toBe(false);
    expect(result.issues.join('\n')).toContain(
      'unsupported campaign-anchor genesis',
    );
    expect(deriveFinances).not.toHaveBeenCalled();
  });
});
describe('per-pack failure diagnostics', () => {
  it('retains distinct failed invocation output and browser artifacts across packs', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-recapture-'));
    const script = path.join(root, 'mint.mjs');
    fs.writeFileSync(
      script,
      `
      import fs from 'node:fs';
      const output = process.argv[process.argv.indexOf('--output') + 1];
      fs.mkdirSync(output, {recursive:true});
      fs.writeFileSync(output + '/error-context.md', process.argv[2]);
      console.log('stdout ' + process.argv[2]);
      console.error('PUT 404 ' + process.argv[2]);
      process.exitCode = 1;
    `,
    );
    const stdout = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const stderr = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    try {
      for (const entry of SCENARIO_PACK_MANIFEST.slice(0, 2)) {
        const artifacts = path.join(root, entry.id);
        fs.mkdirSync(artifacts);
        const result = remintPack(
          entry,
          path.join(root, 'missing.json'),
          42,
          [],
          {
            repoRoot: root,
            mintScriptPath: script,
          } as RecaptureStageDeps,
          artifacts,
        );
        expect(result?.ok).toBe(false);
      }
      for (const entry of SCENARIO_PACK_MANIFEST.slice(0, 2)) {
        const artifacts = path.join(root, entry.id);
        expect(
          fs.readFileSync(path.join(artifacts, 'mint.stderr.log'), 'utf8'),
        ).toContain(`PUT 404 ${entry.id}`);
        expect(
          fs.readFileSync(
            path.join(artifacts, 'test-results/error-context.md'),
            'utf8',
          ),
        ).toBe(entry.id);
        expect(
          JSON.parse(
            fs.readFileSync(path.join(artifacts, 'invocation.json'), 'utf8'),
          ),
        ).toMatchObject({ status: 1 });
      }
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
      fs.rmSync(root, { recursive: true });
    }
  });
});
