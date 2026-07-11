/**
 * Shared campaign fixture builder for the headless fast-forward suites.
 *
 * Why: AtB scenario generation is triple-gated — Monday-only, the
 * `useAtBScenarios` option (defaults to `false`, absent from
 * `createDefaultCampaignOptions`, `combatForceOptions.ts:76-83`), and a
 * per-team d100 battle-chance roll (`checkForBattle`, `battleChance.ts:120-138`).
 * Every fast-forward suite (this group's own acceptance test, the group-2
 * driver, the group-5 capstone/determinism/parity suites) needs a campaign
 * that reliably clears all three gates without pinning a lucky seed —
 * design D8's "seed serves determinism, never battle occurrence" rule.
 *
 * The fixture opens the gates by construction:
 *  - `options.useAtBScenarios = true` (gate 2).
 *  - `currentDate` pinned to a Monday (gate 1) — validated at build time.
 *  - explicit `campaign.combatTeams` using the highest-base-chance role
 *    (`CombatRole.PATROL` = 60%, beats FRONTLINE-only force derivation,
 *    `scenarioGenerationProcessor.ts:115-124`) with a team count sized so
 *    the probability of zero battle-chance successes is negligible for
 *    ANY seed — never a cherry-picked one (gate 3, design D8).
 *
 * Roll-budget arithmetic (doc-commented per task 1.3): PATROL's base
 * battle chance is 60%, i.e. a 40% per-team miss chance. With
 * `combatTeamCount` independent team rolls in the single covered Monday,
 * `P(zero battles) = 0.4 ** combatTeamCount`. The default of 8 teams
 * gives `0.4 ** 8 ≈ 0.0655%` — the exact arithmetic design D8 documents —
 * low enough that any default seed passes by construction, not by luck.
 *
 * Bounded contract window (design D8 + R9): the fixture's contract
 * `endDate` falls the day immediately after the single covered Monday, so
 * `getActiveContracts` (`campaignCommandSelectors.ts:241-260`, status-blind
 * by design) never offers the contract a second scenario-generation
 * Monday. Without this bound, a later battle could flip an
 * already-terminal contract to a different terminal status and re-pay it
 * (R9, a documented production gap this fixture sidesteps rather than
 * masks).
 *
 * Roster seeding uses `useCampaignRosterStore.setState` (the
 * `campaignCombatLoop.test.ts` `seedRoster` precedent) with canonical
 * `unitRef`s and vault-shaped pilot ids — deliberately NEVER
 * session-unit-id-shaped strings (`${side}-${slot}-${unitRef}`), the
 * dual-id rig the fast-forward capability's XP invariants exist to catch
 * (design D9 / spec: "no fast-forward fixture or test SHALL rig roster
 * pilot ids to session-unit-id-shaped strings").
 *
 * Combat-team force linkage (group 3, task 3.3): each `campaign.forces`
 * entry's `unitIds` references REAL roster-projection `unitId`s (cycled
 * across the 4-unit roster pool when `combatTeamCount` exceeds it) —
 * NOT synthetic placeholder ids. This lets the combat runner resolve "the
 * roster units assigned to a bridged scenario's team" by intersecting
 * `campaign.forces.get(teamForceId).unitIds` against
 * `useCampaignRosterStore().units`, mirroring how a live campaign force
 * actually references its roster.
 *
 * @module lib/campaign/fastForward/fastForwardFixture
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IForce as ICampaignForceEntity } from '@/types/campaign/Force';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { ICombatTeam } from '@/types/campaign/scenario/scenarioTypes';

import { isMonday } from '@/lib/campaign/dayPipeline';
import { BASE_BATTLE_CHANCE } from '@/lib/campaign/scenario/battleChance';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { createDefaultCampaignOptions } from '@/types/campaign/createDefaultCampaignOptions';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { ForceRole } from '@/types/campaign/enums/ForceRole';
import { FormationLevel } from '@/types/campaign/enums/FormationLevel';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { CombatRole } from '@/types/campaign/scenario/scenarioTypes';

// =============================================================================
// Defaults
// =============================================================================

/**
 * `3025-06-13T00:00:00Z` is a verified Monday (UTC `getUTCDay() === 1`).
 * Pinned for determinism (D4) — never re-derived from wall-clock time.
 */
const DEFAULT_MONDAY_START_DATE = new Date('3025-06-13T00:00:00Z');

const DEFAULT_CAMPAIGN_ID = 'fast-forward-fixture-campaign';
const DEFAULT_CONTRACT_ID = 'fast-forward-fixture-contract';

/**
 * 8 PATROL teams × 1 covered Monday ⇒ `0.4 ** 8 ≈ 0.0655%` chance of zero
 * battles for any seed — the exact arithmetic design D8 documents.
 */
const DEFAULT_COMBAT_TEAM_COUNT = 8;

/** Arbitrary but fixed — determinism only, never selected for a passing roll. */
const DEFAULT_RNG_SEED = 0x5eed1234;

