/**
 * Scenario-event → encounter builder
 *
 * Per `add-campaign-combat-loop` D2: maps a `scenario_generated` day
 * event payload onto a launchable `IEncounter`. The OpFor force is
 * BV-matched to `opForBV` (D2 / open question — BV-matched force, richer
 * composition deferred), the victory conditions are derived from
 * `scenarioType`, and the map config is derived from the scenario
 * conditions. The resulting encounter carries `campaignMeta` so every
 * downstream step threads linkage back to the contract.
 *
 * Pure and sync — no IO, no random. The scenario id is deterministic
 * (`scenarioGenerationProcessor` builds it from contract/team/date), so
 * a re-run of the same day produces an identical encounter.
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
 * @module lib/campaign/encounter/buildEncounterFromScenario
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IScenarioConditions } from '@/types/campaign/scenario/scenarioTypes';
import type {
  IEncounter,
  IMapConfiguration,
  IOpForConfig,
  IVictoryCondition,
} from '@/types/encounter';

import {
  EncounterStatus,
  PilotSkillTemplate,
  TerrainPreset,
  VictoryConditionType,
} from '@/types/encounter';

// =============================================================================
// Scenario Event Payload
// =============================================================================

/**
 * The shape of the `scenario_generated` day-event `data` payload, as
 * emitted by `scenarioGenerationProcessor.createScenarioEventData`. We
 * declare only the fields the bridge consumes so the builder is
 * self-contained and does not import the processor.
 */
export interface IScenarioGeneratedPayload {
  /** Selected AtB scenario type (e.g. 'standup', 'base_attack'). */
  readonly scenarioType: string;
  /** Whether the player force is the attacker. */
  readonly isAttacker: boolean;
  /** Opposing-force Battle Value target. */
  readonly opForBV: number;
  /** Environmental conditions for the scenario. */
  readonly conditions: IScenarioConditions;
  /** Combat team (force) id assigned to the scenario. */
  readonly teamId: string;
  /** Contract this scenario was generated for. */
  readonly contractId: string;
  /** Contract display name. */
  readonly contractName: string;
  /** Deterministic scenario id (linkage key). */
  readonly scenarioId: string;
}

// =============================================================================
// Scenario-Type → Victory Conditions
// =============================================================================

/**
 * Derive victory conditions from the AtB scenario type.
 *
 * Mirrors the intent of each AtB scenario: standup / breakthrough are
 * destruction fights, hold-the-line / base-attack are turn-limited
 * objective holds, chase / extraction are cripple-and-disengage. The
 * mapping is deterministic so re-running a day yields identical
 * conditions.
 */
export function deriveVictoryConditions(
  scenarioType: string,
): readonly IVictoryCondition[] {
  return (
    VICTORY_CONDITIONS_BY_SCENARIO[scenarioType] ?? [
      { type: VictoryConditionType.DestroyAll },
    ]
  );
}

const VICTORY_CONDITIONS_BY_SCENARIO: Record<
  string,
  readonly IVictoryCondition[]
> = {
  standup: [{ type: VictoryConditionType.DestroyAll }],
  breakthrough: [{ type: VictoryConditionType.DestroyAll }],
  hold_the_line: [
    { type: VictoryConditionType.Cripple, threshold: 50 },
    { type: VictoryConditionType.TurnLimit, turnLimit: 15 },
  ],
  base_attack: [
    { type: VictoryConditionType.Cripple, threshold: 50 },
    { type: VictoryConditionType.TurnLimit, turnLimit: 15 },
  ],
  chase: [
    { type: VictoryConditionType.Cripple, threshold: 50 },
    { type: VictoryConditionType.TurnLimit, turnLimit: 12 },
  ],
  extraction: [
    { type: VictoryConditionType.Cripple, threshold: 50 },
    { type: VictoryConditionType.TurnLimit, turnLimit: 12 },
  ],
  hide_and_seek: [
    { type: VictoryConditionType.Cripple, threshold: 50 },
    { type: VictoryConditionType.TurnLimit, turnLimit: 12 },
  ],
  probe: [
    { type: VictoryConditionType.Cripple, threshold: 40 },
    { type: VictoryConditionType.TurnLimit, turnLimit: 10 },
  ],
  recon_raid: [
    { type: VictoryConditionType.Cripple, threshold: 40 },
    { type: VictoryConditionType.TurnLimit, turnLimit: 10 },
  ],
};

// =============================================================================
// Scenario Conditions → Map Config
// =============================================================================

