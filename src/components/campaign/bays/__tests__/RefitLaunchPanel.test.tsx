/**
 * Refit Launch Panel — render tests
 *
 * Covers tasks.md 5.4 and the spec scenarios "Launching a refit shows
 * class and estimate" and "Committing a refit creates an order".
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { createRefitOrder } from '@/lib/campaign/refit/refitPipeline';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import { RefitLaunchPanel } from '../RefitLaunchPanel';

const CURRENT: MechBuildConfig = {
  tonnage: 50,
  engineRating: 250,
  engineType: EngineType.STANDARD,
  gyroType: GyroType.STANDARD,
  internalStructureType: InternalStructureType.STANDARD,
  armorType: ArmorTypeEnum.STANDARD,
  totalArmorPoints: 160,
  cockpitType: CockpitType.STANDARD,
  heatSinkType: HeatSinkType.SINGLE,
  totalHeatSinks: 10,
  jumpMP: 0,
};

describe('RefitLaunchPanel', () => {
  it('shows the classified refit class and the estimate', () => {
    render(
      <RefitLaunchPanel
        unitId="unit-1"
        unitName="Atlas AS7-D"
        currentConfiguration={CURRENT}
        onCommit={() => ({})}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByTestId('refit-class-badge')).toBeInTheDocument();
    expect(screen.getByTestId('refit-estimate-cost')).toBeInTheDocument();
    expect(screen.getByTestId('refit-estimate-hours')).toBeInTheDocument();
  });

  it('reclassifies and re-estimates when the target changes', () => {
    render(
      <RefitLaunchPanel
        unitId="unit-1"
        unitName="Atlas AS7-D"
        currentConfiguration={CURRENT}
        onCommit={() => ({})}
        onCancel={() => undefined}
      />,
    );
    // Identical target → Equipment Swap.
    expect(screen.getByTestId('refit-class-badge')).toHaveTextContent(
      'Equipment Swap',
    );
    // Change the engine rating → Chassis Conversion.
    fireEvent.change(screen.getByTestId('refit-field-engine-rating'), {
      target: { value: '300' },
    });
    expect(screen.getByTestId('refit-class-badge')).toHaveTextContent(
      'Chassis Conversion',
    );
  });

  it('invokes onCommit with the target configuration', () => {
    let committedTarget: MechBuildConfig | null = null;
    const onCommit = (target: MechBuildConfig) => {
      committedTarget = target;
      return {};
    };
    render(
      <RefitLaunchPanel
        unitId="unit-1"
        unitName="Atlas AS7-D"
        currentConfiguration={CURRENT}
        onCommit={onCommit}
        onCancel={() => undefined}
      />,
    );
    fireEvent.change(screen.getByTestId('refit-field-armor-points'), {
      target: { value: '200' },
    });
    fireEvent.click(screen.getByTestId('refit-commit'));
    expect(committedTarget).not.toBeNull();
    expect(
      (committedTarget as unknown as MechBuildConfig).totalArmorPoints,
    ).toBe(200);
  });

  it('surfaces the in-progress outcome on a successful commit', () => {
    const onCommit = () => {
      const order = createRefitOrder({
        id: 'r1',
        unitId: 'unit-1',
        currentConfiguration: CURRENT,
        targetConfiguration: { ...CURRENT, totalArmorPoints: 180 },
        createdAt: '3025-02-01T00:00:00.000Z',
      });
      return { order: { ...order, status: 'in-progress' as const } };
    };
    render(
      <RefitLaunchPanel
        unitId="unit-1"
        unitName="Atlas AS7-D"
        currentConfiguration={CURRENT}
        onCommit={onCommit}
        onCancel={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId('refit-commit'));
    expect(screen.getByTestId('refit-commit-result')).toHaveTextContent(
      'work has begun',
    );
  });

  it('surfaces construction-validation errors when the commit is blocked', () => {
    const onCommit = () => {
      const order = createRefitOrder({
        id: 'r1',
        unitId: 'unit-1',
        currentConfiguration: CURRENT,
        targetConfiguration: { ...CURRENT },
        createdAt: '3025-02-01T00:00:00.000Z',
      });
      return {
        order,
        validationErrors: ['Total weight exceeds tonnage'],
      };
    };
    render(
      <RefitLaunchPanel
        unitId="unit-1"
        unitName="Atlas AS7-D"
        currentConfiguration={CURRENT}
        onCommit={onCommit}
        onCancel={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId('refit-commit'));
    expect(screen.getByTestId('refit-validation-errors')).toHaveTextContent(
      'Total weight exceeds tonnage',
    );
  });

  it('invokes onCancel from the cancel button', () => {
    const onCancel = jest.fn();
    render(
      <RefitLaunchPanel
        unitId="unit-1"
        unitName="Atlas AS7-D"
        currentConfiguration={CURRENT}
        onCommit={() => ({})}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByTestId('refit-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
