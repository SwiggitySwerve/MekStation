import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const ownerUrl = pathToFileURL(
  path.resolve('scripts/qc/openspec-active-change-ledger.mjs'),
).href;
// Migration baseline from 4d20a248e69e67dfad40f115e4c949d131505684. Later legacy-only additions remain supported.
const migratedChangeNames = [
  'fix-per-turn-movement-reset',
  'fix-campaign-outcome-ledgers',
  'align-ci-budget-workflow-contracts',
  'harden-gm-two-player-campaign-sessions',
  'add-cross-stream-effect-receipts',
  'add-authoritative-history-branches',
  'add-saved-custom-unit-campaign-roster',
  'prove-saved-custom-unit-campaign-journey',
  'design-vault-campaign-separation-and-maps',
  'design-campaign-authority-and-sync',
  'adopt-combat-journal-cutover-and-gm-rewind',
  'enable-saved-custom-unit-combat',
  'establish-all-unit-data-parity',
  'reject-incomplete-combat-vehicle-handler-weight',
  'repair-mtf-adapter-vocabulary',
  'validate-combat-omni-turret-mechanisms',
  'preserve-combat-vehicle-turret-source-facts',
  'align-source-armor-and-case-validity',
  'repair-source-critical-topology',
  'remove-dead-ui-hooks',
  'remove-legacy-campaign-overview',
  'fix-pilot-departure-lifecycle',
  'fix-c6a-psr-and-fall-posture',
  'remove-standalone-repair',
  'fix-c6b-stuck-lifecycle',
  'fix-salvage-acceptance-lifecycle',
  'fix-campaign-creation-recovery',
  'fix-client-match-lifecycle',
];

const entry = {
  name: 'example-change',
  status: 'in-progress',
  reason: 'Implementation is awaiting verification.',
  lastReviewed: '2026-11-08',
};

// The CLI module is ESM. Exercise its public functions in Node, without
// importing environment-sensitive CLI entry points into the Jest graph.
function invoke(operation: string, ...args: unknown[]) {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `const owner = await import(${JSON.stringify(ownerUrl)});
       const {operation, args} = JSON.parse(process.argv[1]);
       try { console.log(JSON.stringify({ok: true, value: owner[operation](...args)})); }
       catch (error) { console.log(JSON.stringify({ok: false, error: error.message})); }`,
      JSON.stringify({ operation, args }),
    ],
    { encoding: 'utf8' },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as {
    ok: boolean;
    value?: unknown;
    error?: string;
  };
}

describe('active OpenSpec change ledger formats', () => {
  it('normalizes a colocated entry without changing field bytes', () => {
    expect(
      invoke('parseColocatedLedger', JSON.stringify(entry), entry.name),
    ).toEqual({ ok: true, value: entry });
  });

  it.each(['name', 'status', 'reason', 'lastReviewed'])(
    'rejects missing %s in a colocated entry',
    (field) => {
      const incomplete: Record<string, unknown> = { ...entry };
      delete incomplete[field];
      expect(
        invoke('parseColocatedLedger', JSON.stringify(incomplete), entry.name),
      ).toMatchObject({ ok: false });
    },
  );

  it.each([
    ['name', 7],
    ['name', '../escape'],
    ['status', 7],
    ['status', '  '],
    ['reason', null],
    ['reason', ''],
    ['lastReviewed', 7],
    ['lastReviewed', 'yesterday'],
    ['lastReviewed', '2026-02-30'],
    ['lastReviewed', '2026-11-08T00:00:00Z'],
  ])('rejects invalid %s (%s) in either format', (field, value) => {
    const invalid = { ...entry, [field]: value };
    expect(
      invoke('parseColocatedLedger', JSON.stringify(invalid), entry.name),
    ).toMatchObject({ ok: false });
    expect(invoke('reconcileLedgerEntries', [invalid], [])).toMatchObject({
      ok: false,
    });
  });

  it.each(['name', 'status', 'reason', 'lastReviewed'])(
    'rejects missing %s in a legacy entry',
    (field) => {
      const incomplete: Record<string, unknown> = { ...entry };
      delete incomplete[field];
      expect(invoke('reconcileLedgerEntries', [incomplete], [])).toMatchObject({
        ok: false,
      });
    },
  );

  it('rejects a colocated name that differs from the directory', () => {
    expect(
      invoke('parseColocatedLedger', JSON.stringify(entry), 'other-change'),
    ).toMatchObject({ ok: false });
  });

  it.each(['{', '[]', '{}', '{"allowedActiveChanges":{}}'])(
    'rejects a malformed legacy document: %s',
    (text) => {
      expect(invoke('parseLegacyLedger', text)).toMatchObject({ ok: false });
    },
  );

  it.each(['{', '[]', 'null'])(
    'rejects a malformed colocated document: %s',
    (text) => {
      expect(invoke('parseColocatedLedger', text, entry.name)).toMatchObject({
        ok: false,
      });
    },
  );

  it('preserves historical legacy entries for provenance membership checks', () => {
    const historic = { name: entry.name };
    expect(
      invoke(
        'parseLegacyLedger',
        JSON.stringify({ allowedActiveChanges: [historic] }),
      ),
    ).toEqual({ ok: true, value: [historic] });
  });

  it('deduplicates identical cross-format entries and sorts the inventory', () => {
    const second = { ...entry, name: 'another-change' };
    expect(invoke('reconcileLedgerEntries', [entry], [second, entry])).toEqual({
      ok: true,
      value: [second, entry],
    });
  });

  it('rejects conflicting cross-format metadata', () => {
    expect(
      invoke(
        'reconcileLedgerEntries',
        [entry],
        [{ ...entry, reason: 'Different' }],
      ),
    ).toMatchObject({ ok: false });
  });

  it('rejects duplicate legacy names even when metadata matches', () => {
    expect(invoke('reconcileLedgerEntries', [entry, entry], [])).toMatchObject({
      ok: false,
    });
  });

  it('reproduces the migrated legacy inventory in colocated files after normalization', () => {
    const legacy = JSON.parse(
      fs.readFileSync('openspec/active-change-ledger.json', 'utf8'),
    ) as { allowedActiveChanges: Array<typeof entry> };
    const migratedLegacy = legacy.allowedActiveChanges.filter(({ name }) =>
      migratedChangeNames.includes(name),
    );
    const colocated = migratedLegacy.map(({ name }) =>
      JSON.parse(
        fs.readFileSync(
          path.join('openspec/changes', name, '.ledger.json'),
          'utf8',
        ),
      ),
    );
    const original = invoke('reconcileLedgerEntries', migratedLegacy, []);
    const migrated = invoke('reconcileLedgerEntries', [], colocated);
    expect(original.ok).toBe(true);
    expect(migrated).toEqual(original);
    expect(JSON.stringify(migrated.value)).toBe(JSON.stringify(original.value));
  });
});
