import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { e2eCombatJournalAuthorityMode } from '@/lib/multiplayer/server/combatJournalAuthorityEnabled';

import { useCampaignE2eEnvironment } from './campaignE2eEnvironment';

const savedCampaign = process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY;
const savedCombat = process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE;
const savedMode = process.env.NEXT_PUBLIC_E2E_MODE;

afterAll(() => {
  if (savedCampaign === undefined) {
    delete process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY;
  } else {
    process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY = savedCampaign;
  }
  if (savedCombat === undefined) {
    delete process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE;
  } else {
    process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE = savedCombat;
  }
  if (savedMode === undefined) {
    delete process.env.NEXT_PUBLIC_E2E_MODE;
  } else {
    process.env.NEXT_PUBLIC_E2E_MODE = savedMode;
  }
});

describe.each([undefined, '', 'enabled'])(
  'campaign env isolation with inherited %s',
  (value) => {
    beforeEach(() => {
      if (value === undefined) {
        delete process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY;
        delete process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE;
      } else {
        process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY = value;
        process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE = value;
      }
      process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    });

    describe('inside the fixture', () => {
      useCampaignE2eEnvironment();

      afterEach(() => {
        // The fixture's earlier afterEach must put back absent, empty and armed values.
        expect(process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY).toBe(
          value,
        );
        expect(process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE).toBe(
          value,
        );
        expect(process.env.NEXT_PUBLIC_E2E_MODE).toBe('true');
      });

      it('disarms the same runtime arm as the blanket prefix deletion', () => {
        expect(
          process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY,
        ).toBeUndefined();
        expect(
          process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE,
        ).toBeUndefined();
        expect(process.env.NEXT_PUBLIC_E2E_MODE).toBe('true');
        expect(e2eCombatJournalAuthorityMode()).toBeNull();
        // Changes during a row must not escape into the next row either.
        process.env.MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY = 'row-mutation';
        process.env.MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE = 'shadow';
      });
    });
  },
);

// Never descend into __tests__: it holds no runtime source, and other suites
// create and delete temp directories there while this scan runs. A recursive
// readdirSync throws ENOENT when one vanishes mid-walk.
function runtimeSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') files.push(...runtimeSourceFiles(full));
    } else if (
      /\.[cm]?[jt]sx?$/.test(entry.name) &&
      !/\.(?:test|spec)\./.test(entry.name)
    ) {
      files.push(full);
    }
  }
  return files;
}

it('fails when runtime source introduces an E2E arm outside the fixture isolation set', () => {
  const names = new Set<string>();
  for (const file of runtimeSourceFiles(path.join(process.cwd(), 'src'))) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bMEKSTATION_E2E_[A-Z0-9_]+\b/g))
      names.add(match[0]);
  }
  expect(
    [...names].filter(
      (name) =>
        ![
          'MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY',
          'MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE',
        ].includes(name),
    ),
  ).toEqual([]);
});
