import type { ISalvageCandidate } from '@/types/campaign/Salvage';

import { createCampaign } from '@/types/campaign/Campaign';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { DamageLevel } from '@/types/campaign/Salvage';

import {
  isSalvageUnitEnrolled,
  salvageAcceptanceStatus,
} from '../salvageAcceptance';

function enrolledCampaign() {
  const campaign = createCampaign('Salvage', 'mercenary');
  return {
    ...campaign,
    forces: new Map([
      [
        'lance',
        {
          id: 'lance',
          name: 'Recovery lance',
          parentForceId: campaign.rootForceId,
          subForceIds: [],
          unitIds: [candidate.unitId],
          forceType: ForceRole.STANDARD,
          formationLevel: FormationLevel.LANCE,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        },
      ],
    ]),
  };
}

const candidate: ISalvageCandidate = {
  source: 'unit',
  unitId: 'recovered-atlas',
  designation: 'Atlas AS7-D',
  destroyedFromBattle: 'battle-1',
  finalStatus: 'crippled',
  damageLevel: DamageLevel.Heavy,
  originalValue: 400_000,
  recoveredValue: 100_000,
  recoveryPercentage: 0.25,
  repairCostEstimate: 300_000,
  disposition: 'mercenary',
  status: 'awarded',
};

it('does not treat an award or recovered damage alone as enrollment', () => {
  const campaign = createCampaign('Salvage', 'mercenary');
  expect(isSalvageUnitEnrolled(campaign, candidate)).toBe(false);
  expect(salvageAcceptanceStatus(campaign, candidate)).toBe('pending');
});

it.each(['awarded', 'declined', 'pending'] as const)(
  'recognizes enrollment in a non-root force despite %s candidate status',
  (status) => {
    const enrolled = enrolledCampaign();
    const item = { ...candidate, status };
    expect(isSalvageUnitEnrolled(enrolled, item)).toBe(true);
    expect(salvageAcceptanceStatus(enrolled, { ...candidate, status })).toBe(
      'accepted',
    );
  },
);

it('recognizes only the owning campaign roster at the decision boundary', () => {
  const campaign = createCampaign('Salvage', 'mercenary');
  const roster = {
    campaignId: campaign.id,
    units: [{ unitId: candidate.unitId }],
  };
  expect(isSalvageUnitEnrolled(campaign, candidate, roster)).toBe(true);
  expect(
    isSalvageUnitEnrolled(campaign, candidate, {
      ...roster,
      campaignId: 'other',
    }),
  ).toBe(false);
});

it('keeps a declined unenrolled unit available for later acceptance', () => {
  expect(
    salvageAcceptanceStatus(createCampaign('Salvage', 'mercenary'), {
      ...candidate,
      status: 'declined',
    }),
  ).toBe('declined');
});

it('preserves the existing parts status mapping even if their donor is enrolled', () => {
  const campaign = createCampaign('Salvage', 'mercenary');
  const enrolled = enrolledCampaign();
  const part = { ...candidate, source: 'part' as const, partId: 'ac20' };
  expect(isSalvageUnitEnrolled(enrolled, part)).toBe(false);
  expect(salvageAcceptanceStatus(campaign, part)).toBe('accepted');
  expect(
    salvageAcceptanceStatus(enrolled, { ...part, status: 'declined' }),
  ).toBe('declined');
});
