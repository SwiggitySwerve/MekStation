/** Pure campaign rules shared by persistence and future client pre-flight.
 * @spec openspec/changes/campaign-refit-domain-invariants/specs/campaign-persistence/spec.md
 */
import type { IRefitOrder } from '@/types/campaign/Refit';

import {
  countOpenRefitOrdersByUnit,
  getOpenRefitOrders,
} from '../refit/refitOrderStatus';

export interface IInvariantBody {
  readonly refitOrders?: readonly IRefitOrder[];
}

/** Extend the violation contract when another invariant gains its own legacy rule. */
export interface IInvariantViolation {
  readonly invariant: 'refit-one-open-per-unit';
  readonly unitId: string;
  readonly openCount: number;
  readonly allowedMax: number;
  readonly orderIds: readonly string[];
}

export interface IDomainInvariant {
  readonly id: string;
  /** Each invariant owns its legacy tolerance; null means a new row. */
  check(
    next: IInvariantBody,
    stored: IInvariantBody | null,
  ): readonly IInvariantViolation[];
}

const refitOneOpenPerUnit: IDomainInvariant = {
  id: 'refit-one-open-per-unit',
  check(next, stored) {
    const orders = getOpenRefitOrders(next.refitOrders ?? []);
    const counts = countOpenRefitOrdersByUnit(orders);
    const previous = countOpenRefitOrdersByUnit(stored?.refitOrders ?? []);
    const violations: IInvariantViolation[] = [];
    for (const [unitId, openCount] of counts) {
      const allowedMax = Math.max(1, previous.get(unitId) ?? 0);
      if (openCount <= allowedMax) continue;
      violations.push({
        invariant: 'refit-one-open-per-unit',
        unitId,
        openCount,
        allowedMax,
        orderIds: orders
          .filter((order) => order.unitId === unitId)
          .slice(0, 10)
          .map((order) => order.id),
      });
    }
    return violations;
  },
};

export const CAMPAIGN_DOMAIN_INVARIANTS: readonly IDomainInvariant[] = [
  refitOneOpenPerUnit,
];

export function checkCampaignDomainInvariants(
  next: IInvariantBody,
  stored: IInvariantBody | null,
): readonly IInvariantViolation[] {
  return CAMPAIGN_DOMAIN_INVARIANTS.flatMap((invariant) =>
    invariant.check(next, stored),
  );
}

export interface ICampaignInvariantRefusal {
  readonly kind: 'refused';
  readonly code: 'CAMPAIGN_INVARIANT_VIOLATION';
  readonly reason: string;
  readonly error: string;
  readonly currentVersion: number;
  readonly violations: readonly IInvariantViolation[];
}

export function campaignInvariantRefusal(
  violations: readonly IInvariantViolation[],
  currentVersion: number,
): ICampaignInvariantRefusal {
  const units = violations
    .slice(0, 3)
    .map(
      (violation) =>
        `Unit ${violation.unitId} would have ${violation.openCount} (${violation.orderIds.join(', ')}).`,
    )
    .join(' ');
  return {
    kind: 'refused',
    code: 'CAMPAIGN_INVARIANT_VIOLATION',
    reason: violations[0]?.invariant ?? 'campaign-domain-invariant',
    error: `A unit can have only one open refit order. ${units} Cancel the extra order and save again.`,
    currentVersion,
    violations,
  };
}

/** Validate optional refusal details at the HTTP boundary. */
export function isInvariantViolation(
  value: unknown,
): value is IInvariantViolation {
  if (typeof value !== 'object' || value === null) return false;
  const violation = value as Partial<IInvariantViolation>;
  return (
    violation.invariant === 'refit-one-open-per-unit' &&
    typeof violation.unitId === 'string' &&
    typeof violation.openCount === 'number' &&
    typeof violation.allowedMax === 'number' &&
    Array.isArray(violation.orderIds) &&
    violation.orderIds.every((id: unknown) => typeof id === 'string')
  );
}
