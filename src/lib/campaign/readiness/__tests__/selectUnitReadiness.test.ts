import type { IRepairBayItem } from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { createInitialCombatState } from '@/types/campaign/UnitCombatState';

import { selectUnitReadiness } from '../selectUnitReadiness';

const unit: IRosterUnitProjection = {
  unitId: 'unit-1',
  unitName: 'Atlas',
  chassisVariant: 'AS7-D',
  readiness: 'Ready',
};
const pilot = {
  pilotId: 'pilot-1',
  pilotName: 'Ari',
  status: CampaignPilotStatus.Active,
} satisfies Pick<ICampaignRosterEntry, 'pilotId' | 'pilotName' | 'status'>;
const ticket: IRepairBayItem = {
  ticketId: 'ticket-1',
  unitId: unit.unitId,
  kind: 'armor',
  location: 'CT',
  expectedHours: 4,
  partsReady: true,
  status: 'queued',
};

describe('selectUnitReadiness consolidation', () => {
  it('preserves condition, pilot and queued-repair reasons and actions', () => {
    const result = selectUnitReadiness({
      unit: { ...unit, readiness: 'Damaged' },
      repairTickets: [ticket],
      baseCampaignHref: '/campaign/1',
    });
    expect(result.status).toBe('blocked');
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      'unit_damaged',
      'pilot_unassigned',
      'repair_queued',
    ]);
    expect(result.reasons[0].actionHref).toBe(
      '/campaign/1/repair-bay?unit=unit-1',
    );
    expect(result.repairTicketCount).toBe(1);
  });

  it('excludes terminal repairs and delegates departed pilots to K1', () => {
    const result = selectUnitReadiness({
      unit: { ...unit, pilotId: pilot.pilotId },
      pilot: { ...pilot, departureReason: 'retired' },
      repairTickets: [{ ...ticket, status: 'done' }],
    });
    expect(result.status).toBe('blocked');
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      'pilot_unavailable',
    ]);
    expect(result.repairTicketCount).toBe(0);
  });
});

describe('derived readiness', () => {
  const state = createInitialCombatState({
    unitId: unit.unitId,
    armorPerLocation: { CT: 30, HD: 9 },
    structurePerLocation: { CT: 20, HD: 3 },
  });
  const maxState = {
    unitId: unit.unitId,
    maxArmorPerLocation: state.currentArmorPerLocation,
    maxStructurePerLocation: state.currentStructurePerLocation,
    maxAmmoPerBin: {},
  };
  const assigned = { ...unit, pilotId: pilot.pilotId };

  it('uses repaired combat facts instead of a stale destroyed roster cache', () => {
    expect(
      selectUnitReadiness({
        unit: { ...assigned, readiness: 'Destroyed' },
        pilot,
        combatState: state,
        maxState,
      }),
    ).toMatchObject({ readiness: 'Ready', status: 'eligible', reasons: [] });
  });

  it('reconciles a stale false flag only with complete full-health evidence', () => {
    const stale = { ...state, combatReady: false };
    expect(
      selectUnitReadiness({
        unit: assigned,
        pilot,
        combatState: stale,
        maxState,
      }).readiness,
    ).toBe('Ready');
    expect(
      selectUnitReadiness({ unit: assigned, pilot, combatState: stale }).status,
    ).toBe('blocked');
    expect(
      selectUnitReadiness({
        unit: assigned,
        pilot,
        combatState: stale,
        maxState: { ...maxState, maxStructurePerLocation: { CT: 20 } },
      }).status,
    ).toBe('blocked');
  });

  it('never lets a true flag override destroyed CT structure', () => {
    expect(
      selectUnitReadiness({
        unit: assigned,
        pilot,
        combatState: {
          ...state,
          currentStructurePerLocation: { CT: 0, HD: 3 },
        },
        maxState,
      }),
    ).toMatchObject({ readiness: 'Destroyed', status: 'blocked' });
  });

  it('detects armor-only damage without trusting a Ready cache', () => {
    expect(
      selectUnitReadiness({
        unit: assigned,
        pilot,
        combatState: { ...state, currentArmorPerLocation: { CT: 29, HD: 9 } },
        maxState,
      }),
    ).toMatchObject({ readiness: 'Damaged', status: 'risky' });
  });

  it('preserves a never-deployed unit with no combat state', () => {
    expect(selectUnitReadiness({ unit: assigned, pilot })).toMatchObject({
      readiness: 'Ready',
      status: 'eligible',
    });
  });

  it('preserves journal destruction even with complete healthy combat facts', () => {
    expect(
      selectUnitReadiness({
        unit: assigned,
        pilot,
        combatState: state,
        maxState,
        authority: { kind: 'journal', units: { [unit.unitId]: 'destroyed' } },
      }),
    ).toMatchObject({ readiness: 'Destroyed', status: 'blocked' });
  });

  it('blocks a missing required pilot', () => {
    expect(selectUnitReadiness({ unit }).status).toBe('blocked');
  });

  it.each(['proposed', 'in-progress', 'completed', 'cancelled'] as const)(
    'derives deployment from the existing %s refit status',
    (status) => {
      const result = selectUnitReadiness({
        unit: assigned,
        pilot,
        campaign: { refitOrders: [{ unitId: unit.unitId, status }] },
      });
      expect(result.status).toBe(
        status === 'in-progress' ? 'blocked' : 'eligible',
      );
    },
  );

  it.each([
    'queued',
    'in-progress',
    'parts-needed',
    'completed',
    'cancelled',
  ] as const)('uses K7 classification for a %s canonical ticket', (status) => {
    const result = selectUnitReadiness({
      unit: assigned,
      pilot,
      campaign: {
        repairQueue: [
          {
            ticketId: 'repair-1',
            unitId: unit.unitId,
            kind: 'armor',
            location: 'CT',
            expectedHours: 4,
            partsRequired: [],
            source: 'combat',
            matchId: null,
            createdAt: '3025-01-01',
            status,
          },
        ],
      },
    });
    expect(result.status).toBe(
      status === 'queued'
        ? 'risky'
        : status === 'completed' || status === 'cancelled'
          ? 'eligible'
          : 'blocked',
    );
    expect(result.repairTicketCount).toBe(
      status === 'completed' || status === 'cancelled' ? 0 : 1,
    );
  });

  it('lets an empty canonical queue supersede a stale blocking bay cache', () => {
    expect(
      selectUnitReadiness({
        unit: assigned,
        pilot,
        campaign: { repairQueue: [] },
        repairTickets: [{ ...ticket, status: 'parts-needed' }],
      }).status,
    ).toBe('eligible');
  });

  it.each([
    { heatEnd: 1 },
    { currentArmorPerLocation: { CT: 29, HD: 9 } },
    { destroyedLocations: ['LT'] },
    { ammoRemaining: { bin: 1 } },
  ])(
    'does not clear a false flag with contradictory recovery evidence: %j',
    (patch) => {
      expect(
        selectUnitReadiness({
          unit: assigned,
          pilot,
          maxState,
          combatState: { ...state, combatReady: false, ...patch },
        }).status,
      ).toBe('blocked');
    },
  );
});
