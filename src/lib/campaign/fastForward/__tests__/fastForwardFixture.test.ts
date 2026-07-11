/**
 * `buildFastForwardFixture` — proves all THREE AtB scenario-generation
 * gates (Monday, `useAtBScenarios`, per-team battle-chance roll) are open
 * BEFORE the fast-forward driver exists (task 1.3), and that the pass is
 * roll-budget-backed rather than a cherry-picked seed (design D8).
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import { _resetDayPipeline, getDayPipeline } from '@/lib/campaign/dayPipeline';
import {
  _resetBuiltinRegistration,
  registerBuiltinProcessors,
} from '@/lib/campaign/processors';
import { BASE_BATTLE_CHANCE } from '@/lib/campaign/scenario/battleChance';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { CombatRole } from '@/types/campaign/scenario/scenarioTypes';
import { EncounterStatus } from '@/types/encounter';

import { buildFastForwardFixture } from '../fastForwardFixture';

interface BridgeCampaignView {
  readonly bridgedEncounters?: Readonly<
    Record<string, { readonly status: string }>
  >;
  readonly bridgedScenarioIds?: readonly string[];
}

function resetWorld(): void {
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignRosterStore.getState().reset();
}

describe('buildFastForwardFixture', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('rejects a mondayStartDate that is not a Monday', () => {
    expect(() =>
      buildFastForwardFixture({
        useRoleBasedSalaries: false,
        mondayStartDate: new Date('3025-06-15T00:00:00Z'), // a Sunday
      }),
    ).toThrow(/is not a Monday/);
  });

  it('declares a roll budget whose probability of zero battles is negligible for any seed', () => {
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });

    // Doc-commented arithmetic (task 1.3): P(zero) = perTeamMissChance ** teamCount.
    const expectedPerTeamMissChance =
      1 - BASE_BATTLE_CHANCE[CombatRole.PATROL] / 100;
    expect(fixture.rollBudget.teamCount).toBe(8);
    expect(fixture.rollBudget.perTeamMissChance).toBeCloseTo(
      expectedPerTeamMissChance,
      10,
    );
    expect(fixture.rollBudget.probabilityOfZeroBattles).toBeCloseTo(
      expectedPerTeamMissChance ** fixture.rollBudget.teamCount,
      10,
    );
    // The design D8 worked example: 0.4 ** 8 ≈ 0.0655%.
    expect(fixture.rollBudget.probabilityOfZeroBattles).toBeLessThan(0.001);
    expect(fixture.combatTeamForceIds).toHaveLength(8);
  });

  it('opens all three AtB generation gates on a single manual advanceDay() — not seed-cherry-picked', () => {
    // Seeds picked arbitrarily (not selected for passing) to demonstrate
    // the roll budget carries the guarantee, not a lucky default seed
    // (design D8: "the pinned seed exists for determinism, never battle
    // occurrence").
    const candidateSeeds = [1, 2, 3, 42, 1337, 0xdeadbeef, 7, 99, 100_003, 555];

    for (const rngSeed of candidateSeeds) {
      resetWorld();
      registerBuiltinProcessors();

      const fixture = buildFastForwardFixture({
        useRoleBasedSalaries: false,
        rngSeed,
      });

      const result = getDayPipeline().processDay(fixture.campaign);

      const scenarioEvents = result.events.filter(
        (event) => event.type === 'scenario_generated',
      );
      expect(scenarioEvents.length).toBeGreaterThan(0);

      const bridged = (result.campaign as unknown as BridgeCampaignView)
        .bridgedEncounters;
      expect(bridged).toBeDefined();
      expect(Object.keys(bridged ?? {}).length).toBeGreaterThan(0);
    }
  });

  it('resolves every combat team force so bridged encounters are Ready, not Draft', () => {
    registerBuiltinProcessors();
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });

    for (const forceId of fixture.combatTeamForceIds) {
      expect(fixture.campaign.forces.get(forceId)).toBeDefined();
    }

    const result = getDayPipeline().processDay(fixture.campaign);
    const bridged = (result.campaign as unknown as BridgeCampaignView)
      .bridgedEncounters;
    const bridgedValues = Object.values(bridged ?? {});
    expect(bridgedValues.length).toBeGreaterThan(0);
    for (const encounter of bridgedValues) {
      expect(encounter.status).toBe(EncounterStatus.Ready);
    }
  });

  it('bounds the contract window so no scenario can generate after the covered Monday', () => {
    registerBuiltinProcessors();
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
    const contract = fixture.campaign.missions.get(fixture.contractId);
    expect(contract?.endDate).toBeDefined();
    expect(new Date(contract!.endDate!).getTime()).toBeGreaterThan(
      fixture.campaign.currentDate.getTime(),
    );
    // Exactly one live Monday: the contract expires before the following
    // Monday (7 days later).
    expect(new Date(contract!.endDate!).getTime()).toBeLessThan(
      fixture.campaign.currentDate.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
  });

  it('seeds the roster with canonical unitRefs and vault-shaped pilot ids, never session-unit-id-shaped', () => {
    buildFastForwardFixture({ useRoleBasedSalaries: false });

    const roster = useCampaignRosterStore.getState();
    expect(roster.units.length).toBeGreaterThan(0);
    expect(roster.pilots.length).toBeGreaterThan(0);

    for (const pilot of roster.pilots) {
      // Vault-shaped: `vault-pilot-NNN`. NEVER session-unit-id-shaped
      // (`${side}-${slot}-${unitRef}`, e.g. `player-1-atlas-as7-d`) — the
      // dual-id rig this capability's XP invariants ban.
      expect(pilot.pilotId).toMatch(/^vault-pilot-\d{3}$/);
      expect(pilot.pilotId).not.toMatch(/^(player|opponent)-\d+-/);
    }
    for (const unit of roster.units) {
      expect(unit.unitRef).toBeDefined();
      expect(unit.readiness).toBe('Ready');
    }
  });

  it('honors an explicit useRoleBasedSalaries choice with no silent default', () => {
    const withRoleBased = buildFastForwardFixture({
      useRoleBasedSalaries: true,
    });
    expect(withRoleBased.campaign.options.useRoleBasedSalaries).toBe(true);

    const withoutRoleBased = buildFastForwardFixture({
      useRoleBasedSalaries: false,
    });
    expect(withoutRoleBased.campaign.options.useRoleBasedSalaries).toBe(false);
  });
});
