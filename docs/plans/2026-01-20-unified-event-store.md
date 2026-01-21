# Unified Event Store Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a unified event sourcing infrastructure that captures all state changes across games, campaigns, pilots, and repairs with full auditability, time travel, and verification.

**Architecture:** Immutable append-only event log with chunked storage per mission. State is always derived from events via reducers. Checkpoints after each mission enable fast state reconstruction. Causality chains link events across scopes.

**Tech Stack:** TypeScript, Zustand, IndexedDB (Dexie.js), SHA-256 for verification

---

## Phase 1: Core Event Infrastructure

### Task 1.1: Base Event Types

**Files:**
- Create: `src/types/events/BaseEventInterfaces.ts`
- Create: `src/types/events/index.ts`
- Test: `src/__tests__/types/events/BaseEventInterfaces.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/types/events/BaseEventInterfaces.test.ts
import { describe, it, expect } from '@jest/globals';
import {
  IBaseEvent,
  EventCategory,
  isBaseEvent,
  createEventContext,
} from '@/types/events';

describe('BaseEventInterfaces', () => {
  describe('isBaseEvent', () => {
    it('should validate a well-formed event', () => {
      const event: IBaseEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        sequence: 1,
        timestamp: '2026-01-20T12:00:00.000Z',
        category: EventCategory.Game,
        type: 'movement_declared',
        payload: { unitId: 'unit-1' },
        context: { gameId: 'game-1' },
      };
      expect(isBaseEvent(event)).toBe(true);
    });

    it('should reject event without required fields', () => {
      const invalid = { id: '123', type: 'test' };
      expect(isBaseEvent(invalid)).toBe(false);
    });
  });

  describe('createEventContext', () => {
    it('should create context with all scope IDs', () => {
      const context = createEventContext({
        campaignId: 'camp-1',
        missionId: 'mission-1',
        gameId: 'game-1',
        pilotId: 'pilot-1',
      });
      expect(context.campaignId).toBe('camp-1');
      expect(context.missionId).toBe('mission-1');
    });

    it('should allow partial context', () => {
      const context = createEventContext({ pilotId: 'pilot-1' });
      expect(context.pilotId).toBe('pilot-1');
      expect(context.campaignId).toBeUndefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/types/events/BaseEventInterfaces.test.ts`
Expected: FAIL with "Cannot find module '@/types/events'"

**Step 3: Write minimal implementation**

```typescript
// src/types/events/BaseEventInterfaces.ts
/**
 * Base Event Interfaces
 * Foundation types for the unified event store.
 */

/**
 * Event categories for top-level organization.
 */
export enum EventCategory {
  Game = 'game',
  Campaign = 'campaign',
  Pilot = 'pilot',
  Repair = 'repair',
  Award = 'award',
  Meta = 'meta',
}

/**
 * Event context - scope identifiers for filtering and causality.
 */
export interface IEventContext {
  readonly campaignId?: string;
  readonly missionId?: string;
  readonly gameId?: string;
  readonly pilotId?: string;
  readonly unitId?: string;
  readonly forceId?: string;
}

/**
 * Causality reference - links to triggering event(s).
 */
export interface ICausedBy {
  readonly eventId: string;
  readonly relationship: 'triggered' | 'derived' | 'related';
}

/**
 * Base event interface - all events extend this.
 */
export interface IBaseEvent {
  /** Unique identifier (UUID v4) */
  readonly id: string;
  /** Global sequence number (monotonic) */
  readonly sequence: number;
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Event category */
  readonly category: EventCategory;
  /** Event type (discriminated union tag) */
  readonly type: string;
  /** Type-specific payload */
  readonly payload: Record<string, unknown>;
  /** Scope identifiers */
  readonly context: IEventContext;
  /** Optional causality chain */
  readonly causedBy?: readonly ICausedBy[];
  /** Optional human-readable description */
  readonly description?: string;
}

/**
 * Type guard for base event.
 */
export function isBaseEvent(value: unknown): value is IBaseEvent {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.sequence === 'number' &&
    typeof obj.timestamp === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.payload === 'object' &&
    typeof obj.context === 'object'
  );
}

/**
 * Create event context with optional scope IDs.
 */
export function createEventContext(
  scopes: Partial<IEventContext>
): IEventContext {
  return { ...scopes };
}
```

```typescript
// src/types/events/index.ts
/**
 * Events Type Index
 * Export barrel for event system types.
 */
export * from './BaseEventInterfaces';
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/types/events/BaseEventInterfaces.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/events/ src/__tests__/types/events/
git commit -m "feat(events): add base event interfaces and type guards"
```

---

### Task 1.2: Event Factory Functions

