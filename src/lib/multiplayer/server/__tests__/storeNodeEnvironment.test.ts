import { readFileSync } from 'node:fs';
import path from 'node:path';

import { setTestNodeEnv } from './storeNodeEnvironment';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  setTestNodeEnv(originalNodeEnv);
});

it.each([undefined, '', 'test', 'development', 'production', 'custom'])(
  'sets and restores the exact NODE_ENV value %s without changing store overrides',
  (value) => {
    const matchOverride = process.env.MULTIPLAYER_STORE;
    const campaignOverride = process.env.CAMPAIGN_EVENT_STORE;
    const dbPath = process.env.MULTIPLAYER_DB_PATH;

    setTestNodeEnv(value);
    expect(process.env.NODE_ENV).toBe(value);
    const saved = process.env.NODE_ENV;
    setTestNodeEnv('test-row');
    setTestNodeEnv(saved);

    expect(process.env.NODE_ENV).toBe(value);
    expect(process.env.MULTIPLAYER_STORE).toBe(matchOverride);
    expect(process.env.CAMPAIGN_EVENT_STORE).toBe(campaignOverride);
    expect(process.env.MULTIPLAYER_DB_PATH).toBe(dbPath);
  },
);

it.each([
  [
    'src/lib/multiplayer/server/getDefaultMatchStore.ts',
    ['MULTIPLAYER_STORE', 'NODE_ENV'],
  ],
  [
    'src/lib/multiplayer/server/getCampaignEventStore.ts',
    ['CAMPAIGN_EVENT_STORE', 'NODE_ENV'],
  ],
  [
    'src/lib/multiplayer/server/DurableMatchStore.ts',
    ['MULTIPLAYER_DB_PATH', 'NEXT_PUBLIC_E2E_MODE', 'PLAYWRIGHT_E2E_RUN_ID'],
  ],
  [
    'src/services/persistence/SQLiteService.ts',
    ['DATABASE_PATH', 'MAX_VERSION_HISTORY'],
  ],
] as const)('keeps runtime env reads explicit in %s', (file, names) => {
  const source = readFileSync(path.join(process.cwd(), file), 'utf8');
  let remainder = source;
  for (const name of names) {
    const namedRead = new RegExp(`\\bprocess\\.env\\.${name}\\b`, 'g');
    expect(source).toMatch(namedRead);
    remainder = remainder.replace(namedRead, 'namedEnvironmentRead');
  }
  // A new named, computed, optional or whole-environment access needs review.
  expect(remainder).not.toMatch(
    /\bprocess\s*(?:(?:\?\.)?\s*\.\s*env\b|\?\.\s*env\b|\[\s*['"]env['"]\s*\])/,
  );
});
