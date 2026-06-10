/**
 * Seam tests for audit finding D-10 (2026-06-09 audit, remediation W3.4).
 *
 * Campaign days must be replayable: the campaign carries a persisted
 * `rngSeed` (stamped at creation, survives serialize → deserialize), and
 * daily processors draw their outcome rolls from a seeded stream derived
 * from (campaign seed, day, processor id) instead of raw `Math.random`.
 *
 * Red proof pre-fix: two healing runs from byte-identical state produced
 * different 2d6 medical-check outcomes because the rolls were unseeded.
 */
import { describe, it, expect, afterEach } from '@jest/globals';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IInjury } from '@/types/campaign/Person';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  deserializeCampaign,
  serializeCampaign,
} from '@/stores/campaign/useCampaignStore.persistence';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  createCampaign,
  createDefaultCampaignOptions,
} from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';

import { healingProcessor } from '../healingProcessor';

/** Widened view of the campaign carrying the (new) persisted seed. */
type ISeededCampaign = ICampaign & { readonly rngSeed?: number };

/** Builds the fixed campaign the healing runs replay against. */
function makeCampaign(rngSeed: number): ICampaign {
  return {
    id: 'camp-rng',
    name: 'Determinism Co.',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '3024-12-01T00:00:00Z',
    updatedAt: '3025-06-14T00:00:00Z',
    unitCombatStates: {},
    rngSeed,
  } as ISeededCampaign;
}

/** One healable injury — the 2d6 medical check decides heal vs no-change. */
function makeInjury(id: string): IInjury {
  return {
    id,
    type: 'Broken Bone',
    location: 'Left Arm',
    severity: 2,
    daysToHeal: 30,
    permanent: false,
    acquired: new Date('3025-06-01T00:00:00Z'),
  };
}

/** Builds a wounded patient whose healing outcome is roll-dependent. */
function makePatient(id: string): ICampaignRosterEntry {
  return {
    pilotId: id,
    pilotName: `Patient ${id}`,
    status: CampaignPilotStatus.Wounded,
    wounds: 2,
    recoveryTime: 10,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    hireDate: new Date('3025-01-01'),
    injuries: [makeInjury(`inj-${id}`)],
  };
}

/** Builds the doctor whose presence routes patients onto the 2d6 check. */
function makeDoctor(): ICampaignRosterEntry {
  return {
    pilotId: 'doc-1',
    pilotName: 'Doc Holliday',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    primaryRole: CampaignPersonnelRole.DOCTOR,
    rankIndex: 0,
    hireDate: new Date('3025-01-01'),
    injuries: [],
  };
}

/** Seeds 16 wounded patients + 1 doctor — a 16-way roll-outcome vector. */
function seedRoster(): void {
  const patients = Array.from({ length: 16 }, (_, i) =>
    makePatient(`p${i + 1}`),
  );
  useCampaignRosterStore.setState({
    campaignId: 'camp-rng',
    units: [],
    pilots: [...patients, makeDoctor()],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({ pilots: [] });
}

/** Snapshots the roll-dependent healing outputs per patient. */
function snapshotHealingState(): ReadonlyArray<{
  pilotId: string;
  daysToHeal: number[];
}> {
  return useCampaignRosterStore
    .getState()
    .pilots.filter((p) => p.pilotId !== 'doc-1')
    .map((p) => ({
      pilotId: p.pilotId,
      daysToHeal: (p.injuries ?? []).map((i) => i.daysToHeal),
    }));
}

/** Resets both stores between runs. */
function clearStores(): void {
  useCampaignRosterStore.setState({
    campaignId: null,
    units: [],
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({ pilots: [] });
}

describe('seeded campaign RNG (D-10)', () => {
  afterEach(() => clearStores());

  it('createCampaign stamps an rngSeed that survives the persistence round trip', () => {
    const campaign = createCampaign('Seeded Co.', 'mercenary');
    const seed = (campaign as ISeededCampaign).rngSeed;
    expect(typeof seed).toBe('number');

    const serialized = serializeCampaign(campaign);
    const reloaded = deserializeCampaign(serialized, new Map(), new Map());
    expect((reloaded as ISeededCampaign).rngSeed).toBe(seed);
  });

  it('same campaign state + same seed → identical healing outcomes twice', () => {
    const campaign = makeCampaign(123456789);
    const date = campaign.currentDate;

    seedRoster();
    healingProcessor.process(campaign, date);
    const firstRun = snapshotHealingState();

    clearStores();
    seedRoster();
    healingProcessor.process(campaign, date);
    const secondRun = snapshotHealingState();

    expect(secondRun).toEqual(firstRun);
  });

  it('different campaign seeds produce different healing outcomes', () => {
    const date = new Date('3025-06-15T00:00:00Z');

    seedRoster();
    healingProcessor.process(makeCampaign(1), date);
    const seedOneRun = snapshotHealingState();

    clearStores();
    seedRoster();
    healingProcessor.process(makeCampaign(987654321), date);
    const seedTwoRun = snapshotHealingState();

    expect(seedTwoRun).not.toEqual(seedOneRun);
  });
});