**Files:**
- Create: `src/utils/events/eventFactory.ts`
- Test: `src/__tests__/utils/events/eventFactory.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/utils/events/eventFactory.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createEvent,
  createEventId,
  resetSequence,
  getNextSequence,
} from '@/utils/events/eventFactory';
import { EventCategory } from '@/types/events';

describe('eventFactory', () => {
  beforeEach(() => {
    resetSequence();
  });

  describe('createEventId', () => {
    it('should generate valid UUID v4', () => {
      const id = createEventId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });
  });

  describe('getNextSequence', () => {
    it('should return monotonically increasing numbers', () => {
      const seq1 = getNextSequence();
      const seq2 = getNextSequence();
      const seq3 = getNextSequence();
      expect(seq2).toBe(seq1 + 1);
      expect(seq3).toBe(seq2 + 1);
    });
  });

  describe('createEvent', () => {
    it('should create event with all required fields', () => {
      const event = createEvent({
        category: EventCategory.Game,
        type: 'movement_declared',
        payload: { unitId: 'unit-1', from: { q: 0, r: 0 }, to: { q: 1, r: 0 } },
        context: { gameId: 'game-1' },
      });

      expect(event.id).toBeDefined();
      expect(event.sequence).toBe(1);
      expect(event.timestamp).toBeDefined();
      expect(event.category).toBe(EventCategory.Game);
      expect(event.type).toBe('movement_declared');
      expect(event.payload.unitId).toBe('unit-1');
      expect(event.context.gameId).toBe('game-1');
    });

    it('should include causedBy when provided', () => {
      const event = createEvent({
        category: EventCategory.Pilot,
        type: 'xp_gained',
        payload: { amount: 100 },
        context: { pilotId: 'pilot-1' },
        causedBy: [{ eventId: 'event-123', relationship: 'triggered' }],
      });

      expect(event.causedBy).toHaveLength(1);
      expect(event.causedBy![0].eventId).toBe('event-123');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/utils/events/eventFactory.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/utils/events/eventFactory.ts
/**
 * Event Factory
 * Functions for creating events with proper IDs, sequences, and timestamps.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IBaseEvent,
  EventCategory,
  IEventContext,
  ICausedBy,
} from '@/types/events';

// Global sequence counter (in production, this would be persisted)
let sequenceCounter = 0;

/**
 * Generate a unique event ID.
 */
export function createEventId(): string {
  return uuidv4();
}

/**
 * Get the next sequence number.
 */
export function getNextSequence(): number {
  return ++sequenceCounter;
}

/**
 * Reset sequence counter (for testing).
 */
export function resetSequence(value = 0): void {
  sequenceCounter = value;
}

/**
 * Set sequence counter to a specific value (for hydration from storage).
 */
export function setSequence(value: number): void {
  sequenceCounter = value;
}

/**
 * Create event input parameters.
 */
export interface CreateEventParams {
  category: EventCategory;
  type: string;
  payload: Record<string, unknown>;
  context: IEventContext;
  causedBy?: readonly ICausedBy[];
  description?: string;
}

/**
 * Create a new event with generated ID, sequence, and timestamp.
 */
export function createEvent(params: CreateEventParams): IBaseEvent {
  return {
    id: createEventId(),
    sequence: getNextSequence(),
    timestamp: new Date().toISOString(),
    category: params.category,
    type: params.type,
    payload: params.payload,
    context: params.context,
    causedBy: params.causedBy,
    description: params.description,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/utils/events/eventFactory.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/events/ src/__tests__/utils/events/
git commit -m "feat(events): add event factory with ID and sequence generation"
```

---

### Task 1.3: Event Chunk Types

