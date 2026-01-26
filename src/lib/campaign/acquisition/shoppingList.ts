/**
 * Shopping List Queue Management
 *
 * Immutable queue operations for acquisition requests.
 * All functions return new shopping lists, preserving the original.
 *
 * Based on MekHQ ShoppingList.java queue management patterns.
 */

import { IAcquisitionRequest, IShoppingList } from '@/types/campaign/acquisition/acquisitionTypes';

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
  request: IAcquisitionRequest
): IShoppingList {
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
  requestId: string
): IShoppingList {
  return {
    items: list.items.filter(item => item.id !== requestId),
  };
}

/**
 * Update a request in the shopping list
 * Returns a new list with the updated request
 */
export function updateRequest(
  list: IShoppingList,
  requestId: string,
  updates: Partial<IAcquisitionRequest>
): IShoppingList {
  return {
    items: list.items.map(item =>
      item.id === requestId ? { ...item, ...updates } : item
    ),
  };
}

/**
 * Find a request by ID
 * Returns the request or undefined if not found
 */
export function findRequest(
  list: IShoppingList,
  requestId: string
): IAcquisitionRequest | undefined {
  return list.items.find(item => item.id === requestId);
}

/**
 * Get all pending requests
 * Returns a readonly array of requests with status='pending'
 */
export function getPendingRequests(list: IShoppingList): readonly IAcquisitionRequest[] {
  return list.items.filter(item => item.status === 'pending');
}

/**
 * Get all in-transit requests
 * Returns a readonly array of requests with status='in_transit'
 */
export function getInTransitRequests(list: IShoppingList): readonly IAcquisitionRequest[] {
  return list.items.filter(item => item.status === 'in_transit');
}

/**
 * Get all delivered requests
 * Returns a readonly array of requests with status='delivered'
 */
export function getDeliveredRequests(list: IShoppingList): readonly IAcquisitionRequest[] {
  return list.items.filter(item => item.status === 'delivered');
}
