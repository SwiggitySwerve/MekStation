import type {
  IPartsInventory,
  IPartsInventoryItem,
} from '@/types/campaign/PartsInventory';
import type { IRepairPartRequirement } from '@/types/campaign/RepairTicket';

export function addInventoryItem(
  inventory: IPartsInventory | undefined,
  item: IPartsInventoryItem,
): IPartsInventory {
  if (item.quantity <= 0) {
    return inventory ?? [];
  }
  const current = inventory ?? [];
  const existingIndex = current.findIndex(
    (entry) => entry.inventoryId === item.inventoryId,
  );
  if (existingIndex < 0) {
    return [...current, item];
  }

  const existing = current[existingIndex];
  const next = [...current];
  next[existingIndex] = {
    ...existing,
    quantity: Math.max(existing.quantity, item.quantity),
  };
  return next.filter((entry) => entry.quantity > 0);
}

export function hasRequiredParts(
  inventory: IPartsInventory | undefined,
  requirements: readonly IRepairPartRequirement[],
): boolean {
  const counts = countParts(inventory);
  return requirements.every((requirement) => {
    if (requirement.matched) return true;
    return (counts.get(requirement.partId) ?? 0) >= requirement.quantity;
  });
}

export function consumeRequiredParts(
  inventory: IPartsInventory | undefined,
  requirements: readonly IRepairPartRequirement[],
): IPartsInventory {
  let next: IPartsInventory = [...(inventory ?? [])];
  for (const requirement of requirements) {
    if (requirement.matched || requirement.quantity <= 0) continue;
    next = consumePart(next, requirement.partId, requirement.quantity);
  }
  return next;
}

function countParts(
  inventory: IPartsInventory | undefined,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const item of inventory ?? []) {
    counts.set(item.partId, (counts.get(item.partId) ?? 0) + item.quantity);
  }
  return counts;
}

function consumePart(
  inventory: readonly IPartsInventoryItem[],
  partId: string,
  quantity: number,
): IPartsInventory {
  let remaining = quantity;
  const next: IPartsInventoryItem[] = [];
  for (const item of inventory) {
    if (item.partId !== partId || remaining <= 0) {
      next.push(item);
      continue;
    }
    const consumed = Math.min(item.quantity, remaining);
    remaining -= consumed;
    const quantityLeft = item.quantity - consumed;
    if (quantityLeft > 0) {
      next.push({ ...item, quantity: quantityLeft });
    }
  }
  return next;
}