**Files:**
- Create: `src/types/events/ChunkInterfaces.ts`
- Modify: `src/types/events/index.ts`
- Test: `src/__tests__/types/events/ChunkInterfaces.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/types/events/ChunkInterfaces.test.ts
import { describe, it, expect } from '@jest/globals';
import {
  IEventChunk,
  IChunkSummary,
  ICheckpoint,
  createChunkSummary,
  isEventChunk,
} from '@/types/events';
import { EventCategory } from '@/types/events';

describe('ChunkInterfaces', () => {
  describe('createChunkSummary', () => {
    it('should summarize events in a chunk', () => {
      const events = [
        { id: '1', sequence: 1, category: EventCategory.Game, type: 'movement_declared', context: { pilotId: 'p1' } },
        { id: '2', sequence: 2, category: EventCategory.Game, type: 'movement_declared', context: { pilotId: 'p2' } },
        { id: '3', sequence: 3, category: EventCategory.Game, type: 'damage_applied', context: { pilotId: 'p1' } },
      ];

      const summary = createChunkSummary(events as any);

      expect(summary.eventCount).toBe(3);
      expect(summary.eventTypes['movement_declared']).toBe(2);
      expect(summary.eventTypes['damage_applied']).toBe(1);
      expect(summary.pilotsInvolved).toContain('p1');
      expect(summary.pilotsInvolved).toContain('p2');
    });
  });

  describe('isEventChunk', () => {
    it('should validate well-formed chunk', () => {
      const chunk: IEventChunk = {
        chunkId: '001-mission-1',
        campaignId: 'camp-1',
        sequenceRange: [1, 100],
        timeRange: ['2026-01-20T12:00:00Z', '2026-01-20T13:00:00Z'],
        events: [],
        summary: {
          eventCount: 0,
          eventTypes: {},
          unitsInvolved: [],
          pilotsInvolved: [],
        },
      };
      expect(isEventChunk(chunk)).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/types/events/ChunkInterfaces.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/types/events/ChunkInterfaces.ts
/**
 * Event Chunk Interfaces
 * Types for chunked event storage and checkpoints.
 */

import { IBaseEvent } from './BaseEventInterfaces';

/**
 * Summary of events in a chunk (for quick queries without parsing all events).
 */
export interface IChunkSummary {
  readonly eventCount: number;
  readonly eventTypes: Record<string, number>;
  readonly unitsInvolved: readonly string[];
  readonly pilotsInvolved: readonly string[];
  readonly outcome?: {
    readonly victory: boolean;
    readonly reason: string;
  };
}

/**
 * A chunk of events (typically one mission worth).
 */
export interface IEventChunk {
  readonly chunkId: string;
  readonly campaignId: string;
  readonly sequenceRange: readonly [number, number];
  readonly timeRange: readonly [string, string];
  readonly events: readonly IBaseEvent[];
  readonly summary: IChunkSummary;
  /** SHA-256 hash of events for verification */
  readonly hash?: string;
  /** Hash of previous chunk for chain verification */
  readonly previousHash?: string;
}

/**
 * Campaign manifest - index of all chunks.
 */
export interface ICampaignManifest {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly chunkIds: readonly string[];
  readonly latestSequence: number;
  readonly latestCheckpointId: string;
}

/**
 * Checkpoint - state snapshot at a specific sequence.
 */
export interface ICheckpoint {
  readonly checkpointId: string;
  readonly campaignId: string;
  readonly sequence: number;
  readonly timestamp: string;
  readonly state: {
    readonly campaign: Record<string, unknown>;
    readonly pilots: Record<string, Record<string, unknown>>;
    readonly units: Record<string, Record<string, unknown>>;
    readonly resources: Record<string, number>;
  };
  /** Hash for verification */
  readonly hash?: string;
}

/**
 * Create summary from events.
 */
export function createChunkSummary(events: readonly IBaseEvent[]): IChunkSummary {
  const eventTypes: Record<string, number> = {};
  const unitsSet = new Set<string>();
  const pilotsSet = new Set<string>();

  for (const event of events) {
    // Count event types
    eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;

    // Collect involved entities
    if (event.context.unitId) unitsSet.add(event.context.unitId);
    if (event.context.pilotId) pilotsSet.add(event.context.pilotId);
  }

  return {
    eventCount: events.length,
    eventTypes,
    unitsInvolved: Array.from(unitsSet),
    pilotsInvolved: Array.from(pilotsSet),
  };
}

/**
 * Type guard for event chunk.
 */
export function isEventChunk(value: unknown): value is IEventChunk {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.chunkId === 'string' &&
    typeof obj.campaignId === 'string' &&
    Array.isArray(obj.sequenceRange) &&
    Array.isArray(obj.timeRange) &&
    Array.isArray(obj.events) &&
    typeof obj.summary === 'object'
  );
}
```

Update index:

```typescript
// src/types/events/index.ts
export * from './BaseEventInterfaces';
export * from './ChunkInterfaces';
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/types/events/ChunkInterfaces.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/events/ src/__tests__/types/events/
git commit -m "feat(events): add chunk and checkpoint interfaces"
```

---

### Task 1.4: Event Store Service

