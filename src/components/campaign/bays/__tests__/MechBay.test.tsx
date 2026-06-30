/**
 * Mech Bay — render tests
 *
 * Covers tasks.md 2.5 and the spec scenarios "Mech Bay lists every roster
 * unit" and "Mech Bay empty state".
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { buildMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';

import {
  SAMPLE_REPAIR_BAY,
  SAMPLE_ROSTER_UNITS,
} from '../__fixtures__/bayFixtures';
import { MechBay } from '../MechBay';

describe('MechBay', () => {
  it('renders a row for every roster unit', () => {
    render(
      <MechBay
        units={SAMPLE_ROSTER_UNITS}
        repairBay={SAMPLE_REPAIR_BAY}
        campaignId="campaign-1"
      />,
    );
    for (const unit of SAMPLE_ROSTER_UNITS) {
      expect(
        screen.getByTestId(`mech-bay-row-${unit.unitId}`),
      ).toBeInTheDocument();
    }
  });

  it('shows the damage-state readiness for each unit', () => {
    render(
      <MechBay
        units={SAMPLE_ROSTER_UNITS}
        repairBay={SAMPLE_REPAIR_BAY}
        campaignId="campaign-1"
      />,
    );
    expect(screen.getByText('Damaged')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Destroyed')).toBeInTheDocument();
  });

  it('shows the repair-ticket count per unit', () => {
    render(
      <MechBay
        units={SAMPLE_ROSTER_UNITS}
        repairBay={SAMPLE_REPAIR_BAY}
        campaignId="campaign-1"
      />,
    );
    // unit-atlas has 3 tickets in the fixture, unit-locust has 1.
    expect(
      screen.getByTestId('mech-bay-ticket-count-unit-atlas'),
    ).toHaveTextContent('3 tickets');
    expect(
      screen.getByTestId('mech-bay-ticket-count-unit-locust'),
    ).toHaveTextContent('1 ticket');
    // unit-warhammer has no tickets.
    expect(
      screen.getByTestId('mech-bay-ticket-count-unit-warhammer'),
    ).toHaveTextContent('0 tickets');
  });

  it('provides a Repair Bay drill-down link per row', () => {
    render(
      <MechBay
        units={SAMPLE_ROSTER_UNITS}
        repairBay={SAMPLE_REPAIR_BAY}
        campaignId="campaign-1"
      />,
    );
    const link = screen.getByTestId('mech-bay-drilldown-unit-atlas');
    expect(link).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/repair-bay?unit=unit-atlas',
    );
  });

  it('renders a per-unit Refit affordance and fires onLaunchRefit (CP3)', () => {
    const onLaunchRefit = jest.fn();
    render(
      <MechBay
        units={SAMPLE_ROSTER_UNITS}
        repairBay={SAMPLE_REPAIR_BAY}
        campaignId="campaign-1"
        onLaunchRefit={onLaunchRefit}
      />,
    );
    screen.getByTestId('mech-bay-refit-unit-atlas').click();
    expect(onLaunchRefit).toHaveBeenCalledWith('unit-atlas');
  });

  it('explains mission eligibility and exposes a blocker fix action', () => {
    const projection = buildMissionReadinessProjection({
      campaignId: 'campaign-1',
      mission: undefined,
      units: SAMPLE_ROSTER_UNITS,
      repairBay: SAMPLE_REPAIR_BAY,
      selectedRosterUnitIds: ['unit-locust'],
      baseCampaignHref: '/gameplay/campaigns/campaign-1',
    });
    const readinessByUnitId = new Map(
      projection.units.map((unit) => [unit.unit.unitId, unit]),
    );
    const unitTonnageById = new Map([['unit-locust', 20]]);

    render(
      <MechBay
        units={SAMPLE_ROSTER_UNITS}
        readinessByUnitId={readinessByUnitId}
        unitTonnageById={unitTonnageById}
        repairBay={SAMPLE_REPAIR_BAY}
        campaignId="campaign-1"
      />,
    );

    expect(
      screen.getByTestId('mech-bay-readiness-status-unit-locust'),
    ).toHaveTextContent('blocked');
    expect(screen.getByTestId('mech-bay-pilot-unit-locust')).toHaveTextContent(
      'Unassigned',
    );
    expect(
      screen.getByTestId('mech-bay-eligibility-unit-locust'),
    ).toHaveTextContent('Unit is destroyed and cannot deploy.');
    expect(
      screen.getByTestId('mech-bay-loadout-unit-locust'),
    ).toHaveTextContent('Weight: 20 tons');
    expect(
      screen.getByTestId('mech-bay-loadout-unit-locust'),
    ).toHaveTextContent('Supply: 1 ammo ticket');
    expect(screen.getByTestId('mech-bay-fix-unit-locust')).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/repair-bay?unit=unit-locust',
    );
  });

  it('hides the Refit affordance when no onLaunchRefit handler is wired', () => {
    render(
      <MechBay
        units={SAMPLE_ROSTER_UNITS}
        repairBay={SAMPLE_REPAIR_BAY}
        campaignId="campaign-1"
      />,
    );
    expect(
      screen.queryByTestId('mech-bay-refit-unit-atlas'),
    ).not.toBeInTheDocument();
  });

  it('shows an empty state — not an error — when there are no units', () => {
    render(<MechBay units={[]} repairBay={[]} campaignId="campaign-1" />);
    expect(screen.getByTestId('bay-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('bay-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mech-bay-grid')).not.toBeInTheDocument();
  });
});
