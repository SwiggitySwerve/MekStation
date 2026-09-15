/**
 * Guard coverage for the co-op authoritative-state builder.
 *
 * `CampaignCoopEntryPanel` calls `buildCampaignAuthoritativeState` to turn
 * the host's persisted campaign + roster into the snapshot that match
 * registration, `CampaignHostRegistry`, and the guest mirror all bind to.
 * The panel's own test replaces this module with a `jest.fn(() => ({}))`
 * mock, so its four fail-closed guards (invalid roster source, missing
 * catalog reference, force referencing an absent roster unit, unit claimed
 * by two forces) were previously exercised nowhere. This suite imports the
 * real module and pins each guard plus the happy-path projection the frozen
 * `camp-01b` assertions read (`campaignId`, `rosterUnits[id].unitSource` /
 * `.unitRef`, and the exact `forceUnits` membership map).
 *
 * @spec openspec/changes/add-saved-custom-unit-campaign-roster/tasks.md (task 2.1)
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type { IForce } from '@/types/campaign/Force';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { CampaignType } from '@/types/campaign/CampaignType';
import { createDefaultCampaignOptions } from '@/types/campaign/createDefaultCampaignOptions';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { Money } from '@/types/campaign/Money';

import { buildCampaignAuthoritativeState } from '../campaignAuthoritativeState';

const CAMPAIGN_ID = 'campaign-coop-authority';

/** Minimal force node; only `id` and `unitIds` drive the projection. */
function makeForce(id: string, unitIds: string[]): IForce {
  return {
    id,
    name: `Force ${id}`,
    subForceIds: [],
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
  };
}

/**
 * Campaign fixture pinned to a 3-day-old start so `day` is deterministic.
 * Faction standings stay empty so the happy-path row can assert the exact
 * projected `factionStanding` object rather than a subset.
 */
function makeCampaign(forces: readonly IForce[]): ICampaign {
  return {
    id: CAMPAIGN_ID,
    name: 'Authority Test Co.',
    currentDate: new Date('3025-06-18T00:00:00Z'),
    campaignStartDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map(forces.map((force) => [force.id, force])),
    rootForceId: 'force-alpha',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(1_250_000) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-06-18T00:00:00Z',
    unitCombatStates: {},
  };
}

/** Roster projection fixture; overrides exercise one guard at a time. */
function makeRosterUnit(
  overrides: Partial<IRosterUnitProjection> & { readonly unitId: string },
): IRosterUnitProjection {
  return {
    unitName: `Unit ${overrides.unitId}`,
    unitRef: 'atlas-as7-d',
    unitSource: 'canonical',
    chassisVariant: 'AS7-D',
    readiness: 'Ready',
    ...overrides,
  };
}

/**
 * Run the builder and assert the exact thrown message.
 *
 * The `projected` check records "nothing is projected on rejection"
 * explicitly. It is a restatement of the throw rather than an independent
 * discriminator — the builder has no partial-return path, so no mutation of
 * the guard can leave the throw intact while assigning — and the row's
 * actual killer is the message-matched `toThrow`.
 */
function expectNothingProjected(
  campaign: ICampaign,
  rosterUnits: readonly IRosterUnitProjection[],
  message: string,
): void {
  let projected: ICampaignAuthoritativeState | undefined;
  expect(() => {
    projected = buildCampaignAuthoritativeState(campaign, rosterUnits);
  }).toThrow(message);
  expect(projected).toBeUndefined();
}

describe('buildCampaignAuthoritativeState roster guards', () => {
  it('rejects a roster unit whose persisted source is neither canonical nor custom', () => {
    const campaign = makeCampaign([makeForce('force-alpha', ['unit-1'])]);
    const rosterUnits = [
      makeRosterUnit({
        unitId: 'unit-1',
        unitName: 'Atlas AS7-D',
        // Fail-closed: an unrecognised persisted source is never coerced
        // to 'canonical' on the way into a co-op snapshot.
        unitSource: 'stock' as unknown as IRosterUnitProjection['unitSource'],
      }),
    ];

    expectNothingProjected(
      campaign,
      rosterUnits,
      'Atlas AS7-D has an invalid roster source',
    );
  });

  it('rejects a roster unit missing its catalog reference', () => {
    const campaign = makeCampaign([makeForce('force-alpha', ['unit-1'])]);
    const rosterUnits = [
      makeRosterUnit({
        unitId: 'unit-1',
        unitName: 'Griffin GRF-1N',
        unitRef: undefined,
      }),
    ];

    expectNothingProjected(
      campaign,
      rosterUnits,
      'Griffin GRF-1N is missing a catalog reference',
    );
  });

  it('rejects a force that references a unit absent from the roster projection', () => {
    const campaign = makeCampaign([
      makeForce('force-alpha', ['unit-1', 'unit-ghost']),
    ]);
    const rosterUnits = [
      makeRosterUnit({ unitId: 'unit-1', unitName: 'Atlas AS7-D' }),
    ];

    expectNothingProjected(
      campaign,
      rosterUnits,
      'Force force-alpha references absent roster unit unit-ghost',
    );
  });

  it('rejects a roster unit claimed by two forces', () => {
    const campaign = makeCampaign([
      makeForce('force-alpha', ['unit-1']),
      makeForce('force-bravo', ['unit-1']),
    ]);
    const rosterUnits = [
      makeRosterUnit({ unitId: 'unit-1', unitName: 'Atlas AS7-D' }),
    ];

    expectNothingProjected(
      campaign,
      rosterUnits,
      'Roster unit unit-1 is in more than one force',
    );
  });

  it('projects the roster source identity and force membership the co-op snapshot binds to', () => {
    const campaign = makeCampaign([
      makeForce('force-bravo', ['unit-2']),
      makeForce('force-alpha', ['unit-1']),
    ]);
    const rosterUnits = [
      makeRosterUnit({
        unitId: 'unit-2',
        unitName: 'Custom Marauder',
        unitRef: 'saved-marauder-x',
        unitSource: 'custom',
        sourceVersion: 4,
        readiness: 'Damaged',
      }),
      makeRosterUnit({
        unitId: 'unit-1',
        unitName: 'Atlas AS7-D',
        unitRef: 'atlas-as7-d',
        unitSource: 'canonical',
      }),
    ];

    const state = buildCampaignAuthoritativeState(campaign, rosterUnits);

    // The exact fields the frozen camp-01b assertions compare host-side
    // against the guest mirror: campaignId, per-unit source identity, and
    // a byte-stable forceUnits map (JSON.stringify equality on both ends).
    expect(state.campaignId).toBe(CAMPAIGN_ID);
    expect(state.rosterUnits).toEqual({
      'unit-1': {
        unitId: 'unit-1',
        designation: 'Atlas AS7-D',
        status: 'operational',
        unitRef: 'atlas-as7-d',
        unitSource: 'canonical',
      },
      'unit-2': {
        unitId: 'unit-2',
        designation: 'Custom Marauder',
        status: 'damaged',
        unitRef: 'saved-marauder-x',
        unitSource: 'custom',
        sourceVersion: 4,
      },
    });
    expect(state.forceUnits).toEqual({
      'force-alpha': ['unit-1'],
      'force-bravo': ['unit-2'],
    });
    // Deterministic key order — the guest compares stringified membership.
    expect(Object.keys(state.forceUnits ?? {})).toEqual([
      'force-alpha',
      'force-bravo',
    ]);
    expect(state.day).toBe(3);
    expect(state.balance).toBe(1_250_000);
    expect(state.factionStanding).toEqual({});
  });
});
