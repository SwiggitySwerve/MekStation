import { SCENARIO_PACK_MANIFEST } from '../../e2e/scenario-packs/manifest';
import {
  classifyGenesisSource,
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