**Files:**
- Create: `src/services/events/EventStoreService.ts`
- Test: `src/services/events/__tests__/EventStoreService.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/events/__tests__/EventStoreService.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { EventStoreService } from '../EventStoreService';
import { EventCategory } from '@/types/events';

describe('EventStoreService', () => {
  let store: EventStoreService;

  beforeEach(() => {
    store = new EventStoreService();
  });

  describe('append', () => {
    it('should append event and return with sequence', async () => {
      const event = await store.append({
        category: EventCategory.Game,
        type: 'test_event',
        payload: { value: 42 },
        context: { gameId: 'game-1' },
      });

      expect(event.id).toBeDefined();
      expect(event.sequence).toBe(1);
      expect(event.payload.value).toBe(42);
    });

    it('should maintain sequence order', async () => {
      const e1 = await store.append({
        category: EventCategory.Game,
        type: 'event_1',
        payload: {},
        context: {},
      });
      const e2 = await store.append({
        category: EventCategory.Game,
        type: 'event_2',
        payload: {},
        context: {},
      });

      expect(e2.sequence).toBe(e1.sequence + 1);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await store.append({ category: EventCategory.Game, type: 'a', payload: {}, context: { gameId: 'g1' } });
      await store.append({ category: EventCategory.Pilot, type: 'b', payload: {}, context: { pilotId: 'p1' } });
      await store.append({ category: EventCategory.Game, type: 'c', payload: {}, context: { gameId: 'g1' } });
    });

    it('should filter by category', async () => {
      const events = await store.query({ category: EventCategory.Game });
      expect(events).toHaveLength(2);
    });

    it('should filter by context', async () => {
      const events = await store.query({ context: { gameId: 'g1' } });
      expect(events).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const events = await store.query({ type: 'b' });
      expect(events).toHaveLength(1);
    });
  });

  describe('getEventsInRange', () => {
    it('should return events within sequence range', async () => {
      await store.append({ category: EventCategory.Game, type: 'a', payload: {}, context: {} });
      await store.append({ category: EventCategory.Game, type: 'b', payload: {}, context: {} });
      await store.append({ category: EventCategory.Game, type: 'c', payload: {}, context: {} });

      const events = await store.getEventsInRange(1, 2);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('a');
      expect(events[1].type).toBe('b');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/services/events/__tests__/EventStoreService.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/services/events/EventStoreService.ts
/**
 * Event Store Service
 * In-memory event store with query capabilities.
 * Production implementation would use IndexedDB via Dexie.
 */

import {
  IBaseEvent,
  EventCategory,
  IEventContext,
} from '@/types/events';
import { createEvent, CreateEventParams, resetSequence } from '@/utils/events/eventFactory';

/**
 * Query parameters for filtering events.
 */
export interface EventQuery {
  category?: EventCategory;
  type?: string;
  context?: Partial<IEventContext>;
  fromSequence?: number;
  toSequence?: number;
  fromTimestamp?: string;
  toTimestamp?: string;
  limit?: number;
}

/**
 * Event store service - manages the event log.
 */
export class EventStoreService {
  private events: IBaseEvent[] = [];

  constructor() {
    resetSequence();
  }

  /**
   * Append a new event to the store.
   */
  async append(params: CreateEventParams): Promise<IBaseEvent> {
    const event = createEvent(params);
    this.events.push(event);
    return event;
  }

  /**
   * Append multiple events atomically.
   */
  async appendBatch(paramsList: CreateEventParams[]): Promise<IBaseEvent[]> {
    const events = paramsList.map((params) => createEvent(params));
    this.events.push(...events);
    return events;
  }

  /**
   * Query events with filters.
   */
  async query(query: EventQuery): Promise<readonly IBaseEvent[]> {
    let results = [...this.events];

    if (query.category !== undefined) {
      results = results.filter((e) => e.category === query.category);
    }

    if (query.type !== undefined) {
      results = results.filter((e) => e.type === query.type);
    }

    if (query.context) {
      results = results.filter((e) => {
        for (const [key, value] of Object.entries(query.context!)) {
          if (e.context[key as keyof IEventContext] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    if (query.fromSequence !== undefined) {
      results = results.filter((e) => e.sequence >= query.fromSequence!);
    }

    if (query.toSequence !== undefined) {
      results = results.filter((e) => e.sequence <= query.toSequence!);
    }

    if (query.fromTimestamp !== undefined) {
      results = results.filter((e) => e.timestamp >= query.fromTimestamp!);
    }

    if (query.toTimestamp !== undefined) {
      results = results.filter((e) => e.timestamp <= query.toTimestamp!);
    }

    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get events within a sequence range.
   */
  async getEventsInRange(
    fromSequence: number,
    toSequence: number
  ): Promise<readonly IBaseEvent[]> {
    return this.query({ fromSequence, toSequence });
  }

  /**
   * Get all events (use with caution).
   */
  async getAll(): Promise<readonly IBaseEvent[]> {
    return [...this.events];
  }

  /**
   * Get latest sequence number.
   */
  getLatestSequence(): number {
    return this.events.length > 0
      ? this.events[this.events.length - 1].sequence
      : 0;
  }

  /**
   * Clear all events (for testing).
   */
  clear(): void {
    this.events = [];
    resetSequence();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/services/events/__tests__/EventStoreService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/events/ 
git commit -m "feat(events): add EventStoreService with query capabilities"
```

---

### Task 1.5: Chunk Manager Service

