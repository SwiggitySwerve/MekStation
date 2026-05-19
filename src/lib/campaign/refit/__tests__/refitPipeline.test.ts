/**
 * Tests for the refit pipeline — order creation, the construction-validation
 * gate, and hour advancement.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import {
  advanceRefitOrder,
  applyRefitHours,
  createRefitOrder,
} from '../refitPipeline';

/** A construction-valid 50-ton baseline. */
const VALID: MechBuildConfig = {
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

/** A construction-INVALID target — an out-of-range engine rating. */
const INVALID: MechBuildConfig = { ...VALID, engineRating: 9999 };

const CREATED_AT = '3025-02-01T00:00:00.000Z';

describe('createRefitOrder', () => {
  it('creates a proposed order carrying every required field', () => {
    const order = createRefitOrder({
      id: 'refit-1',
      unitId: 'unit-1',
      currentConfiguration: VALID,
      targetConfiguration: { ...VALID, totalArmorPoints: 200 },
      createdAt: CREATED_AT,
    });

    expect(order.unitId).toBe('unit-1');
    expect(order.targetConfiguration.totalArmorPoints).toBe(200);
    expect(order.refitClass).toBeDefined();
    expect(order.estimatedCost).toBeGreaterThan(0);
    expect(order.estimatedHours).toBeGreaterThan(0);
    expect(order.hoursCompleted).toBe(0);
    expect(order.status).toBe('proposed');
  });
});

describe('advanceRefitOrder — construction-validation gate', () => {
  it('advances a proposed order with a valid target to in-progress', () => {
    const order = createRefitOrder({
      id: 'refit-2',
      unitId: 'unit-1',
      currentConfiguration: VALID,
      targetConfiguration: { ...VALID, totalArmorPoints: 180 },
      createdAt: CREATED_AT,
    });

    const result = advanceRefitOrder(order);
    expect(result.advanced).toBe(true);
    expect(result.order.status).toBe('in-progress');
    expect(result.errors).toEqual([]);
    expect(result.order.validationErrors).toBeUndefined();
  });

  it('keeps a proposed order proposed and surfaces errors for an invalid target', () => {
    const order = createRefitOrder({
      id: 'refit-3',
      unitId: 'unit-1',
      currentConfiguration: VALID,
      targetConfiguration: INVALID,
      createdAt: CREATED_AT,
    });

    const result = advanceRefitOrder(order);
    expect(result.advanced).toBe(false);
    expect(result.order.status).toBe('proposed');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.order.validationErrors?.length).toBeGreaterThan(0);
  });

  it('is a no-op for an order that is not proposed', () => {
    const order = createRefitOrder({
      id: 'refit-4',
      unitId: 'unit-1',
      currentConfiguration: VALID,
      targetConfiguration: { ...VALID, totalArmorPoints: 180 },
      createdAt: CREATED_AT,
    });
    const inProgress = { ...order, status: 'in-progress' as const };
    const result = advanceRefitOrder(inProgress);
    expect(result.advanced).toBe(false);
    expect(result.order).toBe(inProgress);
  });
});

describe('applyRefitHours', () => {
  function inProgressOrder(estimatedHours: number) {
    const order = createRefitOrder({
      id: 'refit-5',
      unitId: 'unit-1',
      currentConfiguration: VALID,
      targetConfiguration: { ...VALID, totalArmorPoints: 180 },
      createdAt: CREATED_AT,
    });
    return { ...order, status: 'in-progress' as const, estimatedHours };
  }

  it('advances hoursCompleted by the available hours', () => {
    const order = inProgressOrder(100);
    const result = applyRefitHours(order, 8);
    expect(result.order.hoursCompleted).toBe(8);
    expect(result.completed).toBe(false);
    expect(result.order.status).toBe('in-progress');
  });

  it('completes the order when the hour budget is met', () => {
    const order = { ...inProgressOrder(16), hoursCompleted: 8 };
    const result = applyRefitHours(order, 8);
    expect(result.order.hoursCompleted).toBe(16);
    expect(result.completed).toBe(true);
    expect(result.order.status).toBe('completed');
  });

  it('never overshoots the hour budget', () => {
    const order = { ...inProgressOrder(10), hoursCompleted: 8 };
    const result = applyRefitHours(order, 8);
    expect(result.order.hoursCompleted).toBe(10);
    expect(result.hoursConsumed).toBe(2);
  });

  it('is a no-op for an order that is not in-progress', () => {
    const order = inProgressOrder(100);
    const proposed = { ...order, status: 'proposed' as const };
    const result = applyRefitHours(proposed, 8);
    expect(result.order).toBe(proposed);
    expect(result.hoursConsumed).toBe(0);
  });
});
