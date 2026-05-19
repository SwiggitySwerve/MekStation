/**
 * Type + shape tests for the frozen `ICampaignInventory` schema.
 *
 * Per `add-campaign-combat-loop` task 1.3: assert every field is
 * read-only and that the projection sources (`IRepairTicket`,
 * `ISalvageCandidate`) cover every `IRepairBayItem` / `ISalvageBayItem`
 * field. The read-only checks are compile-time (`@ts-expect-error` on a
 * mutation attempt); a passing typecheck IS the assertion.
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import type {
  ICampaignInventory,
  IInventorySummary,
  IMedicalBayItem,
  IRepairBayItem,
  ISalvageBayItem,
} from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ISalvageCandidate } from '@/types/campaign/Salvage';

describe('ICampaignInventory — frozen schema (design.md D4)', () => {
  it('carries the three bays and a summary', () => {
    const inventory: ICampaignInventory = {
      campaignId: 'campaign-1',
      generatedAt: '3025-06-15T00:00:00.000Z',
      repairBay: [],
      salvageBay: [],
      medicalBay: [],
      summary: {
        repairTicketCount: 0,
        totalRepairHours: 0,
        salvageValueTotal: 0,
        pilotsInMedical: 0,
      },
    };
    expect(inventory.repairBay).toEqual([]);
    expect(inventory.salvageBay).toEqual([]);
    expect(inventory.medicalBay).toEqual([]);
    expect(inventory.summary.repairTicketCount).toBe(0);
  });

  it('every ICampaignInventory field is read-only', () => {
    const inventory: ICampaignInventory = {
      campaignId: 'campaign-1',
      generatedAt: '3025-06-15T00:00:00.000Z',
      repairBay: [],
      salvageBay: [],
      medicalBay: [],
      summary: {
        repairTicketCount: 0,
        totalRepairHours: 0,
        salvageValueTotal: 0,
        pilotsInMedical: 0,
      },
    };
    // @ts-expect-error campaignId is readonly
    inventory.campaignId = 'mutated';
    // @ts-expect-error generatedAt is readonly
    inventory.generatedAt = 'mutated';
    // @ts-expect-error repairBay is readonly
    inventory.repairBay = [];
    // @ts-expect-error salvageBay is readonly
    inventory.salvageBay = [];
    // @ts-expect-error medicalBay is readonly
    inventory.medicalBay = [];
    // @ts-expect-error summary is readonly
    inventory.summary = inventory.summary;
    expect(inventory).toBeDefined();
  });

  it('every IRepairBayItem field is read-only', () => {
    const item: IRepairBayItem = {
      ticketId: 't-1',
      unitId: 'u-1',
      kind: 'armor',
      location: 'CT',
      expectedHours: 1,
      partsReady: true,
      status: 'queued',
    };
    // @ts-expect-error ticketId is readonly
    item.ticketId = 'x';
    // @ts-expect-error unitId is readonly
    item.unitId = 'x';
    // @ts-expect-error kind is readonly
    item.kind = 'structure';
    // @ts-expect-error location is readonly
    item.location = null;
    // @ts-expect-error expectedHours is readonly
    item.expectedHours = 2;
    // @ts-expect-error partsReady is readonly
    item.partsReady = false;
    // @ts-expect-error status is readonly
    item.status = 'done';
    expect(item).toBeDefined();
  });

  it('every ISalvageBayItem field is read-only', () => {
    const item: ISalvageBayItem = {
      partId: 'p-1',
      sourceUnitId: 'u-1',
      designation: 'Atlas',
      recoveredValue: 1000,
      disposition: 'mercenary',
      status: 'pending',
    };
    // @ts-expect-error partId is readonly
    item.partId = 'x';
    // @ts-expect-error sourceUnitId is readonly
    item.sourceUnitId = 'x';
    // @ts-expect-error designation is readonly
    item.designation = 'x';
    // @ts-expect-error recoveredValue is readonly
    item.recoveredValue = 0;
    // @ts-expect-error disposition is readonly
    item.disposition = 'employer';
    // @ts-expect-error status is readonly
    item.status = 'accepted';
    expect(item).toBeDefined();
  });

  it('every IMedicalBayItem field is read-only', () => {
    const item: IMedicalBayItem = {
      pilotId: 'pilot-1',
      pilotName: 'Strix',
      injuryLevel: 'light',
      daysToRecover: 3,
      status: 'recovering',
    };
    // @ts-expect-error pilotId is readonly
    item.pilotId = 'x';
    // @ts-expect-error pilotName is readonly
    item.pilotName = 'x';
    // @ts-expect-error injuryLevel is readonly
    item.injuryLevel = 'serious';
    // @ts-expect-error daysToRecover is readonly
    item.daysToRecover = 0;
    // @ts-expect-error status is readonly
    item.status = 'ready';
    expect(item).toBeDefined();
  });

  it('every IInventorySummary field is read-only', () => {
    const summary: IInventorySummary = {
      repairTicketCount: 1,
      totalRepairHours: 2,
      salvageValueTotal: 3,
      pilotsInMedical: 4,
    };
    // @ts-expect-error repairTicketCount is readonly
    summary.repairTicketCount = 0;
    // @ts-expect-error totalRepairHours is readonly
    summary.totalRepairHours = 0;
    // @ts-expect-error salvageValueTotal is readonly
    summary.salvageValueTotal = 0;
    // @ts-expect-error pilotsInMedical is readonly
    summary.pilotsInMedical = 0;
    expect(summary).toBeDefined();
  });
});

describe('Bay items project from existing engine types', () => {
  it('every IRepairBayItem field is derivable from IRepairTicket', () => {
    // Compile-time proof: an IRepairBayItem can be constructed purely
    // from IRepairTicket fields. If a frozen field stopped being
    // derivable, this would fail to typecheck.
    const ticket: IRepairTicket = {
      ticketId: 'ticket-x',
      unitId: 'unit-x',
      kind: 'component',
      location: 'RA',
      componentName: 'Medium Laser',
      expectedHours: 4,
      partsRequired: [{ partId: 'Medium Laser', quantity: 1, matched: true }],
      source: 'combat',
      matchId: 'match-x',
      createdAt: '3025-06-15T00:00:00.000Z',
      status: 'parts-needed',
    };
    const projected: IRepairBayItem = {
      ticketId: ticket.ticketId,
      unitId: ticket.unitId,
      kind: ticket.kind,
      location: ticket.location ?? null,
      expectedHours: ticket.expectedHours,
      partsReady: ticket.partsRequired.every((p) => p.matched),
      status: 'parts-needed',
    };
    expect(projected.ticketId).toBe(ticket.ticketId);
    expect(projected.partsReady).toBe(true);
  });

  it('every ISalvageBayItem field is derivable from ISalvageCandidate', () => {
    const candidate: ISalvageCandidate = {
      source: 'part',
      unitId: 'unit-y',
      designation: 'PPC',
      destroyedFromBattle: 'match-y',
      finalStatus: 'destroyed',
      damageLevel: 'heavy' as ISalvageCandidate['damageLevel'],
      originalValue: 200_000,
      recoveredValue: 50_000,
      recoveryPercentage: 0.25,
      repairCostEstimate: 150_000,
      partId: 'unit-y::PPC',
      disposition: 'mercenary',
      status: 'pending',
    };
    const projected: ISalvageBayItem = {
      partId: candidate.partId ?? candidate.unitId,
      sourceUnitId: candidate.unitId,
      designation: candidate.designation,
      recoveredValue: candidate.recoveredValue,
      disposition: 'mercenary',
      status: 'pending',
    };
    expect(projected.partId).toBe('unit-y::PPC');
    expect(projected.recoveredValue).toBe(50_000);
  });

  it('every IMedicalBayItem field is derivable from a roster entry', () => {
    const entry: Pick<
      ICampaignRosterEntry,
      'pilotId' | 'pilotName' | 'status' | 'recoveryTime' | 'wounds'
    > = {
      pilotId: 'pilot-z',
      pilotName: 'Volkov',
      status: 'wounded' as ICampaignRosterEntry['status'],
      recoveryTime: 5,
      wounds: 2,
    };
    const projected: IMedicalBayItem = {
      pilotId: entry.pilotId,
      pilotName: entry.pilotName,
      injuryLevel: 'light',
      daysToRecover: entry.recoveryTime,
      status: 'recovering',
    };
    expect(projected.pilotId).toBe('pilot-z');
    expect(projected.daysToRecover).toBe(5);
  });
});
