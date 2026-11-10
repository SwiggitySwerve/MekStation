/**
 * S1b matrix row F: the reader gate cannot be skipped by adding a call site.
 *
 *  - Every non-test `fetch(` to `/api/campaigns/...` either sends the reader
 *    header (one helper, counted per site) or is on the allow-list of calls that
 *    neither send nor receive a campaign body, each with its reason.
 *  - Every route that serves or accepts a campaign body imports the gate.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)
    ) {
      out.push(full);
    }
  }
  return out;
}

const rel = (file: string): string =>
  path.relative(SRC, file).split(path.sep).join('/');

/** Calls to campaign routes that carry no campaign body either way. */
const NO_BODY_CALLS: Record<string, string> = {
  'pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx':
    'DELETE: user intent; nothing read or returned',
  'components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage.tsx':
    'DELETE: user intent; nothing read or returned',
  'components/campaign/share/CampaignSharePanelConnected.tsx':
    'grants: share records, no campaign body',
  'lib/campaign/hooks/useCampaignActivityFeed.ts':
    'activity: journal summaries, no campaign body',
  'lib/campaign/encounter/requestLaunchAuthority.ts':
    'launch-authority: owned flag and head, no campaign body',
  'lib/campaign/encounter/readCampaignLaunchHead.ts':
    'head: revision numbers, no campaign body',
  'pages/gameplay/campaigns/index.tsx':
    'GET /api/campaigns: summaries only, no contracts',
};

/**
 * A campaign route URL written as code (a quote or backtick right before it),
 * so a fetch whose URL sits in a variable is still counted. Comments are not.
 */
const CAMPAIGN_FETCH = /[`'"]\/api\/campaigns[/`'"?]/g;

/** Source without block comments and whole-line `//` comments. */
function code(file: string): string {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('reader gate census', () => {
  it('every fetch to a campaign route sends the reader header or is a no-body call', () => {
    const offenders: string[] = [];
    const perSite: Record<string, { fetches: number; headers: number }> = {};
    for (const file of walk(SRC)) {
      const name = rel(file);
      // The routes themselves are the other side of the wire.
      if (
        name.startsWith('pages/api/') ||
        name.startsWith('pages-modules/api/')
      ) {
        continue;
      }
      const text = code(file);
      const fetches = (text.match(CAMPAIGN_FETCH) ?? []).length;
      if (fetches === 0) continue;
      const headers = (text.match(/lifecycleRulesRequestHeaders\(\)/g) ?? [])
        .length;
      if (name in NO_BODY_CALLS) continue;
      perSite[name] = { fetches, headers };
      // One header spread per fetch site, counted: a fifth site without it
      // makes the numbers differ.
      if (fetches !== headers)
        offenders.push(`${name}: ${fetches} fetches, ${headers} headers`);
    }
    expect(offenders).toEqual([]);
    // The persistence store is the one first-party client of the body routes.
    expect(Object.keys(perSite)).toEqual([
      'stores/campaign/useCampaignPersistenceStore.ts',
    ]);
    expect(
      perSite['stores/campaign/useCampaignPersistenceStore.ts'].fetches,
    ).toBe(4);
  });

  it('every no-body allow-list entry still exists and still calls a campaign route', () => {
    for (const name of Object.keys(NO_BODY_CALLS)) {
      expect(
        code(path.join(SRC, name)).match(CAMPAIGN_FETCH)?.length ?? 0,
      ).toBeGreaterThan(0);
    }
  });

  it.each([
    'pages/api/campaigns/[id].ts',
    'pages/api/campaigns/[id]/adopt.ts',
    'pages/api/campaigns/[id]/commands.ts',
    'pages/api/campaigns/redeem.ts',
  ])('the route %s imports and calls the gate', (route) => {
    const text = fs.readFileSync(path.join(SRC, route), 'utf8');
    expect(text).toMatch(/from '@\/pages-modules\/api\/campaignLifecycleGate'/);
    expect(text).toMatch(/refuseCampaignLifecycle\(/);
  });
});