/**
 * Derive the map terrain from scenario weather/atmosphere conditions.
 *
 * Sandstorm / dense atmosphere lean to rough terrain; fog / snow lean
 * to wooded cover; everything else stays clear. MVP-grade — richer
 * terrain authoring is out of scope for this change.
 */
function deriveTerrain(conditions: IScenarioConditions): TerrainPreset {
  if (conditions.weather === 'sandstorm') return TerrainPreset.Rough;
  if (conditions.weather === 'fog' || conditions.weather === 'snow') {
    return TerrainPreset.LightWoods;
  }
  if (conditions.atmosphere === 'dense') return TerrainPreset.Rough;
  return TerrainPreset.Clear;
}

/**
 * Derive the encounter map configuration from scenario conditions.
 *
 * The radius scales with the OpFor BV (bigger forces need more board);
 * the player always deploys south, opponent north. Deterministic.
 */
export function deriveMapConfiguration(
  conditions: IScenarioConditions,
  opForBV: number,
): IMapConfiguration {
  // Bigger forces get a larger board: ≤3000 BV → 6, ≤8000 → 8, else 12.
  const radius = opForBV <= 3000 ? 6 : opForBV <= 8000 ? 8 : 12;
  return {
    radius,
    terrain: deriveTerrain(conditions),
    playerDeploymentZone: 'south',
    opponentDeploymentZone: 'north',
  };
}

// =============================================================================
// OpFor BV → OpFor Config
// =============================================================================

/**
 * Build the OpFor generation config. The force is BV-matched to the
 * scenario's `opForBV` (design.md D2 / open question — BV-matched force
 * for this change; richer composition deferred). Pilot skill defaults
 * to Regular.
 */
export function deriveOpForConfig(opForBV: number): IOpForConfig {
  return {
    targetBV: Math.max(0, Math.round(opForBV)),
    pilotSkillTemplate: PilotSkillTemplate.Regular,
  };
}

// =============================================================================
// Encounter Builder
// =============================================================================

/**
 * Build a launchable `IEncounter` from a `scenario_generated` event
 * payload and the owning campaign.
 *
 * The encounter:
 *   - is `Ready`-status when a player force is resolvable from the
 *     contract's assigned combat team, else `Draft`;
 *   - carries `campaignMeta = { campaignId, contractId, scenarioId }`;
 *   - has a deterministic id `enc-<scenarioId>` so the bridge can
 *     idempotently key on it.
 *
 * @param payload - the `scenario_generated` event `data` payload
 * @param campaign - the campaign that owns the scenario
 * @param createdAt - ISO timestamp (caller-supplied for determinism)
 */
export function buildEncounterFromScenario(
  payload: IScenarioGeneratedPayload,
  campaign: ICampaign,
  createdAt: string,
): IEncounter {
  const opForConfig = deriveOpForConfig(payload.opForBV);
  const victoryConditions = deriveVictoryConditions(payload.scenarioType);
  const mapConfig = deriveMapConfiguration(payload.conditions, payload.opForBV);

  // Resolve the player force from the contract's assigned combat team.
  // The team id IS a force id (see `ICombatTeam.forceId`). When the
  // force is present in the campaign, the encounter is launch-ready;
  // otherwise it persists as a Draft the player completes manually.
  const playerForce = campaign.forces.get(payload.teamId) ?? null;
  const playerForceRef = playerForce
    ? {
        forceId: playerForce.id,
        forceName: playerForce.name,
        // BV / unit count are hydrated by EncounterService at launch
        // time; the bridge records the reference shell.
        totalBV: 0,
        unitCount: playerForce.unitIds.length,
      }
    : undefined;

  return {
    id: `enc-${payload.scenarioId}`,
    name: `${payload.contractName}: ${formatScenarioType(payload.scenarioType)}`,
    description: `Campaign scenario generated for contract ${payload.contractName}.`,
    status: playerForceRef ? EncounterStatus.Ready : EncounterStatus.Draft,
    playerForce: playerForceRef,
    opForConfig,
    mapConfig,
    victoryConditions,
    optionalRules: [],
    createdAt,
    updatedAt: createdAt,
    campaignMeta: {
      campaignId: campaign.id,
      contractId: payload.contractId,
      scenarioId: payload.scenarioId,
    },
  };
}

/**
 * Turn an AtB scenario-type slug into a human-readable label
 * (`base_attack` → `Base Attack`).
 */
function formatScenarioType(scenarioType: string): string {
  return scenarioType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
