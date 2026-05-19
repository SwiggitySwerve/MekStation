/**
 * Scenario-Event → Encounter Bridge Processor
 *
 * Per `add-campaign-combat-loop` D1: a day-pipeline consumer that reads
 * the day's `scenario_generated` events (emitted by the untouched
 * `scenarioGenerationProcessor`) and, for each, builds and persists a
 * launchable `IEncounter`.
 *
 * Because the day pipeline is pure (no IO — it runs identically on
 * client and server), campaign-generated encounters are persisted onto
 * the campaign snapshot itself, which CP0 (`add-campaign-persistence`)
 * reads and writes through the persistence store. The encounter is a
 * full `IEncounter` carrying `campaignMeta`; the campaign-linked launch
 * path (`launchCampaignEncounter`) materialises it into the
 * `encounter-system` SQLite repository when the player chooses to play
 * it. This keeps the pipeline pure and idempotent while still giving
 * CP2a a single, persistence-store-backed structure to render.
 *
 * Phase: `DayPhase.EVENTS + 10` — strictly after `scenarioGenerationProcessor`
 * (`DayPhase.EVENTS`), so the day's `scenario_generated` events already
 * exist by the time the bridge runs. The bridge reads them from the
 * accumulated pipeline event stream, threaded in via the processor's
 * `process` arguments (the day pipeline now passes the events-so-far).
 *
 * Idempotency: keyed on `scenarioId` via `campaign.bridgedScenarioIds`.
 * A scenario already bridged is skipped — re-running a day or replaying
 * the pipeline produces no duplicate encounters.
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
 * @module lib/campaign/processors/scenarioEncounterBridgeProcessor
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IEncounter } from '@/types/encounter';

import { buildEncounterFromScenario } from '@/lib/campaign/encounter/buildEncounterFromScenario';
import { isScenarioGeneratedPayload } from '@/lib/campaign/encounter/scenarioEventPayload';

import {
  DayPhase,
  getDayEventsSoFar,
  getDayPipeline,
  type IDayEvent,
  type IDayProcessor,
  type IDayProcessorResult,
} from '../dayPipeline';

// =============================================================================
// Campaign Extension
// =============================================================================

/**
 * Campaign fields written by the scenario-encounter bridge. All optional
 * so existing `ICampaign` consumers are unaffected; the bridge narrows
 * when it reads.
 */
export interface IBridgeCampaignExtensions {
  /**
   * Launchable encounters generated from campaign scenarios, keyed by
   * `scenarioId`. Each value carries `campaignMeta` linkage. CP2a
   * renders these; the campaign-linked launch path materialises one
   * into the encounter repository on demand.
   */
  readonly bridgedEncounters?: Readonly<Record<string, IEncounter>>;
  /**
   * Set of `scenarioId`s already bridged to an encounter — the
   * idempotency key (design.md D3). A re-run skips known ids.
   */
  readonly bridgedScenarioIds?: readonly string[];
}

/** Campaign narrowed to the bridge's read/write surface. */
export type ICampaignWithBridgeState = ICampaign & IBridgeCampaignExtensions;

// =============================================================================
// Bridge Phase
// =============================================================================

/**
 * Bridge phase — `DayPhase.EVENTS + 10`. Runs strictly after
 * `scenarioGenerationProcessor` (`DayPhase.EVENTS`), guaranteeing the
 * day's `scenario_generated` events exist when the bridge consumes them.
 */
export const SCENARIO_ENCOUNTER_BRIDGE_PHASE: number = DayPhase.EVENTS + 10;

// =============================================================================
// Pure Bridge Application
// =============================================================================

/**
 * Apply the bridge to a campaign given the day's accumulated events.
 *
 * Pure: returns a new campaign with `bridgedEncounters` /
 * `bridgedScenarioIds` extended, plus the day events surfaced for the
 * UI. A scenario already in `bridgedScenarioIds` is skipped (D3).
 *
 * @param campaign - the campaign being processed
 * @param dayEvents - every event produced by earlier processors this day
 * @param createdAt - ISO timestamp (caller-supplied for determinism)
 */
export function applyScenarioEncounterBridge(
  campaign: ICampaign,
  dayEvents: readonly IDayEvent[],
  createdAt: string,
): IDayProcessorResult {
  const extended = campaign as ICampaignWithBridgeState;
  const alreadyBridged = new Set(extended.bridgedScenarioIds ?? []);
  const nextEncounters: Record<string, IEncounter> = {
    ...(extended.bridgedEncounters ?? {}),
  };
  const newlyBridged: string[] = [];
  const events: IDayEvent[] = [];

  for (const event of dayEvents) {
    if (event.type !== 'scenario_generated') continue;
    const payload = event.data;
    if (!isScenarioGeneratedPayload(payload)) continue;

    // Idempotency (D3): skip a scenario already turned into an encounter.
    if (alreadyBridged.has(payload.scenarioId)) continue;

    const encounter = buildEncounterFromScenario(payload, campaign, createdAt);
    nextEncounters[payload.scenarioId] = encounter;
    alreadyBridged.add(payload.scenarioId);
    newlyBridged.push(payload.scenarioId);

    events.push({
      type: 'scenario_encounter_bridged',
      description: `Launchable encounter created for scenario ${payload.scenarioId}`,
      severity: 'info',
      data: {
        scenarioId: payload.scenarioId,
        contractId: payload.contractId,
        encounterId: encounter.id,
      },
    });
  }

  // No new encounters — return the campaign unchanged so reference
  // equality holds for downstream processors.
  if (newlyBridged.length === 0) {
    return { events: [], campaign };
  }

  const updatedCampaign: ICampaignWithBridgeState = {
    ...extended,
    bridgedEncounters: nextEncounters,
    bridgedScenarioIds: [
      ...(extended.bridgedScenarioIds ?? []),
      ...newlyBridged,
    ],
    updatedAt: createdAt,
  };

  return { events, campaign: updatedCampaign };
}

// =============================================================================
// Day Processor
// =============================================================================

/**
 * Scenario-encounter bridge day processor.
 *
 * Consumes the day's `scenario_generated` events — read from the
 * pipeline's transient day-event accumulator via `getDayEventsSoFar` —
 * and persists one launchable `IEncounter` per event onto the campaign
 * snapshot. Idempotent on `scenarioId`.
 */
export const scenarioEncounterBridgeProcessor: IDayProcessor = {
  id: 'scenario-encounter-bridge',
  phase: SCENARIO_ENCOUNTER_BRIDGE_PHASE,
  displayName: 'Scenario → Encounter Bridge',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    return applyScenarioEncounterBridge(
      campaign,
      getDayEventsSoFar(campaign),
      date.toISOString(),
    );
  },
};

/**
 * Register the bridge processor with the day pipeline. Used by
 * `processorRegistration.ts`.
 */
export function registerScenarioEncounterBridgeProcessor(): void {
  getDayPipeline().register(scenarioEncounterBridgeProcessor);
}
