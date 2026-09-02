/**
 * Declared affected families on the campaign intervention preview
 * (umbrella task 16.1).
 *
 * A GM correction has always told you WHAT KIND of correction it is
 * (`correction.family` - time-advance, salvage-allocation, and so on) and
 * WHICH REFS it touched (`changedStateRefs`, opaque `campaign:<id>:<field>`
 * strings). Neither answers the question 16.1 asks, which is what the
 * correction AFFECTS: a reviewer reading `campaign:c1:finances` has to
 * know that `finances` is a money family, and nothing enumerates the set.
 *
 * Pins: a correction touching two domains declares BOTH families; the
 * field-to-family map covers every campaign root field the preview
 * compares, so a field added later cannot slip in unclassified; a
 * correction that changes nothing declares an EMPTY set rather than
 * defaulting to everything; and the letter's families that are not yet
 * derivable are pinned as an explicit residue rather than quietly absent.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

import type { IGmTimeCascadeInterventionState } from '@/types/interventions/GmTimeCascadeInterventionTypes';

import { createCampaign } from '@/types/campaign/Campaign';
import { Money } from '@/types/campaign/Money';

import type { CampaignAffectedFamily } from '../GmCampaignAffectedFamilies';

import {
  CAMPAIGN_AFFECTED_FAMILIES,
  CAMPAIGN_FIELD_FAMILY,
  CAMPAIGN_ROOT_FIELDS,
  UNDERIVABLE_AFFECTED_FAMILIES,
  declareAffectedFamilies,
} from '../GmCampaignAffectedFamilies';
import {
  buildGmTimeCascadeProjectedEffect,
  campaignFieldRef,
} from '../GmTimeCascadePreview';

const CAMPAIGN_ID = 'campaign-families';

const refs = (...fields: string[]): readonly string[] =>
  fields.map((field) => campaignFieldRef(CAMPAIGN_ID, field));

describe('declared affected families', () => {
  it('a correction touching two domains declares BOTH families', () => {
    expect(
      declareAffectedFamilies(CAMPAIGN_ID, refs('finances', 'repairQueue')),
    ).toEqual(['finances', 'repairs']);
  });

  it('declares one family once, however many of its fields moved', () => {
    expect(
      declareAffectedFamilies(
        CAMPAIGN_ID,
        refs('unitMarket', 'personnelMarket', 'contractMarket'),
      ),
    ).toEqual(['markets']);
  });

  it('a correction that changes nothing declares an EMPTY set', () => {
    expect(declareAffectedFamilies(CAMPAIGN_ID, [])).toStrictEqual([]);
  });

  it('every campaign root field the preview compares has a family', () => {
    // The vacuity guard: a root field added to the preview without a
    // family would otherwise be silently unclassified in every preview.
    expect(Object.keys(CAMPAIGN_FIELD_FAMILY).sort()).toEqual(
      [...CAMPAIGN_ROOT_FIELDS].sort(),
    );
    for (const family of Object.values(CAMPAIGN_FIELD_FAMILY)) {
      expect(CAMPAIGN_AFFECTED_FAMILIES).toContain(family);
    }
  });

  it('ignores a ref for another campaign', () => {
    expect(
      declareAffectedFamilies(CAMPAIGN_ID, [
        campaignFieldRef('someone-else', 'finances'),
      ]),
    ).toStrictEqual([]);
  });

  it('ignores a ref that names no known field', () => {
    // toStrictEqual, not toEqual: an unclassified field yields
    // `undefined`, and toEqual would accept `[undefined]` as empty.
    const declared = declareAffectedFamilies(CAMPAIGN_ID, refs('notAField'));
    expect(declared).toStrictEqual([]);
    expect(declared.every((family) => family !== undefined)).toBe(true);
  });

  it('the REAL preview declares the families its own diff found', () => {
    // The end-to-end row: a helper nothing calls would not satisfy 16.1,
    // whose letter is about what the PREVIEW declares.
    const campaign = createCampaign('Affected Families', 'mercenary', {
      useRoleBasedSalaries: true,
    });
    const state: IGmTimeCascadeInterventionState = {
      ...campaign,
      id: CAMPAIGN_ID,
      currentDate: new Date('3025-02-02T00:00:00.000Z'),
      currentSystemId: 'terra',
      updatedAt: '2026-09-02T00:00:00.000Z',
      finances: { balance: new Money(1_000_000), transactions: [] },
      repairQueue: [
        {
          ticketId: 'ticket-1',
          unitId: 'unit-1',
          kind: 'armor',
          location: 'CT',
          pointsToRestore: 8,
          expectedHours: 16,
          remainingHours: 16,
          partsRequired: [],
          source: 'combat',
          matchId: 'match-1',
          createdAt: '3025-02-02T00:00:00.000Z',
          status: 'queued',
        },
      ],
      partsInventory: [],
      timeCascadeEvents: [],
    } as unknown as IGmTimeCascadeInterventionState;

    const result = buildGmTimeCascadeProjectedEffect(
      {
        correction: { family: 'time-advance', days: 2 },
      } as unknown as Parameters<typeof buildGmTimeCascadeProjectedEffect>[0],
      state,
    );

    expect(result.effect).toBeDefined();
    if (!result.effect) throw new Error('unreachable');
    // Advancing time moves the date; the repair ticket burns hours. Both
    // families are declared, and every declared family is in the closed
    // vocabulary.
    expect(result.affectedFamilies).toContain('date');
    expect(result.affectedFamilies).toContain('repairs');
    for (const family of result.affectedFamilies) {
      expect(CAMPAIGN_AFFECTED_FAMILIES).toContain(family);
    }
  });

  it('pins the letter families that are NOT yet derivable', () => {
    // 16.1 names eighteen families; the preview compares eleven root
    // fields, so ten of them cannot be derived from a field diff today.
    // Pinned as a fact under test so the gap is reviewable rather than an
    // omission somebody has to rediscover.
    const derivable = new Set<CampaignAffectedFamily>(
      Object.values(CAMPAIGN_FIELD_FAMILY),
    );
    const missing = CAMPAIGN_AFFECTED_FAMILIES.filter(
      (family) => !derivable.has(family),
    );
    expect([...missing].sort()).toEqual(
      [...UNDERIVABLE_AFFECTED_FAMILIES].sort(),
    );
  });
});
