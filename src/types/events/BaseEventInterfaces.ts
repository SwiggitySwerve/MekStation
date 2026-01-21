/**
 * Base Event Interfaces
 * Core type definitions for the unified event store system.
 *
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

// =============================================================================
// Event Categories
// =============================================================================

/**
 * Event category types.
 * Each category represents a domain within the application.
 */
export enum EventCategory {
  /** Game events (movement, attacks, damage) */
  Game = 'game',
  /** Campaign events (missions, roster changes) */
  Campaign = 'campaign',
  /** Pilot events (XP, skills, wounds, awards) */
  Pilot = 'pilot',
  /** Repair events (damage repair, costs) */
  Repair = 'repair',
  /** Award events (medals, achievements) */
  Award = 'award',
  /** Meta events (system-level) */
  Meta = 'meta',
}

// =============================================================================
// Context Interfaces
// =============================================================================

/**
 * Event context for scoping events to entities.
 * All fields are optional - only include relevant scopes.
 */
export interface IEventContext {
  /** Campaign ID (if within campaign context) */
  readonly campaignId?: string;
  /** Mission ID (if within mission context) */
  readonly missionId?: string;
  /** Game/battle ID (if within game context) */
  readonly gameId?: string;
  /** Pilot ID (if event relates to a pilot) */
  readonly pilotId?: string;
  /** Unit ID (if event relates to a unit) */
  readonly unitId?: string;
  /** Force ID (if event relates to a force/lance) */
  readonly forceId?: string;
}

/**
 * Causality reference for tracking cause-effect relationships.
 */
export interface ICausedBy {
  /** ID of the triggering event */
  readonly eventId: string;
  /** Type of relationship */
  readonly relationship: 'triggered' | 'derived' | 'undone' | 'superseded';
}

// =============================================================================
// Base Event Interface
// =============================================================================

/**
 * Base interface for all events in the unified event store.
 * Extends game events with category, context, and causality.
 */
export interface IBaseEvent<T = unknown> {
  /** Unique event ID (UUID) */
  readonly id: string;
  /** Monotonically increasing sequence number */
  readonly sequence: number;
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Event category (domain) */
  readonly category: EventCategory;
  /** Event type within category */
  readonly type: string;
  /** Event-specific payload */
  readonly payload: T;
  /** Context scoping (which entities this event relates to) */
  readonly context: IEventContext;
  /** Optional causality reference */
  readonly causedBy?: ICausedBy;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an object is a valid IBaseEvent.
 */
export function isBaseEvent(obj: unknown): obj is IBaseEvent {
  if (typeof obj !== 'object' || obj === null) return false;
  const event = obj as IBaseEvent;
  return (
    typeof event.id === 'string' &&
    typeof event.sequence === 'number' &&
    typeof event.timestamp === 'string' &&
    typeof event.category === 'string' &&
    typeof event.type === 'string' &&
    typeof event.context === 'object' &&
    event.context !== null
  );
}

/**
 * Type guard to check if a string is a valid EventCategory.
 */
export function isEventCategory(value: string): value is EventCategory {
  return Object.values(EventCategory).includes(value as EventCategory);
}

/**
 * Type guard to check if an object is a valid ICausedBy.
 */
export function isCausedBy(obj: unknown): obj is ICausedBy {
  if (typeof obj !== 'object' || obj === null) return false;
  const causedBy = obj as ICausedBy;
  return (
    typeof causedBy.eventId === 'string' &&
    ['triggered', 'derived', 'undone', 'superseded'].includes(causedBy.relationship)
  );
}

/**
 * Type guard to check if an object is a valid IEventContext.
 */
export function isEventContext(obj: unknown): obj is IEventContext {
  if (typeof obj !== 'object' || obj === null) return false;
  const ctx = obj as IEventContext;
  // All fields are optional, but if present must be strings
  if (ctx.campaignId !== undefined && typeof ctx.campaignId !== 'string') return false;
  if (ctx.missionId !== undefined && typeof ctx.missionId !== 'string') return false;
  if (ctx.gameId !== undefined && typeof ctx.gameId !== 'string') return false;
  if (ctx.pilotId !== undefined && typeof ctx.pilotId !== 'string') return false;
  if (ctx.unitId !== undefined && typeof ctx.unitId !== 'string') return false;
  if (ctx.forceId !== undefined && typeof ctx.forceId !== 'string') return false;
  return true;
}

/**
 * Create an event context with the specified scope IDs.
 * Helper function for building context objects.
 */
export function createEventContext(scopes: Partial<IEventContext>): IEventContext {
  return { ...scopes };
}

// =============================================================================
// Event Factory Types
// =============================================================================

/**
 * Parameters for creating a new event.
 */
export interface ICreateEventParams<T = unknown> {
  /** Event category */
  category: EventCategory;
  /** Event type within category */
  type: string;
  /** Event payload */
  payload: T;
  /** Event context */
  context: IEventContext;
  /** Optional causality reference */
  causedBy?: ICausedBy;
}

/**
 * Sequence provider function type.
 */
export type SequenceProvider = () => number;
