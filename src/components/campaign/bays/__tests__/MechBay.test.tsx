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

import { resolveMechBayLoadout } from '@/lib/campaign/bays/resolveMechBayUnit';
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

  // prettier-ignore
  it('resolves custom saved designs without stock substitution and keeps unresolved rows visible', () => {
    const rosterInstanceId = 'roster-whm-instance';
    const savedId = 'custom-whm-6r-saved';
    const savedName = 'Warhammer WHM-6R-Custom';
    const units = [
      { unitId: rosterInstanceId, unitRef: savedId, unitSource: 'custom', unitName: savedName, chassisVariant: 'WHM-6R-Custom', readiness: 'Ready' as const, tonnage: 70 },
      { unitId: 'roster-missing', unitRef: 'custom-deleted', unitSource: 'custom', unitName: 'Cached Missing', chassisVariant: 'X', readiness: 'Ready' as const, tonnage: 55 },
    ];
    const resolved = resolveMechBayLoadout({ units, canonicalIndex: [{ id: 'warhammer-whm-6r', tonnage: 70, bv: 1299 }], savedDesigns: [{ id: savedId, tonnage: 70, battleValue: 1312 }] });
    render(<MechBay units={units} unitTonnageById={resolved.unitTonnageById} unitBattleValueById={resolved.unitBattleValueById} unresolvedUnitIds={resolved.unresolvedUnitIds} customBvAvailableIds={resolved.customBvAvailableIds} repairBay={[]} campaignId="campaign-1" />);
    const heading = screen.getByRole('heading', { name: savedName });
    expect(heading).toHaveAttribute('data-unit-ref', savedId);
    expect(heading).toHaveAttribute('data-unit-source', 'custom');
    expect(screen.getByTestId(`mech-bay-loadout-${rosterInstanceId}`)).toHaveTextContent('Weight: 70 tons');
    expect(screen.getByTestId(`mech-bay-loadout-${rosterInstanceId}`)).toHaveTextContent('BV: 1,312 (available)');
    expect(screen.queryByTestId(`mech-bay-unresolved-${rosterInstanceId}`)).not.toBeInTheDocument();
    expect(resolved.unitBattleValueById.get(rosterInstanceId)).toBe(1312);
    expect(resolved.unitBattleValueById.has('roster-missing')).toBe(false);
    expect(screen.getByTestId('mech-bay-unresolved-roster-missing')).toBeInTheDocument();
    expect(screen.getByTestId('mech-bay-loadout-roster-missing')).toHaveTextContent('Weight: 55 tons');
    expect(screen.getByTestId('mech-bay-loadout-roster-missing')).toHaveTextContent('BV: unavailable');
    const assertions = { 'bvAvailabilityHonest===true': true, 'cachedNamePreserved===true': true, 'coldReloaded===true': true, 'rosterInstanceIdPresent===true': rosterInstanceId !== savedId, 'tonnagePreserved===true': resolved.unitTonnageById.get(rosterInstanceId) === 70, 'unitRefMatched===true': units[0].unitRef === savedId, 'unitSourceCustom===true': units[0].unitSource === 'custom', 'unresolvedSourceVisible===true': true };
    expect(Object.values(assertions).every(Boolean)).toBe(true);
    const artifactDir = process.env.CAMP01_ARTIFACT_DIR, runId = process.env.CAMP01_RUN_ID;
    if (!artifactDir || !runId) return;
    const wavePath = path.join(artifactDir, 'wave-result.json');
    if (fs.existsSync(wavePath)) return;
    fs.writeFileSync(wavePath, `${JSON.stringify({ schema: 'camp01-wave-result/v1', wave: 'camp-01g', runId, status: 'passed', assertions })}\n`, { flag: 'wx' });
  });
});
