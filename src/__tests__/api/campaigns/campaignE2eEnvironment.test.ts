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

it('fails when runtime source introduces an E2E arm outside the fixture isolation set', () => {
  const root = path.join(process.cwd(), 'src');
  const names = new Set<string>();
  for (const file of readdirSync(root, { recursive: true, encoding: 'utf8' })) {
    if (
      !/\.[cm]?[jt]sx?$/.test(file) ||
      /(?:^|[/\\])__tests__[/\\]|\.(?:test|spec)\./.test(file)
    )
      continue;
    const source = readFileSync(path.join(root, file), 'utf8');
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
