import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const contractUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.contract.mjs'),
).href;
const harness = `
import fs from 'node:fs';
import * as contract from ${JSON.stringify(contractUrl)};
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
const frozen = (value) => !value || typeof value !== 'object' ||
  (Object.isFrozen(value) && Object.values(value).every(frozen));
try {
  const value = request.fn === '__frozen'
    ? [contract.WAVE_CONTRACTS, contract.CAPTURE_CONTRACTS, contract.PROGRAM_CHILD_CHANGES].every(frozen)
    : contract[request.fn](...(request.args ?? []));
  process.stdout.write(JSON.stringify({ ok: true, value }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
}`;

type Invocation = { ok: boolean; value?: unknown; error?: string };
type WaveRow = Record<string, unknown> & {
  wave: string;
  commandId: string;
  childChange: string;
  runRootTemplate: string;
  commandSequence: string[][];
  canonicalArgvDigest: string;
  artifacts: string[];
  assertions: string[];
  predecessors: string[];
  capSubject: string;
  maxFiles: number | null;
  maxChangedLines: number | null;
  reporterContracts: Array<Record<string, unknown>>;
};
type ContractSnapshot = {
  receiptSchema: string;
  repositoryIdentity: Record<string, unknown>;
  programChildChanges: string[];
  captureContracts: Record<string, unknown[]>;
  waveContracts: Record<string, WaveRow>;
};

function invoke(fn: string, args: unknown[] = []): Invocation {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { input: JSON.stringify({ fn, args }), encoding: 'utf8' },
  );
  if (!result.stdout)
    throw new Error(result.stderr || 'contract emitted no result');
  return JSON.parse(result.stdout) as Invocation;
}