/**
 * Canonical unit-dataset keys mirrored from
 * `campaignMissionEncounterLaunchIntegrity.test.ts`'s representative refs
 * so the fixture's roster resolves against real catalog data once group 3
 * builds combat units from it.
 */
const CANONICAL_UNIT_REFS = [
  'atlas-as7-d',
  'marauder-mad-3r',
  'hunchback-hbk-4g',
  'locust-lct-1v',
] as const;

// =============================================================================
// Types
// =============================================================================

/** Documents the seed-independent battle guarantee (design D8, task 1.3). */
export interface FastForwardRollBudget {
  /** Number of independent PATROL battle-chance rolls in the covered window. */
  readonly teamCount: number;
  /** Per-team probability of NO battle (`1 - BASE_BATTLE_CHANCE.PATROL / 100`). */
  readonly perTeamMissChance: number;
  /** `perTeamMissChance ** teamCount` — negligible-for-any-seed target. */
  readonly probabilityOfZeroBattles: number;
}

export interface FastForwardFixtureOptions {
  readonly campaignId?: string;
  /** Determinism only (D4) — never selected to make battles occur. */
  readonly rngSeed?: number;
  /** MUST be a Monday (UTC) — the fixture's single covered generation day. */
  readonly mondayStartDate?: Date;
  /**
   * No default on purpose (design D8): "no silent default reliance" —
   * callers must state which salary path they intend to exercise.
   */
  readonly useRoleBasedSalaries: boolean;
  /** Sized so `probabilityOfZeroBattles` stays negligible; see module doc. */
  readonly combatTeamCount?: number;
  readonly contractId?: string;
}

export interface FastForwardFixture {
  readonly campaign: ICampaign;
  readonly contractId: string;
  /** `campaign.combatTeams[].forceId`s, in declaration order. */
  readonly combatTeamForceIds: readonly string[];
  readonly rollBudget: FastForwardRollBudget;
}

// =============================================================================
// Roster seeding
// =============================================================================

/**
 * Build the fixture's roster (pilots + roster-projection units) from the
 * canonical unit refs — canonical `unitRef`s and vault-shaped pilot ids
 * (`vault-pilot-NNN`), never session-unit-id-shaped strings. Returned
 * (not just applied to the store) so `buildCombatTeamsAndForces` can
 * reference the real roster `unitId`s when wiring `campaign.forces`.
 */
function buildFastForwardRoster(): {
  readonly pilots: readonly ICampaignRosterEntry[];
  readonly units: readonly IRosterUnitProjection[];
} {
  const pilots: ICampaignRosterEntry[] = CANONICAL_UNIT_REFS.map(
    (unitRef, index) => ({
      pilotId: `vault-pilot-${String(index + 1).padStart(3, '0')}`,
      pilotName: `Fixture Pilot ${index + 1}`,
      status: CampaignPilotStatus.Active,
      wounds: 0,
      recoveryTime: 0,
      xp: 0,
      campaignXpEarned: 0,
      campaignKills: 0,
      campaignMissions: 0,
      primaryRole: CampaignPersonnelRole.PILOT,
      rankIndex: 0,
      hireDate: new Date('3024-01-01'),
      unitRef,
    }),
  );

  const units: IRosterUnitProjection[] = CANONICAL_UNIT_REFS.map(
    (unitRef, index) => ({
      unitId: `ff-roster-unit-${index + 1}`,
      unitRef,
      unitName: unitRef,
      pilotId: pilots[index]?.pilotId,
      chassisVariant: unitRef,
      readiness: 'Ready',
    }),
  );

  return { pilots, units };
}

