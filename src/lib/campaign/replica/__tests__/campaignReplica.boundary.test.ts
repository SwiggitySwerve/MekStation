/**
 * Import-boundary contract for the campaign replica store (task 2.3).
 *
 * Production sources write only campaign-replica streams. They must not
 * import a source-side campaign event store, must not mutate grants,
 * and must not read the system clock.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const REPLICA_DIR = 'src/lib/campaign/replica';

/**
 * Walks non-test TypeScript sources under the replica folder.
 */
function runtimeSourceFiles(): readonly string[] {
  const files: string[] = [];
  /** Recurses one directory, skipping test and fixture folders. */
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== '__fixtures__') {
          walk(full);
        }
      } else if (entry.name.endsWith('.ts')) {
        files.push(full);
      }
    }
  }
  walk(path.join(process.cwd(), REPLICA_DIR));
  return files;
}

describe('campaign replica import boundary', () => {
  it('scans a non-empty runtime surface', () => {
    expect(runtimeSourceFiles().length).toBeGreaterThanOrEqual(6);
  });

  it('contains no Date.now or new Date in production replica sources', () => {
    const offenders: string[] = [];
    const tokens: readonly RegExp[] = [/Date\.now/, /new Date\(/];
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      for (const token of tokens) {
        if (token.test(text)) {
          offenders.push(`${path.basename(file)}: ${token}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not import source-side writers or grant-store mutation', () => {
    const offenders: string[] = [];
    const forbidden: readonly { name: string; token: RegExp }[] = [
      { name: 'JournalCampaignEventStore', token: /JournalCampaignEventStore/ },
      {
        name: 'appendCampaignCommandBatch',
        token: /appendCampaignCommandBatch/,
      },
      { name: 'CAMPAIGN_STREAM_TYPE', token: /CAMPAIGN_STREAM_TYPE/ },
      { name: 'SQLiteCampaignGrantStore', token: /SQLiteCampaignGrantStore/ },
      { name: 'ICampaignGrantStore', token: /ICampaignGrantStore/ },
      { name: 'issueGrant', token: /\bissueGrant\s*\(/ },
      { name: 'revokeGrant', token: /\brevokeGrant\s*\(/ },
      {
        name: 'source streamType',
        token: /streamType:\s*['"]campaign['"]/,
      },
    ];
    for (const file of runtimeSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      for (const rule of forbidden) {
        if (rule.token.test(text)) {
          offenders.push(`${path.basename(file)}: ${rule.name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('pins campaign-replica as the only journal stream type written', () => {
    const store = fs.readFileSync(
      path.join(process.cwd(), REPLICA_DIR, 'SQLiteCampaignReplicaStore.ts'),
      'utf8',
    );
    expect(store.includes('CAMPAIGN_REPLICA_STREAM_TYPE')).toBe(true);
    expect(store.includes('streamType: CAMPAIGN_REPLICA_STREAM_TYPE')).toBe(
      true,
    );
    expect(store.includes('STRUCTURAL LAW')).toBe(true);
  });
});
