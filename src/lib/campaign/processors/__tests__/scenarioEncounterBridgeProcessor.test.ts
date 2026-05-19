/**
 * Tests for the scenario-event → encounter bridge.
 *
 * Per `add-campaign-combat-loop` task 2.6: a `scenario_generated` event
 * yields one persisted launchable encounter with correct linkage; a
 * re-run produces no duplicate; an empty day produces no encounters.
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import type { IDayEvent } from '@/lib/campaign/dayPipeline';
import type { ICampaign } from '@/types/campaign/Campaign';

import { applyScenarioEncounterBridge } from '@/lib/campaign/processors/scenarioEncounterBridgeProcessor';
import { CampaignType } from '@/types/campaign/CampaignType';
import { createDefaultCampaignOptions } from '@/types/campaign/createDefaultCampaignOptions';
import { Money } from '@/types/campaign/Money';
import { EncounterStatus } from '@/types/encounter';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCampaign(overrides?: Partial<ICampaign>): ICampaign {
  return {
    id: 'campaign-cb-1',
    name: 'Combat Loop Test Co.',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: Money.ZERO },
    factionStandings: {},
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    shoppingList: { items: [] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    unitCombatStates: {},
    ...overrides,
  };
}

function scenarioEvent(scenarioId: string, contractId: string): IDayEvent {
  return {
    type: 'scenario_generated',
    description: `Scenario ${scenarioId}`,
    severity: 'info',
    data: {
      scenarioType: 'standup',
      isAttacker: true,
      opForBV: 4500,
      conditions: { weather: 'clear', light: 'daylight' },
      teamId: 'force-alpha',
      contractId,
      contractName: 'Garrison: Hesperus II',
      scenarioId,
    },
  };
}

const CREATED_AT = '3025-06-15T00:00:00.000Z';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applyScenarioEncounterBridge', () => {
  it('a scenario_generated event yields one persisted launchable encounter with correct linkage', () => {
    const campaign = makeCampaign();
    const events = [
      scenarioEvent('scn-c1-3025-06-15-force-alpha', 'contract-1'),
    ];

    const result = applyScenarioEncounterBridge(campaign, events, CREATED_AT);

    const updated = result.campaign as ICampaign & {
      bridgedEncounters?: Record<string, unknown>;
      bridgedScenarioIds?: readonly string[];
    };
    const encounters = updated.bridgedEncounters ?? {};
    expect(Object.keys(encounters)).toHaveLength(1);

    const encounter = encounters['scn-c1-3025-06-15-force-alpha'] as {
      id: string;
      campaignMeta?: {
        campaignId: string;
        contractId: string;
        scenarioId: string;
      };
      victoryConditions: readonly unknown[];
      opForConfig?: { targetBV?: number };
    };
    expect(encounter.id).toBe('enc-scn-c1-3025-06-15-force-alpha');
    expect(encounter.campaignMeta).toEqual({
      campaignId: 'campaign-cb-1',
      contractId: 'contract-1',
      scenarioId: 'scn-c1-3025-06-15-force-alpha',
    });
    // OpFor force is BV-matched to opForBV.
    expect(encounter.opForConfig?.targetBV).toBe(4500);
    // Victory conditions derived from scenario type ('standup' → destroy-all).
    expect(encounter.victoryConditions.length).toBeGreaterThan(0);

    // Idempotency set records the bridged scenario exactly once.
    expect(updated.bridgedScenarioIds).toEqual([
      'scn-c1-3025-06-15-force-alpha',
    ]);

    // A bridge event is surfaced for the UI.
    expect(
      result.events.some((e) => e.type === 'scenario_encounter_bridged'),
    ).toBe(true);
  });

  it('a re-run does not duplicate the encounter (idempotent by scenarioId)', () => {
    const campaign = makeCampaign();
    const events = [scenarioEvent('scn-dup-1', 'contract-1')];

    // First pass.
    const first = applyScenarioEncounterBridge(campaign, events, CREATED_AT);
    // Second pass on the SAME campaign output + SAME event.
    const second = applyScenarioEncounterBridge(
      first.campaign,
      events,
      CREATED_AT,
    );

    const updated = second.campaign as ICampaign & {
      bridgedEncounters?: Record<string, unknown>;
      bridgedScenarioIds?: readonly string[];
    };
    // Still exactly one encounter, scenario id present exactly once.
    expect(Object.keys(updated.bridgedEncounters ?? {})).toHaveLength(1);
    expect(updated.bridgedScenarioIds).toEqual(['scn-dup-1']);
    // The re-run produced no new events and returned the campaign as-is.
    expect(second.events).toHaveLength(0);
    expect(second.campaign).toBe(first.campaign);
  });

  it('an empty day produces no encounters', () => {
    const campaign = makeCampaign();
    const result = applyScenarioEncounterBridge(campaign, [], CREATED_AT);

    const updated = result.campaign as ICampaign & {
      bridgedEncounters?: Record<string, unknown>;
    };
    expect(updated.bridgedEncounters).toBeUndefined();
    expect(result.events).toHaveLength(0);
    // Campaign returned by reference — no churn for downstream processors.
    expect(result.campaign).toBe(campaign);
  });

  it('non-scenario events are ignored', () => {
    const campaign = makeCampaign();
    const events: IDayEvent[] = [
      { type: 'healing', description: 'x', severity: 'info' },
      { type: 'daily_costs', description: 'y', severity: 'info' },
    ];
    const result = applyScenarioEncounterBridge(campaign, events, CREATED_AT);
    expect(result.campaign).toBe(campaign);
    expect(result.events).toHaveLength(0);
  });

  it('encounter is Draft when the player force is not resolvable, Ready when it is', () => {
    // No matching force → Draft.
    const noForce = applyScenarioEncounterBridge(
      makeCampaign(),
      [scenarioEvent('scn-noforce', 'contract-1')],
      CREATED_AT,
    );
    const draftEnc = (
      noForce.campaign as ICampaign & {
        bridgedEncounters?: Record<string, { status: EncounterStatus }>;
      }
    ).bridgedEncounters?.['scn-noforce'];
    expect(draftEnc?.status).toBe(EncounterStatus.Draft);

    // Force present → Ready.
    const withForce = makeCampaign({
      forces: new Map([
        [
          'force-alpha',
          {
            id: 'force-alpha',
            name: 'Alpha Lance',
            subForceIds: [],
            unitIds: ['unit-1', 'unit-2'],
            forceType: 'standard' as never,
            formationLevel: 'lance' as never,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
      ]),
    });
    const readyResult = applyScenarioEncounterBridge(
      withForce,
      [scenarioEvent('scn-withforce', 'contract-1')],
      CREATED_AT,
    );
    const readyEnc = (
      readyResult.campaign as ICampaign & {
        bridgedEncounters?: Record<string, { status: EncounterStatus }>;
      }
    ).bridgedEncounters?.['scn-withforce'];
    expect(readyEnc?.status).toBe(EncounterStatus.Ready);
  });

  it('multiple scenarios in one day each get an encounter', () => {
    const result = applyScenarioEncounterBridge(
      makeCampaign(),
      [
        scenarioEvent('scn-multi-a', 'contract-1'),
        scenarioEvent('scn-multi-b', 'contract-2'),
      ],
      CREATED_AT,
    );
    const updated = result.campaign as ICampaign & {
      bridgedEncounters?: Record<string, unknown>;
    };
    expect(Object.keys(updated.bridgedEncounters ?? {}).sort()).toEqual([
      'scn-multi-a',
      'scn-multi-b',
    ]);
  });
});
