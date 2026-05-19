/**
 * Bay UI Test / Storybook Fixtures
 *
 * Shared sample data for the post-battle bay surfaces (CP2a —
 * `add-campaign-bay-ui`). Used by both the Storybook stories and the
 * component / integration tests so the populated states are consistent.
 *
 * @module components/campaign/bays/__fixtures__/bayFixtures
 */

import type {
  IMedicalBayItem,
  IRepairBayItem,
  ISalvageBayItem,
} from '@/types/campaign/CampaignInventory';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

// =============================================================================
// Roster Units (Mech Bay)
// =============================================================================

/** A populated roster — a mix of ready, damaged, and destroyed units. */
export const SAMPLE_ROSTER_UNITS: readonly IRosterUnitProjection[] = [
  {
    unitId: 'unit-atlas',
    unitName: 'Atlas',
    chassisVariant: 'AS7-D',
    readiness: 'Damaged',
  },
  {
    unitId: 'unit-warhammer',
    unitName: 'Warhammer',
    chassisVariant: 'WHM-6R',
    readiness: 'Ready',
  },
  {
    unitId: 'unit-locust',
    unitName: 'Locust',
    chassisVariant: 'LCT-1V',
    readiness: 'Destroyed',
  },
];

// =============================================================================
// Repair Bay
// =============================================================================

/** Repair tickets spanning two units, several kinds and statuses. */
export const SAMPLE_REPAIR_BAY: readonly IRepairBayItem[] = [
  {
    ticketId: 'ticket-1',
    unitId: 'unit-atlas',
    kind: 'armor',
    location: 'CT',
    expectedHours: 6,
    partsReady: true,
    status: 'queued',
  },
  {
    ticketId: 'ticket-2',
    unitId: 'unit-atlas',
    kind: 'component',
    location: 'RA',
    expectedHours: 12,
    partsReady: false,
    status: 'parts-needed',
  },
  {
    ticketId: 'ticket-3',
    unitId: 'unit-atlas',
    kind: 'structure',
    location: 'LT',
    expectedHours: 18,
    partsReady: true,
    status: 'in-progress',
  },
  {
    ticketId: 'ticket-4',
    unitId: 'unit-locust',
    kind: 'ammo',
    location: null,
    expectedHours: 1,
    partsReady: true,
    status: 'queued',
  },
];

// =============================================================================
// Medical Bay
// =============================================================================

/** Injured pilots covering several injury levels and statuses. */
export const SAMPLE_MEDICAL_BAY: readonly IMedicalBayItem[] = [
  {
    pilotId: 'pilot-1',
    pilotName: 'Natasha Kerensky',
    injuryLevel: 'serious',
    daysToRecover: 14,
    status: 'recovering',
  },
  {
    pilotId: 'pilot-2',
    pilotName: 'Morgan Kell',
    injuryLevel: 'light',
    daysToRecover: 0,
    status: 'ready',
  },
  {
    pilotId: 'pilot-3',
    pilotName: 'Grayson Carlyle',
    injuryLevel: 'critical',
    daysToRecover: 30,
    status: 'recovering',
  },
];

// =============================================================================
// Salvage Bay
// =============================================================================

/** Salvage candidates in a mix of pending / accepted / declined states. */
export const SAMPLE_SALVAGE_BAY: readonly ISalvageBayItem[] = [
  {
    partId: 'salvage-atlas',
    sourceUnitId: 'enemy-atlas',
    designation: 'Atlas AS7-D',
    recoveredValue: 4_000_000,
    disposition: 'mercenary',
    status: 'pending',
  },
  {
    partId: 'salvage-ppc',
    sourceUnitId: 'enemy-warhammer',
    designation: 'PPC',
    recoveredValue: 200_000,
    disposition: 'mercenary',
    status: 'accepted',
  },
  {
    partId: 'salvage-srm',
    sourceUnitId: 'enemy-locust',
    designation: 'SRM-4 Launcher',
    recoveredValue: 60_000,
    disposition: 'mercenary',
    status: 'declined',
  },
];
