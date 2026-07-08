/**
 * Mech Bay — render tests
 *
 * Covers tasks.md 2.5 and the spec scenarios "Mech Bay lists every roster
 * unit" and "Mech Bay empty state".
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import { render, screen } from '@testing-library/react';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import React from 'react';

import type { IUnitIndexEntry } from '@/types/unit/UnitIndex';

import { buildMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import { buildMechBayUnitLoadoutMaps } from '@/pages/gameplay/campaigns/[id]/mech-bay';
import { NodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';

import {
  SAMPLE_REPAIR_BAY,
  SAMPLE_ROSTER_UNITS,
} from '../__fixtures__/bayFixtures';
import { MechBay } from '../MechBay';

function makeTempCatalogWithBVReport(): {
  readonly baseDir: string;
  readonly service: NodeCanonicalUnitService;
} {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-bay-bv-'));
  const catalogDir = path.join(
    baseDir,
    'public',
    'data',
    'units',
    'battlemechs',
  );
  fs.mkdirSync(catalogDir, { recursive: true });
  fs.writeFileSync(
    path.join(catalogDir, 'index.json'),
    JSON.stringify({
      version: 'mech-bay-bv-test',
      generatedAt: '2026-07-08T00:00:00.000Z',
      totalUnits: 2,
      units: [
        {
          id: 'atlas-as7-d',
          chassis: 'Atlas',
          model: 'AS7-D',
          tonnage: 100,
          techBase: 'INNER_SPHERE',
          year: 3025,
          path: 'atlas.json',
        },
        {
          id: 'warhammer-whm-6r',
          chassis: 'Warhammer',
          model: 'WHM-6R',
          tonnage: 70,
          techBase: 'INNER_SPHERE',
          year: 3025,
          path: 'warhammer.json',
        },
      ],
    }),
  );

  const bvReportPath = path.join(baseDir, 'bv-validation-report.json');
  fs.writeFileSync(
    bvReportPath,
    JSON.stringify({
      allResults: [
        {
          unitId: 'atlas-as7-d',
          calculatedBV: 1897,
        },
        {
          unitId: 'warhammer-whm-6r',
          calculatedBV: 1299,
        },
      ],
    }),
  );

  return {
    baseDir,
    service: new NodeCanonicalUnitService(baseDir, { bvReportPath }),
  };
}

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

  it('resolves canonical weight and BV while preserving refit tonnage fallbacks', () => {
    const fixture = makeTempCatalogWithBVReport();
    const units = [
      {
        unitId: 'unit-stock-atlas',
        unitRef: 'atlas-as7-d',
        unitName: 'Atlas',
        chassisVariant: 'AS7-D',
        readiness: 'Ready',
      },
      {
        unitId: 'unit-refit-warhammer',
        unitRef: 'warhammer-whm-6r',
        unitName: 'Warhammer',
        chassisVariant: 'WHM-6R',
        readiness: 'Ready',
      },
      {
        unitId: 'unit-legacy',
        unitName: 'Legacy Unit',
        chassisVariant: 'Unknown',
        readiness: 'Ready',
      },
    ] as const;
    try {
      const rawIndex = fixture.service.getIndexSync();
      expect(rawIndex.find((entry) => entry.id === 'atlas-as7-d')?.bv).toBe(
        undefined,
      );
      expect(
        rawIndex.find((entry) => entry.id === 'warhammer-whm-6r')?.bv,
      ).toBe(undefined);
      const canonicalIndex: readonly IUnitIndexEntry[] =
        fixture.service.getIndexSyncWithBV();
      const { unitTonnageById, unitBattleValueById } =
        buildMechBayUnitLoadoutMaps({
          units,
          unitConfigurations: {
            'unit-refit-warhammer': { tonnage: 75 },
          },
          canonicalIndex,
        });

      render(
        <MechBay
          units={units}
          unitTonnageById={unitTonnageById}
          unitBattleValueById={unitBattleValueById}
          repairBay={[]}
          campaignId="campaign-1"
        />,
      );

      expect(
        screen.getByTestId('mech-bay-loadout-unit-stock-atlas'),
      ).toHaveTextContent('Weight: 100 tons');
      expect(
        screen.getByTestId('mech-bay-loadout-unit-stock-atlas'),
      ).toHaveTextContent('BV: 1,897');
      expect(
        screen.getByTestId('mech-bay-loadout-unit-refit-warhammer'),
      ).toHaveTextContent('Weight: 75 tons');
      expect(
        screen.getByTestId('mech-bay-loadout-unit-refit-warhammer'),
      ).toHaveTextContent('BV: 1,299');
      expect(
        screen.getByTestId('mech-bay-loadout-unit-legacy'),
      ).toHaveTextContent('Weight: not cataloged');
      expect(
        screen.getByTestId('mech-bay-loadout-unit-legacy'),
      ).toHaveTextContent('BV: not cataloged');
    } finally {
      fs.rmSync(fixture.baseDir, { recursive: true, force: true });
    }
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