**Files:**
- Create: `src/services/events/ChunkManagerService.ts`
- Test: `src/services/events/__tests__/ChunkManagerService.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/events/__tests__/ChunkManagerService.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ChunkManagerService } from '../ChunkManagerService';
import { EventStoreService } from '../EventStoreService';
import { EventCategory } from '@/types/events';

describe('ChunkManagerService', () => {
  let eventStore: EventStoreService;
  let chunkManager: ChunkManagerService;

  beforeEach(() => {
    eventStore = new EventStoreService();
    chunkManager = new ChunkManagerService(eventStore);
  });

  describe('createChunk', () => {
    it('should create chunk from events in range', async () => {
      // Add some events
      await eventStore.append({ category: EventCategory.Game, type: 'start', payload: {}, context: { gameId: 'g1' } });
      await eventStore.append({ category: EventCategory.Game, type: 'move', payload: {}, context: { gameId: 'g1', pilotId: 'p1' } });
      await eventStore.append({ category: EventCategory.Game, type: 'end', payload: {}, context: { gameId: 'g1' } });

      const chunk = await chunkManager.createChunk({
        chunkId: '001-mission-1',
        campaignId: 'camp-1',
        fromSequence: 1,
        toSequence: 3,
      });

      expect(chunk.chunkId).toBe('001-mission-1');
      expect(chunk.events).toHaveLength(3);
      expect(chunk.summary.eventCount).toBe(3);
      expect(chunk.summary.pilotsInvolved).toContain('p1');
    });
  });

  describe('createCheckpoint', () => {
    it('should create checkpoint with state snapshot', async () => {
      const checkpoint = await chunkManager.createCheckpoint({
        campaignId: 'camp-1',
        sequence: 100,
        state: {
          campaign: { name: 'Test Campaign', mission: 5 },
          pilots: { 'p1': { xp: 500, kills: 3 } },
          units: {},
          resources: { cBills: 10000 },
        },
      });

      expect(checkpoint.checkpointId).toBeDefined();
      expect(checkpoint.sequence).toBe(100);
      expect(checkpoint.state.campaign.name).toBe('Test Campaign');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/services/events/__tests__/ChunkManagerService.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/services/events/ChunkManagerService.ts
/**
 * Chunk Manager Service
 * Manages event chunks and checkpoints.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IEventChunk,
  ICheckpoint,
  createChunkSummary,
} from '@/types/events';
import { EventStoreService } from './EventStoreService';

/**
 * Parameters for creating a chunk.
 */
export interface CreateChunkParams {
  chunkId: string;
  campaignId: string;
  fromSequence: number;
  toSequence: number;
  previousHash?: string;
}

/**
 * Parameters for creating a checkpoint.
 */
export interface CreateCheckpointParams {
  campaignId: string;
  sequence: number;
  state: {
    campaign: Record<string, unknown>;
    pilots: Record<string, Record<string, unknown>>;
    units: Record<string, Record<string, unknown>>;
    resources: Record<string, number>;
  };
}

/**
 * Chunk manager service.
 */
export class ChunkManagerService {
  constructor(private eventStore: EventStoreService) {}

  /**
   * Create a chunk from events in a sequence range.
   */
  async createChunk(params: CreateChunkParams): Promise<IEventChunk> {
    const events = await this.eventStore.getEventsInRange(
      params.fromSequence,
      params.toSequence
    );

    const summary = createChunkSummary(events);

    const timeRange: [string, string] = events.length > 0
      ? [events[0].timestamp, events[events.length - 1].timestamp]
      : [new Date().toISOString(), new Date().toISOString()];

    const chunk: IEventChunk = {
      chunkId: params.chunkId,
      campaignId: params.campaignId,
      sequenceRange: [params.fromSequence, params.toSequence],
      timeRange,
      events,
      summary,
      previousHash: params.previousHash,
      // hash would be computed here in production
    };

    return chunk;
  }

  /**
   * Create a checkpoint with state snapshot.
   */
  async createCheckpoint(params: CreateCheckpointParams): Promise<ICheckpoint> {
    const checkpoint: ICheckpoint = {
      checkpointId: uuidv4(),
      campaignId: params.campaignId,
      sequence: params.sequence,
      timestamp: new Date().toISOString(),
      state: params.state,
      // hash would be computed here in production
    };

    return checkpoint;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/services/events/__tests__/ChunkManagerService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/events/
git commit -m "feat(events): add ChunkManagerService for chunks and checkpoints"
```

---

## Phase 2: Event Verification

### Task 2.1: Hash Utilities

