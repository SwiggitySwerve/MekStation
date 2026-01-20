/**
 * Event Factory Functions
 * Utilities for creating events in the unified event store.
 *
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IBaseEvent,
  ICreateEventParams,
  EventCategory,
  IEventContext,
  ICausedBy,
} from '@/types/events';

// =============================================================================
// Sequence Management
// =============================================================================

/**
 * Global sequence counter for event ordering.
 * In production, this would be persisted.
 */
let globalSequence = 0;

/**
 * Get the next sequence number.
 * Thread-safe within a single JS runtime.
 */
export function getNextSequence(): number {
  return ++globalSequence;
}

/**
 * Get the current sequence number without incrementing.
 */
export function getCurrentSequence(): number {
  return globalSequence;
}

/**
 * Reset the sequence counter (for testing).
 */
export function resetSequence(value = 0): void {
  globalSequence = value;
}

/**
 * Set the sequence to a specific value (for loading persisted state).
 */
export function setSequence(value: number): void {
  globalSequence = value;
}

// =============================================================================
// Event ID Generation
// =============================================================================

/**
 * Generate a unique event ID.
 */
export function createEventId(): string {
  return uuidv4();
}

// =============================================================================
// Event Factory
// =============================================================================

/**
 * Create a new event with all required fields.
 */
export function createEvent<T>(params: ICreateEventParams<T>): IBaseEvent<T> {
  const { category, type, payload, context, causedBy } = params;

  const event: IBaseEvent<T> = {
    id: createEventId(),
    sequence: getNextSequence(),
    timestamp: new Date().toISOString(),
    category,
    type,
    payload,
    context,
    ...(causedBy && { causedBy }),
  };

  return event;
}

/**
 * Create a game event (convenience wrapper).
 */
export function createGameEvent<T>(
  type: string,
  payload: T,
  gameId: string,
  additionalContext?: Partial<IEventContext>,
  causedBy?: ICausedBy
): IBaseEvent<T> {
  return createEvent({
    category: EventCategory.Game,
    type,
    payload,
    context: { gameId, ...additionalContext },
    causedBy,
  });
}

/**
 * Create a campaign event (convenience wrapper).
 */
export function createCampaignEvent<T>(
  type: string,
  payload: T,
  campaignId: string,
  missionId?: string,
  additionalContext?: Partial<IEventContext>,
  causedBy?: ICausedBy
): IBaseEvent<T> {
  return createEvent({
    category: EventCategory.Campaign,
    type,
    payload,
    context: { campaignId, missionId, ...additionalContext },
    causedBy,
  });
}

/**
 * Create a pilot event (convenience wrapper).
 */
export function createPilotEvent<T>(
  type: string,
  payload: T,
  pilotId: string,
  additionalContext?: Partial<IEventContext>,
  causedBy?: ICausedBy
): IBaseEvent<T> {
  return createEvent({
    category: EventCategory.Pilot,
    type,
    payload,
    context: { pilotId, ...additionalContext },
    causedBy,
  });
}

/**
 * Create a repair event (convenience wrapper).
 */
export function createRepairEvent<T>(
  type: string,
  payload: T,
  unitId: string,
  additionalContext?: Partial<IEventContext>,
  causedBy?: ICausedBy
): IBaseEvent<T> {
  return createEvent({
    category: EventCategory.Repair,
    type,
    payload,
    context: { unitId, ...additionalContext },
    causedBy,
  });
}

/**
 * Create an award event (convenience wrapper).
 */
export function createAwardEvent<T>(
  type: string,
  payload: T,
  pilotId: string,
  additionalContext?: Partial<IEventContext>,
  causedBy?: ICausedBy
): IBaseEvent<T> {
  return createEvent({
    category: EventCategory.Award,
    type,
    payload,
    context: { pilotId, ...additionalContext },
    causedBy,
  });
}

/**
 * Create a meta event (convenience wrapper).
 */
export function createMetaEvent<T>(
  type: string,
  payload: T,
  context?: Partial<IEventContext>,
  causedBy?: ICausedBy
): IBaseEvent<T> {
  return createEvent({
    category: EventCategory.Meta,
    type,
    payload,
    context: context ?? {},
    causedBy,
  });
}