function seedFastForwardRoster(
  campaignId: string,
  roster: {
    readonly pilots: readonly ICampaignRosterEntry[];
    readonly units: readonly IRosterUnitProjection[];
  },
): void {
  useCampaignRosterStore.setState({
    campaignId,
    units: [...roster.units],
    pilots: [...roster.pilots],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
}

// =============================================================================
// Combat teams + forces
// =============================================================================

/**
 * Build N explicit PATROL combat teams, each backed by a resolvable
 * `campaign.forces` entry (so `buildEncounterFromScenario` marks the
 * resulting bridged encounter `Ready`, not `Draft` —
 * `buildEncounterFromScenario.ts:213-223`). Explicit `campaign.combatTeams`
 * beats FRONTLINE-only force derivation
 * (`scenarioGenerationProcessor.ts:115-124`), so these are the fixture's
 * only lever for the seed-independent battle guarantee.
 *
 * Each force's `unitIds` references a REAL roster-projection `unitId`
 * from `rosterUnits`, cycling across the (small, canonical) roster pool
 * when `count` exceeds it (task 3.3: the combat runner resolves "the
 * roster units assigned to a scenario's team" by intersecting a force's
 * `unitIds` against the roster store, so the two MUST share ids — a
 * synthetic placeholder id here would leave the runner with an empty
 * roster and nothing to materialize).
 */
function buildCombatTeamsAndForces(
  count: number,
  rosterUnits: readonly IRosterUnitProjection[],
): {
  // `ICampaign.forces` is typed `Map<string, IForce>` (mutable), not
  // `ReadonlyMap` — the campaign fixture owns a fresh Map instance, so
  // mutability here is safe (nothing else holds a reference).
  readonly forces: Map<string, ICampaignForceEntity>;
  readonly teams: readonly ICombatTeam[];
} {
  if (rosterUnits.length === 0) {
    throw new Error(
      'buildCombatTeamsAndForces: rosterUnits must be non-empty — combat teams need a real roster unit to reference.',
    );
  }
  const forces = new Map<string, ICampaignForceEntity>();
  const teams: ICombatTeam[] = [];
  const timestamp = DEFAULT_MONDAY_START_DATE.toISOString();

  for (let index = 0; index < count; index += 1) {
    const forceId = `ff-team-force-${index + 1}`;
    const rosterUnit = rosterUnits[index % rosterUnits.length];
    if (!rosterUnit) {
      throw new Error(
        `buildCombatTeamsAndForces: no roster unit at cycled index ${index % rosterUnits.length}`,
      );
    }
    forces.set(forceId, {
      id: forceId,
      name: `Fixture Patrol Team ${index + 1}`,
      subForceIds: [],
      unitIds: [rosterUnit.unitId],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    teams.push({
      forceId,
      role: CombatRole.PATROL,
      battleChance: BASE_BATTLE_CHANCE[CombatRole.PATROL],
    });
  }

  return { forces, teams };
}

// =============================================================================
// Fixture builder
// =============================================================================

/**
 * Build a campaign fixture that reliably clears all three AtB
 * scenario-generation gates and seeds a matching roster. See module doc
 * for the roll-budget and bounded-contract-window rationale.
 */
export function buildFastForwardFixture(
  options: FastForwardFixtureOptions,
): FastForwardFixture {
  const campaignId = options.campaignId ?? DEFAULT_CAMPAIGN_ID;
  const rngSeed = options.rngSeed ?? DEFAULT_RNG_SEED;
  const mondayStartDate = options.mondayStartDate ?? DEFAULT_MONDAY_START_DATE;
  if (!isMonday(mondayStartDate)) {
    throw new Error(
      `buildFastForwardFixture: mondayStartDate ${mondayStartDate.toISOString()} is not a Monday (UTC) — the AtB generation Monday gate would never open.`,
    );
  }
  const combatTeamCount = options.combatTeamCount ?? DEFAULT_COMBAT_TEAM_COUNT;
  const contractId = options.contractId ?? DEFAULT_CONTRACT_ID;
  const timestamp = mondayStartDate.toISOString();

  // Roster built FIRST so combat-team forces can reference real roster
  // `unitId`s (task 3.3 — see `buildCombatTeamsAndForces`'s doc comment).
  const roster = buildFastForwardRoster();
  const { forces, teams } = buildCombatTeamsAndForces(
    combatTeamCount,
    roster.units,
  );

  // Bounded contract window (D8 + R9): terminal the day after the single
  // covered Monday so `getActiveContracts` never offers this contract a
  // second scenario-generation pass.
  const contractEndDate = new Date(
    mondayStartDate.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const contract = createContract({
    id: contractId,
    name: 'Fast-Forward Fixture Patrol Contract',
    employerId: 'fixture-employer',
    targetId: 'fixture-target',
    status: MissionStatus.ACTIVE,
    endDate: contractEndDate,
  });

  const campaign: ICampaign = {
    id: campaignId,
    name: 'Fast-Forward Fixture Campaign',
    currentDate: mondayStartDate,
    factionId: 'mercenary',
    forces,
    rootForceId: 'ff-root-force',
    missions: new Map([[contract.id, contract]]),
    finances: { transactions: [], balance: new Money(1_000_000) },
    factionStandings: {},
    combatTeams: teams,
    options: {
      ...createDefaultCampaignOptions(),
      useAtBScenarios: true,
      useRoleBasedSalaries: options.useRoleBasedSalaries,
    },
    campaignType: CampaignType.MERCENARY,
    createdAt: timestamp,
    updatedAt: timestamp,
    unitCombatStates: {},
    rngSeed,
  };

  seedFastForwardRoster(campaignId, roster);

  const perTeamMissChance = 1 - BASE_BATTLE_CHANCE[CombatRole.PATROL] / 100;
  const rollBudget: FastForwardRollBudget = {
    teamCount: combatTeamCount,
    perTeamMissChance,
    probabilityOfZeroBattles: perTeamMissChance ** combatTeamCount,
  };

  return {
    campaign,
    contractId: contract.id,
    combatTeamForceIds: teams.map((team) => team.forceId),
    rollBudget,
  };
}