**Files:**
- Create: `src/utils/events/hashUtils.ts`
- Test: `src/__tests__/utils/events/hashUtils.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/utils/events/hashUtils.test.ts
import { describe, it, expect } from '@jest/globals';
import {
  hashEvent,
  hashEvents,
  hashChunk,
  verifyChainIntegrity,
} from '@/utils/events/hashUtils';
import { EventCategory } from '@/types/events';

describe('hashUtils', () => {
  describe('hashEvent', () => {
    it('should produce consistent hash for same event', async () => {
      const event = {
        id: 'test-id',
        sequence: 1,
        timestamp: '2026-01-20T12:00:00Z',
        category: EventCategory.Game,
        type: 'test',
        payload: { value: 42 },
        context: {},
      };

      const hash1 = await hashEvent(event as any);
      const hash2 = await hashEvent(event as any);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should produce different hash for different events', async () => {
      const event1 = { id: '1', sequence: 1, timestamp: '2026-01-20T12:00:00Z', category: EventCategory.Game, type: 'a', payload: {}, context: {} };
      const event2 = { id: '2', sequence: 2, timestamp: '2026-01-20T12:00:00Z', category: EventCategory.Game, type: 'b', payload: {}, context: {} };

      const hash1 = await hashEvent(event1 as any);
      const hash2 = await hashEvent(event2 as any);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyChainIntegrity', () => {
    it('should verify valid chain', async () => {
      const chunk1 = { chunkId: '001', hash: 'abc123', previousHash: undefined };
      const chunk2 = { chunkId: '002', hash: 'def456', previousHash: 'abc123' };
      const chunk3 = { chunkId: '003', hash: 'ghi789', previousHash: 'def456' };

      const result = verifyChainIntegrity([chunk1, chunk2, chunk3] as any);

      expect(result.valid).toBe(true);
      expect(result.brokenAt).toBeUndefined();
    });

    it('should detect broken chain', async () => {
      const chunk1 = { chunkId: '001', hash: 'abc123', previousHash: undefined };
      const chunk2 = { chunkId: '002', hash: 'def456', previousHash: 'WRONG' };

      const result = verifyChainIntegrity([chunk1, chunk2] as any);

      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe('002');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/utils/events/hashUtils.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/utils/events/hashUtils.ts
/**
 * Hash Utilities
 * Cryptographic hashing for event verification.
 */

import { IBaseEvent, IEventChunk } from '@/types/events';

/**
 * Compute SHA-256 hash of a string.
 */
async function sha256(message: string): Promise<string> {
  // Use Web Crypto API (works in browser and Node 18+)
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a single event.
 */
export async function hashEvent(event: IBaseEvent): Promise<string> {
  // Create deterministic JSON (sorted keys)
  const json = JSON.stringify(event, Object.keys(event).sort());
  return sha256(json);
}

/**
 * Hash multiple events (merkle-style: hash of hashes).
 */
export async function hashEvents(events: readonly IBaseEvent[]): Promise<string> {
  const hashes = await Promise.all(events.map(hashEvent));
  return sha256(hashes.join(''));
}

/**
 * Hash a chunk (events + metadata).
 */
export async function hashChunk(chunk: IEventChunk): Promise<string> {
  const eventsHash = await hashEvents(chunk.events);
  const metaJson = JSON.stringify({
    chunkId: chunk.chunkId,
    campaignId: chunk.campaignId,
    sequenceRange: chunk.sequenceRange,
    previousHash: chunk.previousHash,
    eventsHash,
  });
  return sha256(metaJson);
}

/**
 * Result of chain integrity verification.
 */
export interface ChainIntegrityResult {
  valid: boolean;
  brokenAt?: string;
  message?: string;
}

/**
 * Verify chain integrity (each chunk references previous chunk's hash).
 */
export function verifyChainIntegrity(
  chunks: readonly IEventChunk[]
): ChainIntegrityResult {
  for (let i = 1; i < chunks.length; i++) {
    const current = chunks[i];
    const previous = chunks[i - 1];

    if (current.previousHash !== previous.hash) {
      return {
        valid: false,
        brokenAt: current.chunkId,
        message: `Chunk ${current.chunkId} has previousHash ${current.previousHash} but previous chunk hash is ${previous.hash}`,
      };
    }
  }

  return { valid: true };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/utils/events/hashUtils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/events/
git commit -m "feat(events): add hash utilities for event verification"
```

---

## Phase 3: OpenSpec Documents

### Task 3.1: Create add-unified-event-store OpenSpec

**Files:**
- Create: `openspec/changes/add-unified-event-store/proposal.md`
- Create: `openspec/changes/add-unified-event-store/tasks.md`
- Create: `openspec/changes/add-unified-event-store/specs/event-store/spec.md`

**Step 1: Create proposal.md**

```markdown
# Change: Add Unified Event Store

## Why

MekStation needs full auditability across games, campaigns, pilots, and repairs. Users want to:
- Replay any game turn-by-turn
- View campaign history as a timeline
- Track pilot careers across multiple campaigns
- Verify state integrity (no tampering)
- Time travel to any previous state

Current game event sourcing is limited to single sessions. A unified event store extends this to all state changes system-wide.

## What Changes

- Add base event types with causality chains
- Implement chunked event storage (one chunk per mission)
- Add checkpoints after each mission for fast state reconstruction
- Add cryptographic hashing for verification
- Add event query and filtering APIs
- Update existing game events to use new base types

## Dependencies

- Existing `src/utils/gameplay/gameEvents.ts` - will be migrated to new types
- Existing `src/utils/gameplay/gameState.ts` - patterns reused

## Impact

- Affected specs: `event-store` (new capability)
- Affected code: `src/types/events/`, `src/services/events/`, `src/utils/events/`
- Existing game code: Refactor to use unified event types
- Storage: IndexedDB for local persistence

## Success Criteria

- [ ] All state changes emit events to unified store
- [ ] Can reconstruct any historical state from events
- [ ] Events are immutable and append-only
- [ ] Chain integrity is verifiable via hashes
- [ ] Query API supports filtering by type, context, time range
```

**Step 2: Create tasks.md**

```markdown
# Tasks: Unified Event Store

## 1. Core Types

- [x] 1.1 Create base event interfaces (IBaseEvent, EventCategory, IEventContext)
- [x] 1.2 Create event factory functions
- [x] 1.3 Create chunk and checkpoint interfaces
- [ ] 1.4 Create category-specific event types (CampaignEvent, PilotEvent, etc.)

## 2. Storage Layer

- [x] 2.1 Implement EventStoreService (in-memory)
- [x] 2.2 Implement ChunkManagerService
- [ ] 2.3 Add IndexedDB persistence via Dexie
- [ ] 2.4 Implement chunk loading/saving
- [ ] 2.5 Implement checkpoint loading/saving

## 3. Verification

- [x] 3.1 Implement hash utilities (SHA-256)
- [ ] 3.2 Add hash computation to chunk creation
- [ ] 3.3 Add chain integrity verification
- [ ] 3.4 Add event signature support (optional)

## 4. Migration

- [ ] 4.1 Map existing GameEventType to new EventCategory.Game
- [ ] 4.2 Update gameEvents.ts to use createEvent
- [ ] 4.3 Update gameState.ts reducers to work with new types
- [ ] 4.4 Add adapter layer for backwards compatibility

## 5. Integration

- [ ] 5.1 Create useEventStore Zustand store
- [ ] 5.2 Integrate with useGameplayStore
- [ ] 5.3 Add event emission to campaign actions
- [ ] 5.4 Add event emission to pilot actions

## 6. Testing

- [x] 6.1 Unit tests for base types
- [x] 6.2 Unit tests for event factory
- [x] 6.3 Unit tests for EventStoreService
- [x] 6.4 Unit tests for ChunkManagerService
- [x] 6.5 Unit tests for hash utilities
- [ ] 6.6 Integration tests for full event flow
```