function snapshot(): ContractSnapshot {
  const result = invoke('contractSnapshot');
  expect(result).toMatchObject({ ok: true });
  return result.value as ContractSnapshot;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function argvDigest(sequence: string[][]): string {
  return createHash('sha256').update(JSON.stringify(sequence)).digest('hex');
}

describe('CAMP-01 authority receipt immutable contract', () => {
  it('freezes the complete registry and validates all twelve reviewed digests', () => {
    const contract = snapshot();
    expect(invoke('__frozen')).toEqual({ ok: true, value: true });
    expect(Object.keys(contract.waveContracts)).toHaveLength(12);
    for (const row of Object.values(contract.waveContracts))
      expect(argvDigest(row.commandSequence)).toBe(row.canonicalArgvDigest);
    expect(invoke('assertFixedContract', [contract])).toEqual({
      ok: true,
      value: true,
    });
  });

  it('pins repository, child, capture, and F/G/H reporter identities', () => {
    const contract = snapshot();
    // prettier-ignore
    expect(contract.repositoryIdentity).toEqual({ repositoryId: 1014984218, nodeId: 'R_kgDOPH9uGg', nameWithOwner: 'SwiggitySwerve/MekStation', baseRef: 'main', fetchUrl: 'https://github.com/SwiggitySwerve/MekStation.git' });
    expect(contract.programChildChanges).toHaveLength(10);
    expect(Object.keys(contract.captureContracts)).toEqual([
      'camp-01e',
      'camp-01h',
    ]);
    expect(
      contract.waveContracts['camp-01f'].reporterContracts[0],
    ).toMatchObject({ reporterId: 'camp01-campaign-persistence-reporter/v1' });
    expect(
      contract.waveContracts['camp-01g'].reporterContracts[0],
    ).toMatchObject({ reporterId: 'camp01-mech-bay-authority-reporter/v1' });
    expect(contract.waveContracts['camp-01h'].reporterContracts).toHaveLength(
      6,
    );
  });

  // prettier-ignore
  const fixedDrifts: Array<[string, (value: ContractSnapshot) => void]> = [
    ['unknown row field', (c) => Object.assign(c.waveContracts['camp-01a'], { extra: true })],
    ['missing row field', (c) => delete c.waveContracts['camp-01a'].assertions],
    ['unknown wave id', (c) => Object.assign(c.waveContracts, { unknown: clone(c.waveContracts['camp-01a']) })],
    ['executable token', (c) => { c.waveContracts['camp-01a'].commandSequence[0][0] = 'node'; }],
    ['shell chaining', (c) => { c.waveContracts['camp-01a'].commandSequence[0].push('&&'); }],
    ['command order', (c) => { c.waveContracts['camp-01h'].commandSequence.reverse(); }],
    ['run root', (c) => { c.waveContracts['camp-01a'].runRootTemplate = '../escape-<sha>'; }],
    ['capture invocation', (c) => { (c.captureContracts['camp-01e'][0] as Record<string, unknown>).invocationId = 'other'; }],
    ['F reporter', (c) => { c.waveContracts['camp-01f'].reporterContracts[0].reportSchema = 'other/v1'; }],
    ['G reporter', (c) => { c.waveContracts['camp-01g'].reporterContracts[0].normalizedPath = 'other.json'; }],
    ['H witness', (c) => { c.waveContracts['camp-01h'].reporterContracts[0].witnessLabel = 'other'; }],
    ['program child', (c) => { c.programChildChanges.pop(); }],
    ['predecessor', (c) => { c.waveContracts['camp-01d'].predecessors = []; }],
    ['cap', (c) => { c.waveContracts['camp-01d'].maxFiles = null; }],
    ['bootstrap ref', (c) => { c.waveContracts['camp-proof'].bootstrapProductRef = 'refs/heads/other'; }],
    ['artifact set', (c) => { c.waveContracts['camp-01h'].artifacts.pop(); }],
  ];

  it.each(fixedDrifts)('rejects fixed %s drift', (_name, mutate) => {
    const contract = snapshot();
    mutate(contract);
    expect(invoke('assertFixedContract', [contract])).toMatchObject({
      ok: false,
      error: expect.stringContaining('CAMP01_CONTRACT_INVALID'),
    });
  });

  it('accepts canonical PROOF and H repair declarations', () => {
    for (const kind of ['proof', 'h'] as const) {
      const { declaration, source } = repairFixture(kind);
      expect(invoke('assertRepairDeclaration', [declaration, source])).toEqual({
        ok: true,
        value: `${JSON.stringify(declaration)}\n`,
      });
    }
  });

  // prettier-ignore
  it.each([
    ['missing observation id', (s: any) => { delete s.observationId; }],
    ['dangling failed observation', (s: any) => { s.failedReportObservationId = 'failed-test'; }],
    ['dangling failed fingerprint', (s: any) => { s.failedReportFingerprint = `sha256:${'f'.repeat(64)}`; }],
  ])('rejects repair disposition with %s', (_name, mutate) => {
    const { declaration, source } = repairFixture('proof');
    mutate(declaration.row.sourceDisposition); mutate(source.sourceDisposition);
    expect(invoke('assertRepairDeclaration', [declaration, source]).ok).toBe(false);
  });

  // prettier-ignore
  it.each([
    ['schema', (d: any) => { d.schema = 'other/v1'; }],
    ['unknown declaration field', (d: any) => { d.manifest = {}; }],
    ['derived id', (d: any) => { d.row.wave = d.row.commandId = 'proof-02-repair-' + 'b'.repeat(64); }],
    ['root', (d: any) => { d.row.runRootTemplate = '.sisyphus/evidence/playtest/other-<sha>'; }],
    ['source disposition', (d: any) => { d.row.sourceDisposition.observationId = 'other'; }],
    ['predecessors', (d: any) => { d.row.predecessors.push('alias-chain'); }],
    ['caps', (d: any) => { d.row.maxChangedLines = 501; }],
    ['artifacts', (d: any) => { d.row.artifacts.push('raw-report.json'); }],
    ['commands', (d: any) => { d.row.commandSequence = []; d.row.canonicalArgvDigest = argvDigest([]); }],
    ['bootstrap ref', (d: any) => { d.row.bootstrapProductRef = 'refs/heads/attacker'; }],
    ['non-string predecessor', (d: any) => { d.row.predecessors[0] = 42; }],
    ['non-string artifact', (d: any) => { d.row.artifacts[0] = 42; }],
    ['non-string assertion', (d: any) => { d.row.assertions[0] = 42; }],
    ['non-object reporter', (d: any) => { d.row.reporterContracts = [42]; }], ['reporter source id', (d: any) => { d.row.reporterContracts[0].sourceIds = [42]; }], ['reporter test id', (d: any) => { d.row.reporterContracts[0].requiredTestIds = [42]; }], ['reporter status', (d: any) => { d.row.reporterContracts[0].allowedStatuses = [42]; }], ['reporter witness', (d: any) => { d.row.reporterContracts[0].witnessLabel = 42; }], ['reporter completeness', (d: any) => { d.row.reporterContracts[0].completeObservationSet = 'yes'; }],
  ])('rejects repair %s drift', (_name, mutate) => {
    const { declaration, source } = repairFixture('proof');
    mutate(declaration);
    expect(invoke('assertRepairDeclaration', [declaration, source]).ok).toBe(false);
  });

  it('requires one lexical PROOF cause root with direct terminal aliases', () => {
    const graph = proofGraph();
    expect(invoke('assertProofCauseGraph', [graph])).toEqual({
      ok: true,
      value: true,
    });
    graph[0].primaryObservationId = graph[1].observationId;
    graph[1].primaryObservationId = null;
    expect(invoke('assertProofCauseGraph', [graph]).ok).toBe(false);
  });

  it('rejects PROOF alias chains, multiple roots, and nonterminal roots', () => {
    // prettier-ignore
    const mutations = [(g: any[]) => { g[2].primaryObservationId = g[1].observationId; }, (g: any[]) => { g[1].primaryObservationId = null; }, (g: any[]) => { g[0].outcome = 'lower-severity'; }, (g: any[]) => { g[0].severity = 'minor'; }, (g: any[]) => { g[1].observationId = g[0].observationId; }];
    for (const mutate of mutations) {
      const graph = proofGraph();
      mutate(graph);
      expect(invoke('assertProofCauseGraph', [graph]).ok).toBe(false);
    }
  });

  // prettier-ignore
  it.each([
    ['empty graph', [], 'empty cause graph'],
    ['non-array graph', {}, 'empty cause graph'],
    ['blank observation id', [proofEntry({ observationId: '' })], 'invalid cause entry'],
    ['unknown severity', [proofEntry({ severity: 'blocker' })], 'invalid cause entry'],
    ['non-digest cause fingerprint', [proofEntry({ causeFingerprint: 'c'.repeat(64) })], 'invalid cause fingerprint'],
    ['self-linked root', [proofEntry({ primaryObservationId: 'observation-a' })], 'invalid cause root'],
    ['two-entry cycle without a root', [proofEntry({ outcome: 'not-distinct-cause', primaryObservationId: 'observation-b' }), proofEntry({ observationId: 'observation-b', outcome: 'not-distinct-cause', primaryObservationId: 'observation-a' })], 'invalid cause root'],
    ['non-terminal alias outcome', [proofEntry(), proofEntry({ observationId: 'observation-b', outcome: 'external-blocker', primaryObservationId: 'observation-a' })], 'invalid cause alias'],
    ['nonterminal root on the non-high branch', [proofEntry({ severity: 'low', outcome: 'repair-required' })], 'nonterminal cause root'],
  ])('rejects PROOF cause %s with one exact message', (_name, graph, message) => {
    expect(invoke('assertProofCauseGraph', [graph])).toEqual({ ok: false, error: `CAMP01_CONTRACT_INVALID: ${message}` });
  });

  it('validates every PROOF cause group and not only the first', () => {
    const first = `sha256:${'c'.repeat(64)}`;
    const second = `sha256:${'e'.repeat(64)}`;
    // prettier-ignore
    const graph = [proofEntry({ causeFingerprint: first }), proofEntry({ observationId: 'observation-b', causeFingerprint: first, outcome: 'not-distinct-cause', primaryObservationId: 'observation-a' }), proofEntry({ observationId: 'observation-c', causeFingerprint: second }), proofEntry({ observationId: 'observation-d', causeFingerprint: second, outcome: 'not-distinct-cause', primaryObservationId: 'observation-c' })];
    expect(invoke('assertProofCauseGraph', [graph])).toEqual({
      ok: true,
      value: true,
    });
    const drifted = clone(graph);
    drifted[3].primaryObservationId = null;
    expect(invoke('assertProofCauseGraph', [drifted])).toEqual({
      ok: false,
      error: 'CAMP01_CONTRACT_INVALID: invalid cause root',
    });
  });

  // prettier-ignore
  it.each([
    ['zero', 0],
    ['fractional', 1.5],
    ['non-numeric', '1'],
  ])('rejects an H %s backlog rank with one exact message', (_name, backlogRank) => {
    const graph = [{ findingId: 'finding-a', backlogRank, causeFingerprint: `sha256:${'d'.repeat(64)}`, severity: 'major', outcome: 'repair-required', primaryFindingId: null }];
    expect(invoke('assertHCauseGraph', [graph, 'observation'])).toEqual({ ok: false, error: 'CAMP01_CONTRACT_INVALID: invalid cause rank' });
  });

  it('validates H observation/final roots and rejects phase or graph drift', () => {
    const causeFingerprint = `sha256:${'d'.repeat(64)}`;
    // prettier-ignore
    const graph = [
      { findingId: 'finding-b', backlogRank: 2, causeFingerprint, severity: 'major', outcome: 'repair-required', primaryFindingId: null },
      { findingId: 'finding-a', backlogRank: 3, causeFingerprint, severity: 'major', outcome: 'not-distinct-cause', primaryFindingId: 'finding-b' },
      { findingId: 'finding-c', backlogRank: 4, causeFingerprint, severity: 'minor', outcome: 'not-distinct-cause', primaryFindingId: 'finding-b' },
    ];
    expect(invoke('assertHCauseGraph', [graph, 'observation'])).toEqual({
      ok: true,
      value: true,
    });
    const finalGraph = clone(graph);
    finalGraph[0].outcome = 'verified-repair';
    expect(invoke('assertHCauseGraph', [finalGraph, 'final']).ok).toBe(true);
    // prettier-ignore
    const drifts: Array<['observation' | 'final', (value: any[]) => void]> = [['observation', (g) => { g[0].backlogRank = 5; }], ['observation', (g) => { g[0].outcome = 'verified-repair'; }], ['final', (g) => { g[0].outcome = 'repair-required'; }], ['observation', (g) => { g[1].primaryFindingId = g[1].findingId; }], ['observation', (g) => { g[1].primaryFindingId = null; }], ['observation', (g) => { g[2].primaryFindingId = g[1].findingId; }], ['observation', (g) => { g[0].status = 'failed'; }]];
    for (const [phase, mutate] of drifts) {
      const candidate = clone(graph);
      mutate(candidate);
      expect(invoke('assertHCauseGraph', [candidate, phase]).ok).toBe(false);
    }
  });

  // prettier-ignore
  it.each(['argv', 'environmentValues', 'localPath', 'errorText', 'stack', 'reporterPayload', 'credentials', 'rawId', 'rawUserGameData'])('rejects unsafe retained %s fields', (field) => {
    expect(invoke('assertPrivacyBounded', [{ safe: { [field]: 'secret' } }, field === 'rawUserGameData' ? field : 'camp01-privacy-probe/v1']).ok).toBe(false);
  });
  // prettier-ignore
  it.each(['/home/user/.ssh/id_ed25519', '\\\\server\\share', 'github_pat_secret'])('rejects path or credential value %s', (value) => {
    expect(invoke('assertPrivacyBounded', [{ safe: value }, 'camp01-privacy-probe/v1']).ok).toBe(false);
    expect(invoke('assertPrivacyBounded', [value, 'camp01-privacy-probe/v1']).ok).toBe(false);
  });
});

// prettier-ignore
function repairFixture(kind: 'proof' | 'h') {
  const cause = 'a'.repeat(64), prefix = kind === 'proof' ? 'proof-02-repair' : 'camp-01h-repair';
  const id = `${prefix}-${cause}`;
  const sourceDisposition = { receiptId: `receipt-${'1'.repeat(16)}`, observationId: 'observation-a', failedReportObservationId: null, failedReportFingerprint: null, causeFingerprint: `sha256:${cause}` };
  const commandSequence = [['@npm', 'test', '--', '--runTestsByPath', 'repair.test.ts']]; const reporterContracts = [{ invocationId: 'repair-test', producerId: 'repair-test.mjs', reporterId: 'repair-test/v1', reportSchema: 'repair-test-report/v1', normalizedPath: 'reports/repair-test.json', witnessLabel: 'repair-test', sourceIds: ['repair.test.ts'], requiredTestIds: ['repair test'], allowedStatuses: ['passed'], minimumObservedTests: 1, completeObservationSet: true }];
  const source = { kind, childChange: `repair-${kind}-cause`, causeFingerprint: `sha256:${cause}`, sourceDisposition: clone(sourceDisposition), reporterContracts, explicitDependencies: [] };
  const row: WaveRow = {
    wave: id, commandId: id, childChange: source.childChange,
    runRootTemplate: `.sisyphus/evidence/playtest/${prefix}-${cause}-<sha>`, commandSequence,
    canonicalArgvDigest: argvDigest(commandSequence), artifacts: ['command-result.json', 'receipt-manifest.json', 'wave-result.json'],
    assertions: ['repairVerified===true'], predecessors: kind === 'proof' ? ['proof-02-triage'] : ['camp-01g', 'proof-02-triage', 'proof-02-required-repairs'],
    sourceDisposition, capSubject: 'product-pr', maxFiles: 2, maxChangedLines: 100, reporterContracts,
  }; return { declaration: { schema: 'camp01-repair-row/v1', row }, source };
}

// prettier-ignore
function proofEntry(overrides: Record<string, unknown> = {}) {
  return { observationId: 'observation-a', causeFingerprint: `sha256:${'c'.repeat(64)}`, severity: 'major', outcome: 'repair-required', primaryObservationId: null, ...overrides };
}

// prettier-ignore
function proofGraph() {
  const causeFingerprint = `sha256:${'c'.repeat(64)}`;
  return [
    { observationId: 'observation-a', causeFingerprint, severity: 'major', outcome: 'repair-required', primaryObservationId: null },
    { observationId: 'observation-b', causeFingerprint, severity: 'major', outcome: 'not-distinct-cause', primaryObservationId: 'observation-a' },
    { observationId: 'observation-c', causeFingerprint, severity: 'minor', outcome: 'not-distinct-cause', primaryObservationId: 'observation-a' },
  ];
}
