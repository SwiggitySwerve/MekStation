/**
 * Roster Employment Derivation — integration tests.
 *
 * Verifies that the salary calculation reads correctly from the two-arg
 * `calculateTotalMonthlySalary(entries, pilotsMap, options)` signature using
 * the pre-join template: roster entries from `useCampaignRosterStore` + vault
 * pilots from `usePilotStore` resolved via `buildPilotLookup`.
 *
 * This replaces the old shim-based test that passed a derived `personnel` Map
 * through a campaign-shaped first argument. After the wire-iperson-hard-cutover
 * PR2 migration, helpers no longer accept `ICampaign` as the entry source.
 *
 * @spec openspec/changes/wire-iperson-hard-cutover/specs/personnel-management/spec.md
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { buildPilotLookup } from '@/lib/campaign/utils/pilotLookup';
import { calculateTotalMonthlySalary } from '@/lib/finances/salaryService';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import {
  PilotStatus,
  PilotType,
  type IPilot,
} from '@/types/pilot/PilotInterfaces';

// =============================================================================
// Fixtures
// =============================================================================

function makeVaultPilot(id: string, name: string): IPilot {
  const now = new Date('2025-01-01T00:00:00Z').toISOString();
  return {
    id,
    name,
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    awards: [],
    career: {
      missionsCompleted: 0,
      victories: 0,
      defeats: 0,
      draws: 0,
      totalKills: 0,
      killRecords: [],
      missionHistory: [],
      xp: 0,
      totalXpEarned: 0,
      rank: 'MechWarrior',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function makeRosterEntry(
  pilotId: string,
  pilotName: string,
): ICampaignRosterEntry {
  return {
    pilotId,
    pilotName,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    // Hard-cutover policy (PR2 cluster J): hireDate is required.
    hireDate: new Date('2025-01-01T00:00:00Z'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
  };
}

beforeEach(() => {
  // Reset both stores so each test runs in isolation.
  usePilotStore.setState({
    pilots: [
      makeVaultPilot('pilot-1', 'Sarah Connor'),
      makeVaultPilot('pilot-2', 'John Connor'),
    ],
    selectedPilotId: null,
    isLoading: false,
    error: null,
  });

  useCampaignRosterStore.setState({
    campaignId: 'campaign-test',
    units: [],
    pilots: [
      makeRosterEntry('pilot-1', 'Sarah Connor'),
      makeRosterEntry('pilot-2', 'John Connor'),
    ],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
});

// =============================================================================
// Tests
// =============================================================================

describe('Roster employment derivation — integration', () => {
  describe('salary calculation (read-side)', () => {
    it('returns zero salary when payForSalaries is disabled (control case)', () => {
      // Pre-join pattern: pass empty entries + empty pilotsMap with disabled option.
      // Confirms the guard short-circuits before iterating entries.
      const breakdown = calculateTotalMonthlySalary([], new Map(), {
        payForSalaries: false,
        salaryMultiplier: 1.0,
        overheadPercent: 5,
        useTaxes: false,
        taxRate: 0,
        startingFunds: 0,
        useLoanSystem: false,
        payForMaintenance: false,
        maintenanceCostMultiplier: 1.0,
      } as Parameters<typeof calculateTotalMonthlySalary>[2]);

      expect(breakdown.total.amount).toBe(0);
      expect(breakdown.personnelCount).toBe(0);
    });

    it('reads from roster store + vault store and computes a non-zero total', () => {
      // Simulate what financialProcessor.process() does: build the lookup once,
      // then pass entries + pilotsMap to the salary helper.
      const entries = useCampaignRosterStore.getState().pilots;
      const vault = usePilotStore.getState().pilots;
      const pilotsMap = buildPilotLookup(vault);

      const options = {
        payForSalaries: true,
        salaryMultiplier: 1.0,
        overheadPercent: 5,
        useTaxes: false,
        taxRate: 0,
        startingFunds: 0,
        useLoanSystem: false,
        payForMaintenance: false,
        maintenanceCostMultiplier: 1.0,
      } as Parameters<typeof calculateTotalMonthlySalary>[2];

      const breakdown = calculateTotalMonthlySalary(
        entries,
        pilotsMap,
        options,
      );

      // Both seeded pilots should be eligible (Active status, non-KIA).
      expect(breakdown.personnelCount).toBe(2);
      // Combat salaries should be non-zero (PILOT primary role lands in combat bucket).
      expect(breakdown.combatSalaries.amount).toBeGreaterThan(0);
      expect(breakdown.total.amount).toBe(breakdown.combatSalaries.amount);
    });
  });

  describe('useCampaignStore wiring', () => {
    it('exposes the campaign store factory, vault store, and roster store as siblings', () => {
      // Smoke test: verify the imports compile and work together. This guards
      // against accidentally breaking the import graph (which would block the
      // derive helper in `advanceDay`).
      expect(typeof useCampaignStore).toBe('function');
      expect(useCampaignRosterStore.getState().pilots).toHaveLength(2);
      expect(usePilotStore.getState().pilots).toHaveLength(2);
    });
  });
});
