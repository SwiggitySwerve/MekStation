import type { IRepairBayItem } from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';

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
    expect(result.status).toBe('risky');
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
