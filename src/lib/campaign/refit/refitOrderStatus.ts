/** Pure status and admission rules; no construction-validation dependencies. */
import type { IRefitOrder } from '@/types/campaign/Refit';

/** K6 active work blocks deployment; proposed orders only reserve admission. */
export function isActiveRefitOrder(
  order: Pick<IRefitOrder, 'status'>,
): boolean {
  return order.status === 'in-progress';
}

export function isOpenRefitOrder(order: Pick<IRefitOrder, 'status'>): boolean {
  return order.status === 'proposed' || isActiveRefitOrder(order);
}

export function getOpenRefitOrders(
  orders: readonly IRefitOrder[],
): readonly IRefitOrder[] {
  return orders.filter(isOpenRefitOrder);
}

/** Old saves retain all orders; callers must not choose a winning target. */
export function getConflictingRefitUnitIds(
  orders: readonly IRefitOrder[],
): ReadonlySet<string> {
  const seen = new Set<string>();
  const conflicts = new Set<string>();
  for (const order of getOpenRefitOrders(orders)) {
    if (seen.has(order.unitId)) conflicts.add(order.unitId);
    seen.add(order.unitId);
  }
  return conflicts;
}

/** Open-order counts retain unit encounter order and never count terminal history. */
export function countOpenRefitOrdersByUnit(
  orders: readonly IRefitOrder[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const order of getOpenRefitOrders(orders)) {
    counts.set(order.unitId, (counts.get(order.unitId) ?? 0) + 1);
  }
  return counts;
}
