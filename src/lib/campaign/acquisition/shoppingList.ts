/**
 * Shopping List Queue Management
 *
 * Immutable queue operations for acquisition requests.
 * All functions return new shopping lists, preserving the original.
 *
 * Based on MekHQ ShoppingList.java queue management patterns.
 */

import type { IPartsInventoryItem } from '@/types/campaign/PartsInventory';

import {
  IAcquisitionRequest,
  IShoppingList,
} from '@/types/campaign/acquisition/acquisitionTypes';
import { generateUUID } from '@/utils/uuid';

import { campaignDaysBetween } from '../campaignCalendar';

/** MekHQ WAITING_PERIOD default, owner ruling D7.
 * https://github.com/MegaMek/mekhq/blob/e7adc2c6f3b17ec8ad243d30843e22207fe935e4/MekHQ/src/mekhq/campaign/campaignOptions/CampaignOption.java#L224-L225
 */
export const ACQUISITION_RETRY_WAIT_DAYS = 7;

export function acquisitionInventoryId(requestId: string): string {
  return `acquisition-${requestId}`;
}

export function createAcquisitionRequest(
  params: Pick<
    IAcquisitionRequest,
    'partId' | 'partName' | 'quantity' | 'availability' | 'isConsumable'
  >,
): IAcquisitionRequest {
  return {
    ...params,
    id: `req-${generateUUID()}`,
    status: 'pending',
    attempts: 0,
  };
}

export function canAttemptAcquisition(
  request: IAcquisitionRequest,
  date: Date,
): boolean {
  if (request.status !== 'pending') return false;
  if (!request.lastAttemptDate) return true;
  return (
    campaignDaysBetween(new Date(request.lastAttemptDate), date) >=
    ACQUISITION_RETRY_WAIT_DAYS
  );
}

/** Repair old saves without random IDs, stock credits or repeated date changes. */
export function normalizeShoppingList(
  list: IShoppingList | undefined,
  currentDate: Date | string,
  inventory: readonly IPartsInventoryItem[] = [],
): IShoppingList | undefined {
  if (!list?.items) return list;
  const reserved = new Set(list.items.map((item) => item.id));
  const inventoryIds = new Set(inventory.map((item) => item.inventoryId));
  const isReserved = (id: string): boolean =>
    reserved.has(id) || inventoryIds.has(acquisitionInventoryId(id));
  const keepers = new Map<string, number>();
  list.items.forEach((item, index) => {
    const prior = keepers.get(item.id);
    if (
      prior === undefined ||
      (item.status === 'delivered' && list.items[prior].status !== 'delivered')
    ) {
      keepers.set(item.id, index);
    }
  });
  const items = list.items.map((item, index): IAcquisitionRequest => {
    let id = item.id;
    if (
      keepers.get(id) !== index ||
      (item.status !== 'delivered' &&
        inventoryIds.has(acquisitionInventoryId(id)))
    ) {
      const prefix = `${item.id}-legacy-${index + 1}`;
      id = prefix;
      let suffix = 1;
      while (isReserved(id)) id = `${prefix}-${suffix++}`;
      reserved.add(id);
    }
    const status = item.status === 'failed' ? 'pending' : item.status;
    const needsAttemptDate =
      status === 'pending' &&
      (item.status === 'failed' || item.attempts > 0) &&
      (!item.lastAttemptDate ||
        !Number.isFinite(new Date(item.lastAttemptDate).getTime()));
    const lastAttemptDate = needsAttemptDate
      ? new Date(currentDate).toISOString()
      : item.lastAttemptDate;
    if (
      id === item.id &&
      status === item.status &&
      lastAttemptDate === item.lastAttemptDate
    )
      return item;
    return {
      ...item,
      id,
      status,
      ...(lastAttemptDate !== undefined ? { lastAttemptDate } : {}),
    };
  });
  return items.every((item, index) => item === list.items[index])
    ? list
    : { ...list, items };
}

/**
 * Create an empty shopping list
 */
export function createShoppingList(): IShoppingList {
  return { items: [] };
}

/**
 * Add a request to the shopping list
 * Returns a new list with the request appended
 */
export function addRequest(
  list: IShoppingList,
  request: IAcquisitionRequest,
): IShoppingList {
  if (list.items.some((item) => item.id === request.id)) {
    throw new Error(`Acquisition request ID already exists: ${request.id}`);
  }
  return {
    items: [...list.items, request],
  };
}

/**
 * Remove a request from the shopping list by ID
 * Returns a new list without the matching request
 */
export function removeRequest(
  list: IShoppingList,
  requestId: string,
): IShoppingList {
  return {
    items: list.items.filter((item) => item.id !== requestId),
  };
}

/**
 * Update a request in the shopping list
 * Returns a new list with the updated request
 */
export function updateRequest(
  list: IShoppingList,
  requestId: string,
  updates: Partial<IAcquisitionRequest>,
): IShoppingList {
  return {
    items: list.items.map((item) =>
      item.id === requestId ? { ...item, ...updates } : item,
    ),
  };
}

/**
 * Find a request by ID
 * Returns the request or undefined if not found
 */
export function findRequest(
  list: IShoppingList,
  requestId: string,
): IAcquisitionRequest | undefined {
  return list.items.find((item) => item.id === requestId);
}

/**
 * Get all pending requests
 * Returns a readonly array of requests with status='pending'
 */
export function getPendingRequests(
  list: IShoppingList,
): readonly IAcquisitionRequest[] {
  return list.items.filter((item) => item.status === 'pending');
}

/**
 * Get all in-transit requests
 * Returns a readonly array of requests with status='in_transit'
 */
export function getInTransitRequests(
  list: IShoppingList,
): readonly IAcquisitionRequest[] {
  return list.items.filter((item) => item.status === 'in_transit');
}

/**
 * Get all delivered requests
 * Returns a readonly array of requests with status='delivered'
 */
export function getDeliveredRequests(
  list: IShoppingList,
): readonly IAcquisitionRequest[] {
  return list.items.filter((item) => item.status === 'delivered');
}