**Step 3: Create spec.md**

```markdown
# Specification: Unified Event Store

## ADDED Requirements

### Requirement: Base Event Structure

The system SHALL define a base event structure that all events extend.

#### Scenario: Create game event

- **GIVEN** a game action occurs (movement, attack, etc.)
- **WHEN** the event is created
- **THEN** the event has a unique ID, sequence number, and timestamp
- **AND** the event has a category of "game"
- **AND** the event has context including gameId

#### Scenario: Create campaign event

- **GIVEN** a campaign action occurs (mission complete, roster change)
- **WHEN** the event is created
- **THEN** the event has context including campaignId and missionId
- **AND** the event may reference triggering events via causedBy

### Requirement: Event Immutability

The system SHALL ensure events are immutable once created.

#### Scenario: Append-only storage

- **GIVEN** an event is stored
- **WHEN** any attempt is made to modify it
- **THEN** the modification is rejected
- **AND** the original event remains unchanged

#### Scenario: Sequence integrity

- **GIVEN** events are appended
- **WHEN** querying the event log
- **THEN** events are returned in sequence order
- **AND** no sequence numbers are skipped or duplicated

### Requirement: Chunked Storage

The system SHALL store events in chunks aligned to mission boundaries.

#### Scenario: Mission chunk creation

- **GIVEN** a mission completes
- **WHEN** the chunk is finalized
- **THEN** all events from that mission are stored in one chunk
- **AND** a checkpoint is created with the post-mission state
- **AND** the chunk hash is computed and stored

#### Scenario: Fast state reconstruction

- **GIVEN** a user wants to view state after mission N
- **WHEN** the state is requested
- **THEN** the checkpoint for mission N is loaded directly
- **AND** no event replay is needed for exact checkpoint states

### Requirement: Event Queries

The system SHALL support flexible event queries.

#### Scenario: Filter by category

- **GIVEN** events of multiple categories exist
- **WHEN** querying with category filter
- **THEN** only events of that category are returned

#### Scenario: Filter by context

- **GIVEN** events with various context scopes
- **WHEN** querying with pilotId filter
- **THEN** only events involving that pilot are returned

#### Scenario: Filter by time range

- **GIVEN** events spanning multiple sessions
- **WHEN** querying with timestamp range
- **THEN** only events within that range are returned

### Requirement: Chain Verification

The system SHALL support cryptographic verification of event chains.

#### Scenario: Verify intact chain

- **GIVEN** a campaign with multiple mission chunks
- **WHEN** verification is requested
- **THEN** each chunk's previousHash matches the prior chunk's hash
- **AND** verification passes

#### Scenario: Detect tampering

- **GIVEN** a chunk has been modified
- **WHEN** verification is requested
- **THEN** the hash mismatch is detected
- **AND** the specific broken link is reported
```

**Step 4: Commit**

```bash
git add openspec/changes/add-unified-event-store/
git commit -m "docs(openspec): add unified-event-store specification"
```

---

### Task 3.2: Create add-audit-timeline OpenSpec

**Files:**
- Create: `openspec/changes/add-audit-timeline/proposal.md`
- Create: `openspec/changes/add-audit-timeline/tasks.md`
- Create: `openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md`

**Step 1: Create proposal.md**

```markdown
# Change: Add Audit Timeline

## Why

With the unified event store capturing all state changes, users need ways to view and navigate this history. The audit timeline provides multiple views for different use cases:
- Timeline feed for narrative/storytelling
- Diff view for debugging
- Query interface for analytics
- Replay player for game review

## What Changes

- Add timeline view component (chronological event feed)
- Add diff view component (compare two states)
- Add event query builder UI
- Add replay player with scrubbing
- Add causality graph visualization
- Integrate views into existing pages

## Dependencies

- `add-unified-event-store` - Event data source
- Existing gameplay UI components

## Impact

- Affected specs: `audit-timeline` (new capability)
- Affected code: `src/components/audit/`, `src/pages/audit/`
- New pages: Audit timeline, campaign history, pilot career

## Success Criteria

- [ ] View chronological event timeline with filtering
- [ ] Compare any two states side-by-side
- [ ] Search events by type, actor, time
- [ ] Replay games with play/pause/scrub
- [ ] Trace causality chains visually
```

**Step 2: Create tasks.md**

