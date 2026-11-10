/**
 * S1b inert contracts (matrix row K): a contract this build cannot process
 * (rules above the READER level, or an unreadable version) is carried, shown,
 * and never acted on. Every reader asks ONE predicate, `isContractInert`.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import * as fs from 'fs';
import * as path from 'path';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IContract } from '@/types/campaign/Mission';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { selectActiveContracts } from '@/stores/campaign/campaignCommandSelectors';
import { createMissionsStore } from '@/stores/campaign/useMissionsStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { acceptContract } from '../contractMarket';
import { processContracts } from '../contractProcessing';
import { contractProcessor } from '../processors/contractProcessor';
import { applyContractDelta } from '../processors/postBattleProcessor.helpers';
import { applySalvage } from '../processors/salvageProcessor';

function contractWith(
  lifecycleRulesVersion: unknown,
  status = MissionStatus.ACTIVE,
): IContract {
  const base = createContract({
    id: 'contract-1',
    name: 'Inert Test',
    employerId: 'davion',
    targetId: 'liao',
    status,
    endDate: '3025-06-14',
    salvageRights: 'Integrated',
    paymentTerms: createPaymentTerms({
      basePayment: new Money(400),
      failurePayment: new Money(50),
      successPayment: new Money(600),
    }),
  });
  return lifecycleRulesVersion === undefined
    ? base
    : ({ ...base, lifecycleRulesVersion } as IContract);
}

function campaignFor(contract: IContract): ICampaign {
  return {
    ...createCampaign('Inert tests', 'mercenary', { startingFunds: 0 }),
    currentDate: new Date('3025-06-15T00:00:00Z'),
    missions: new Map([[contract.id, contract]]),
  };
}

function outcome(): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: 'match-1',
    contractId: 'contract-1',
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    report: {
      version: 1,
      matchId: 'match-1',
      winner: GameSide.Player,
      reason: 'destruction',
      turnCount: 5,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [],
    capturedAt: '3025-06-15T12:00:00Z',
  };
}

// Newer rules and an unreadable value are inert; absent and 1 are not.
const INERT = [
  ['newer rules (2)', 2],
  ['a far-future version', 9],
  ['an unreadable string', 'two'],
  ['an unreadable zero', 0],
] as const;
const LEGACY = [
  ['absent', undefined],
  ['explicit 1', 1],
] as const;

describe.each(INERT)('an inert contract: %s', (_label, version) => {
  it('is not expired by the day pipeline (no status change, no event)', () => {
    const contract = contractWith(version);
    const campaign = campaignFor(contract);
    const result = processContracts(campaign);
    expect(result.events).toEqual([]);
    expect(result.missions.get('contract-1')).toBe(contract);
    const processed = contractProcessor.process(campaign, campaign.currentDate);
    expect(processed.events).toEqual([]);
    expect(processed.campaign?.missions.get('contract-1')).toBe(contract);
  });

  it('is not closed or paid from the fulfilled queue', () => {
    const contract = contractWith(version);
    const campaign = {
      ...campaignFor(contract),
      currentDate: new Date('3025-01-01T00:00:00Z'),
      pendingFulfilledContractIds: ['contract-1'],
    } as ICampaign;
    const processed = contractProcessor.process(campaign, campaign.currentDate);
    expect(processed.events).toEqual([]);
    expect(processed.campaign?.finances.balance.amount).toBe(
      campaign.finances.balance.amount,
    );
    expect(processed.campaign?.missions.get('contract-1')).toBe(contract);
  });

  it('takes no battle effect: applyContractDelta leaves it alone', () => {
    const contract = contractWith(version);
    const campaign = campaignFor(contract);
    const missions = new Map(campaign.missions);
    expect(applyContractDelta(campaign, missions, outcome())).toBeNull();
    expect(missions.get('contract-1')).toBe(contract);
  });

  it('is skipped by salvage allocation', () => {
    const campaign = campaignFor(contractWith(version));
    const result = applySalvage(outcome(), campaign);
    expect(result.summary.allocationCreated).toBe(false);
    expect(result.summary.skippedReason).toBe('inert-contract');
    expect(result.campaign.salvageAllocations ?? {}).toEqual({});
  });

  it('is not an active contract for scenario generation, morale or the dashboard', () => {
    const campaign = {
      ...campaignFor(contractWith(version)),
      currentDate: new Date('3025-01-01T00:00:00Z'),
    };
    expect(selectActiveContracts(campaign)).toEqual([]);
  });

  it('is not an active contract in the missions store', () => {
    const store = createMissionsStore('c-inert');
    store.getState().addMission(contractWith(version));
    expect(store.getState().getActiveContracts()).toEqual([]);
  });

  it('cannot be accepted from the market', () => {
    const offer = contractWith(version, MissionStatus.PENDING);
    const campaign = { ...campaignFor(offer), missions: new Map() };
    expect(() => acceptContract(campaign, offer)).toThrow(/inert|newer/i);
  });
});

describe.each(LEGACY)('control, a legacy contract: %s', (_label, version) => {
  it('is still expired, battle-effected and listed active', () => {
    const contract = contractWith(version);
    const campaign = campaignFor(contract);
    expect(processContracts(campaign).events).toHaveLength(1);
    expect(
      applyContractDelta(campaign, new Map(campaign.missions), outcome()),
    ).not.toBeNull();
    expect(
      selectActiveContracts({
        ...campaign,
        currentDate: new Date('3025-01-01T00:00:00Z'),
      }),
    ).toHaveLength(1);
    const offer = contractWith(version, MissionStatus.PENDING);
    expect(() =>
      acceptContract({ ...campaign, missions: new Map() }, offer),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Census: every non-test source file that reads contracts by `isContract(` or
// by `MissionStatus.ACTIVE` either asks the predicate or is listed here with
// the reason it does not act on a contract.
// ---------------------------------------------------------------------------
const ALLOWED: Record<string, string> = {
  'types/campaign/Mission.ts': 'defines isContract',
  'types/campaign/Campaign.ts':
    'generic status filter (getMissionsByStatus); no caller acts on a contract through it',
  'types/campaign/enums/MissionStatus.ts': 'defines the status machine',
  'types/campaign/IDailyBattleAuditEntry.ts':
    'read-only audit of status transitions; never writes',
  'lib/campaign/persistence/missionSerialization.ts':
    'carries the contract through load/save unchanged (S1 opaque handling)',
  'lib/campaign/contracts/contractCompletion.ts':
    'pure owner with its own lifecycle policy; no production caller until S2',
  'lib/campaign/fastForward/fastForwardFixture.ts': 'test fixture builder',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.test-helpers.ts')
    ) {
      out.push(full);
    }
  }
  return out;
}

describe('one predicate owner (census)', () => {
  const srcRoot = path.resolve(__dirname, '../../..');

  it('every contract reader asks isContractInert or is allow-listed with a reason', () => {
    const offenders: string[] = [];
    for (const file of walk(srcRoot)) {
      const rel = path.relative(srcRoot, file).split(path.sep).join('/');
      const text = fs.readFileSync(file, 'utf8');
      if (!/isContract\(|MissionStatus\.ACTIVE/.test(text)) continue;
      if (/isContractInert|contractInertReason/.test(text)) continue;
      if (rel in ALLOWED) continue;
      offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('no file outside the owner compares the version against the reader level itself', () => {
    const offenders: string[] = [];
    for (const file of walk(srcRoot)) {
      const rel = path.relative(srcRoot, file).split(path.sep).join('/');
      if (rel === 'types/campaign/ContractLifecycleRules.ts') continue;
      const text = fs.readFileSync(file, 'utf8');
      if (/LIFECYCLE_RULES_READER_MAX\s*[<>=]/.test(text)) offenders.push(rel);
      if (/>\s*LIFECYCLE_RULES_READER_MAX/.test(text)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});
