import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type {
  IUnitCombatState,
  IUnitMaxState,
} from '@/types/campaign/UnitCombatState';

import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { Money } from '@/types/campaign/Money';
import { createInitialCombatState } from '@/types/campaign/UnitCombatState';

import { DayPhase } from '../../dayPipeline';
import { repairProgressProcessor } from '../repairProgressProcessor';

interface ITestPartsInventoryItem {
  readonly inventoryId: string;
  readonly partId: string;
  readonly partName: string;
  readonly quantity: number;
  readonly source: 'salvage' | 'acquisition' | 'manual' | 'repair-return';
  readonly acquiredAt: string;
}

type ICampaignWithRepairProgress = ICampaign & {
  readonly partsInventory?: readonly ITestPartsInventoryItem[];
  readonly repairQueue?: readonly IRepairTicket[];
  readonly unitMaxStates?: Readonly<Record<string, IUnitMaxState>>;
};

const TEST_DATE = new Date('3025-03-01T00:00:00.000Z');

function makeCombatState(): IUnitCombatState {
  return {
    ...createInitialCombatState({
      unitId: 'unit-alpha',
      armorPerLocation: { CT: 10 },
      structurePerLocation: { CT: 6 },
      ammoPerBin: {},
    }),
    currentArmorPerLocation: { CT: 4 },
  };
}

function makeTicket(overrides: Partial<IRepairTicket> = {}): IRepairTicket {
  return {
    ticketId: 'repair-ct-armor',
    unitId: 'unit-alpha',
    kind: 'armor',
    location: 'CT',
    pointsToRestore: 6,
    expectedHours: 4,
    partsRequired: [],
    source: 'combat',
    matchId: 'match-1',
    createdAt: '3025-02-28T00:00:00.000Z',
    status: 'queued',
    ...overrides,
  };
}

function makeCampaign(
  overrides: Partial<ICampaignWithRepairProgress> = {},
): ICampaignWithRepairProgress {
  return {
    id: 'camp-1',
    name: 'Repair Test',
    currentDate: TEST_DATE,
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: TEST_DATE.toISOString(),
    updatedAt: TEST_DATE.toISOString(),
    unitCombatStates: { 'unit-alpha': makeCombatState() },
    unitMaxStates: {
      'unit-alpha': {
        unitId: 'unit-alpha',
        maxArmorPerLocation: { CT: 10 },
        maxStructurePerLocation: { CT: 6 },
        maxAmmoPerBin: {},
      },
    },
    ...overrides,
  };
}

describe('repairProgressProcessor', () => {
  it('registers as unit maintenance work after repair queue creation', () => {
    expect(repairProgressProcessor.id).toBe('repair-progress');
    expect(repairProgressProcessor.phase).toBe(DayPhase.UNITS);
  });

  it('completes an affordable queued armor ticket and restores carried damage', () => {
    const campaign = makeCampaign({ repairQueue: [makeTicket()] });

    const result = repairProgressProcessor.process(campaign, TEST_DATE);
    const updated = result.campaign as ICampaignWithRepairProgress;

    expect(updated.repairQueue?.[0].status).toBe('completed');
    expect(updated.repairQueue?.[0].remainingHours).toBe(0);
    expect(
      updated.unitCombatStates['unit-alpha'].currentArmorPerLocation.CT,
    ).toBe(10);
    expect(result.events.map((event) => event.type)).toContain(
      'repair_completed',
    );
  });

  it('blocks tickets with missing required parts and leaves damage unchanged', () => {
    const ticket = makeTicket({
      partsRequired: [
        { partId: 'standard-armor-plate', quantity: 2, matched: false },
      ],
    });
    const campaign = makeCampaign({
      repairQueue: [ticket],
      partsInventory: [],
    });

    const result = repairProgressProcessor.process(campaign, TEST_DATE);
    const updated = result.campaign as ICampaignWithRepairProgress;

    expect(updated.repairQueue?.[0].status).toBe('parts-needed');
    expect(
      updated.unitCombatStates['unit-alpha'].currentArmorPerLocation.CT,
    ).toBe(4);
    expect(result.events.map((event) => event.type)).toContain(
      'repair_blocked',
    );
  });

  it('consumes matched warehouse parts when repair completes', () => {
    const ticket = makeTicket({
      partsRequired: [
        { partId: 'standard-armor-plate', quantity: 2, matched: false },
      ],
    });
    const campaign = makeCampaign({
      repairQueue: [ticket],
      partsInventory: [
        {
          inventoryId: 'part-bin-1',
          partId: 'standard-armor-plate',
          partName: 'Standard armor plate',
          quantity: 2,
          source: 'salvage',
          acquiredAt: '3025-02-25T00:00:00.000Z',
        },
      ],
    });

    const result = repairProgressProcessor.process(campaign, TEST_DATE);
    const updated = result.campaign as ICampaignWithRepairProgress;

    expect(updated.repairQueue?.[0].status).toBe('completed');
    expect(updated.partsInventory).toEqual([]);
  });
});