```markdown
# Tasks: Audit Timeline

## 1. Timeline View

- [ ] 1.1 Create EventTimelineItem component
- [ ] 1.2 Create EventTimeline component (virtualized list)
- [ ] 1.3 Add category/type filtering
- [ ] 1.4 Add context filtering (campaign, pilot, unit)
- [ ] 1.5 Add time range picker
- [ ] 1.6 Add infinite scroll / pagination

## 2. Diff View

- [ ] 2.1 Create StateDiffView component
- [ ] 2.2 Implement state comparison logic
- [ ] 2.3 Add checkpoint selector (before/after)
- [ ] 2.4 Highlight changed fields
- [ ] 2.5 Support nested object diffing

## 3. Query Builder

- [ ] 3.1 Create EventQueryBuilder component
- [ ] 3.2 Add filter chips for active filters
- [ ] 3.3 Add saved query support
- [ ] 3.4 Add export results (JSON, CSV)

## 4. Replay Player

- [ ] 4.1 Create ReplayControls component (play/pause/step)
- [ ] 4.2 Create ReplayTimeline component (scrubber)
- [ ] 4.3 Integrate with existing GameplayLayout
- [ ] 4.4 Add playback speed control
- [ ] 4.5 Add event-by-event stepping

## 5. Causality Graph

- [ ] 5.1 Create CausalityGraph component
- [ ] 5.2 Implement DAG layout algorithm
- [ ] 5.3 Add zoom/pan controls
- [ ] 5.4 Add node click to show event details
- [ ] 5.5 Highlight path from selected event to root

## 6. Pages

- [ ] 6.1 Create AuditTimelinePage
- [ ] 6.2 Add audit tab to CampaignDetailPage
- [ ] 6.3 Add career timeline to PilotDetailPage
- [ ] 6.4 Add replay mode to game detail

## 7. Testing

- [ ] 7.1 Unit tests for timeline components
- [ ] 7.2 Unit tests for diff logic
- [ ] 7.3 Integration tests for query builder
- [ ] 7.4 E2E tests for replay player
```

**Step 3: Create spec.md**

```markdown
# Specification: Audit Timeline

## ADDED Requirements

### Requirement: Timeline View

The system SHALL display events in a chronological timeline.

#### Scenario: View campaign timeline

- **GIVEN** a campaign with completed missions
- **WHEN** viewing the campaign timeline
- **THEN** events are displayed in chronological order
- **AND** events are grouped by mission
- **AND** each event shows type, timestamp, and summary

#### Scenario: Filter timeline

- **GIVEN** a timeline with many events
- **WHEN** applying a filter (e.g., "damage" events only)
- **THEN** only matching events are shown
- **AND** the filter is clearly indicated

### Requirement: State Diff View

The system SHALL compare states at different points in time.

#### Scenario: Compare mission states

- **GIVEN** a campaign with multiple missions
- **WHEN** selecting "after mission 3" and "after mission 5"
- **THEN** a side-by-side diff is shown
- **AND** changed values are highlighted
- **AND** added/removed items are indicated

### Requirement: Event Query

The system SHALL support searching and filtering events.

#### Scenario: Search by pilot

- **GIVEN** events involving multiple pilots
- **WHEN** searching for a specific pilot
- **THEN** all events where that pilot was involved are shown
- **AND** results include events where pilot was actor or target

#### Scenario: Search by time range

- **GIVEN** events spanning weeks
- **WHEN** filtering to a specific date range
- **THEN** only events within that range are shown

### Requirement: Replay Player

The system SHALL enable replay of completed games.

#### Scenario: Play replay

- **GIVEN** a completed game
- **WHEN** clicking "Play Replay"
- **THEN** the game state animates through events
- **AND** playback can be paused and resumed

#### Scenario: Scrub to position

- **GIVEN** a replay in progress
- **WHEN** dragging the timeline scrubber
- **THEN** the game state jumps to that point
- **AND** the hex map and record sheets update

### Requirement: Causality Visualization

The system SHALL visualize cause-effect relationships between events.

#### Scenario: View causality chain

- **GIVEN** a pilot has 3 wounds
- **WHEN** clicking "Why?" on the wounds
- **THEN** a graph shows the chain of events leading to wounds
- **AND** each node links to its triggering event(s)
```

**Step 4: Commit**

```bash
git add openspec/changes/add-audit-timeline/
git commit -m "docs(openspec): add audit-timeline specification"
```

---

## Summary

This plan creates the foundation for a unified event store with full auditability. The implementation is structured as:

1. **Phase 1: Core Infrastructure** (Tasks 1.1-1.5)
   - Base types, factory functions, storage service, chunk manager

2. **Phase 2: Verification** (Task 2.1)
   - Cryptographic hashing for integrity checks

3. **Phase 3: OpenSpecs** (Tasks 3.1-3.2)
   - Formal specifications for event store and audit timeline

**Estimated effort:** 2-3 days for Phase 1-2, plus UI work for audit timeline.

**Next steps after this plan:**
- Migrate existing game events to new types
- Add IndexedDB persistence
- Build audit timeline UI components
