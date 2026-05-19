/**
 * Fully-populated campaign fixture for persistence tests.
 *
 * Builds an `ICampaign` with non-empty `forces` and `missions` maps,
 * `Date` fields, and a finances tree carrying `Money` instances and a
 * dated transaction — the round-trip and integration tests exercise
 * every shape the serializer must handle.
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IMission } from '@/types/campaign/Campaign';
import type { IForce } from '@/types/campaign/Force';

import { createCampaign } from '@/types/campaign/Campaign';
import {
  ForceRole,
  FormationLevel,
  MissionStatus,
} from '@/types/campaign/enums';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

/** A single test force. */
function makeForce(id: string, name: string): IForce {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id,
    name,
    parentForceId: undefined,
    subForceIds: [],
    unitIds: ['unit-a', 'unit-b'],
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: now,
    updatedAt: now,
  };
}

/** A single test mission. */
function makeMission(id: string, name: string): IMission {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id,
    name,
    status: MissionStatus.ACTIVE,
    type: 'mission',
    systemId: 'hesperus-ii',
    scenarioIds: ['scenario-1'],
    description: 'A test mission',
    briefing: 'Brief the test mission',
    startDate: '3025-06-15',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Build a fully-populated campaign with non-empty maps, dated finances,
 * and both `Date` fields set.
 */
export function buildPopulatedCampaign(): ICampaign {
  const base = createCampaign("Wolf's Dragoons", 'mercenary');

  const rootForce = makeForce(base.rootForceId, 'Root Force');
  const subForce = makeForce('force-sub-1', 'Alpha Lance');
  const forces = new Map<string, IForce>([
    [rootForce.id, rootForce],
    [subForce.id, subForce],
  ]);

  const missions = new Map<string, IMission>([
    ['mission-1', makeMission('mission-1', 'Raid on Hesperus II')],
    ['mission-2', makeMission('mission-2', 'Defend New Avalon')],
  ]);

  return {
    ...base,
    currentDate: new Date('3025-07-04T00:00:00.000Z'),
    campaignStartDate: new Date('3025-01-01T00:00:00.000Z'),
    forces,
    missions,
    finances: {
      transactions: [
        {
          id: 'txn-1',
          type: TransactionType.Income,
          amount: new Money(500000),
          date: new Date('3025-06-01T00:00:00.000Z'),
          description: 'Contract advance',
        },
        {
          id: 'txn-2',
          type: TransactionType.Expense,
          amount: new Money(120000),
          date: new Date('3025-06-15T00:00:00.000Z'),
          description: 'Salaries',
        },
      ],
      balance: new Money(380000),
    },
    factionStandings: {},
    description: 'A populated test campaign',
  };
}
