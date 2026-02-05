/**
 * Tests for Hash Utilities
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import { EventCategory, IBaseEvent, IEventChunk } from '@/types/events';

import { createChunk } from '../chunkFactory';
import { createEvent, resetSequence } from '../eventFactory';
// Jest globals are available
import {
  toCanonicalJson,
  sha256Sync,
  hashEvent,
  hashEvents,
  hashState,
  verifyChainIntegrity,
  verifyChunk,
} from '../hashUtils';

describe('toCanonicalJson', () => {
  it('should sort object keys alphabetically', () => {
    const obj = { z: 1, a: 2, m: 3 };
    const json = toCanonicalJson(obj);
    expect(json).toBe('{"a":2,"m":3,"z":1}');
  });

  it('should handle nested objects', () => {
    const obj = { b: { z: 1, a: 2 }, a: 1 };
    const json = toCanonicalJson(obj);
    expect(json).toBe('{"a":1,"b":{"a":2,"z":1}}');
  });

  it('should preserve arrays', () => {
    const obj = { arr: [3, 1, 2], key: 'value' };
    const json = toCanonicalJson(obj);
    expect(json).toBe('{"arr":[3,1,2],"key":"value"}');
  });

  it('should produce consistent output', () => {
    const obj1 = { z: 1, a: 2 };
    const obj2 = { a: 2, z: 1 };
    expect(toCanonicalJson(obj1)).toBe(toCanonicalJson(obj2));
  });
});

describe('sha256Sync', () => {
  it('should produce consistent hashes', () => {
    const data = 'test data';
    const hash1 = sha256Sync(data);
    const hash2 = sha256Sync(data);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different data', () => {
    const hash1 = sha256Sync('data1');
    const hash2 = sha256Sync('data2');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce 64-character hex string', () => {
    const hash = sha256Sync('test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/i);
  });
});

describe('hashEvent', () => {
  beforeEach(() => {
    resetSequence();
  });

  it('should produce consistent hash for same event', () => {
    const event: IBaseEvent = {
      id: 'e1',
      sequence: 1,
      timestamp: '2026-01-20T00:00:00.000Z',
      category: EventCategory.Game,
      type: 'test',
      payload: { data: 'test' },
      context: { gameId: 'g1' },
    };

    const hash1 = hashEvent(event);
    const hash2 = hashEvent(event);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hash for different events', () => {
    const event1: IBaseEvent = {
      id: 'e1',
      sequence: 1,
      timestamp: '2026-01-20T00:00:00.000Z',
      category: EventCategory.Game,
      type: 'test',
      payload: {},
      context: {},
    };

    const event2: IBaseEvent = {
      id: 'e2',
      sequence: 2,
      timestamp: '2026-01-20T00:00:00.000Z',
      category: EventCategory.Game,
      type: 'test',
      payload: {},
      context: {},
    };

    expect(hashEvent(event1)).not.toBe(hashEvent(event2));
  });
});

describe('hashEvents', () => {
  it('should produce consistent hash for same events', () => {
    const events: IBaseEvent[] = [
      {
        id: 'e1',
        sequence: 1,
        timestamp: '2026-01-20T00:00:00.000Z',
        category: EventCategory.Game,
        type: 'test',
        payload: {},
        context: {},
      },
      {
        id: 'e2',
        sequence: 2,
        timestamp: '2026-01-20T00:00:01.000Z',
        category: EventCategory.Game,
        type: 'test2',
        payload: {},
        context: {},
      },
    ];

    const hash1 = hashEvents(events);
    const hash2 = hashEvents(events);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hash for different events', () => {
    const events1: IBaseEvent[] = [
      {
        id: 'e1',
        sequence: 1,
        timestamp: '2026-01-20T00:00:00.000Z',
        category: EventCategory.Game,
        type: 'test',
        payload: {},
        context: {},
      },
    ];

    const events2: IBaseEvent[] = [
      {
        id: 'e2',
        sequence: 1,
        timestamp: '2026-01-20T00:00:00.000Z',
        category: EventCategory.Game,
        type: 'different',
        payload: {},
        context: {},
      },
    ];

    expect(hashEvents(events1)).not.toBe(hashEvents(events2));
  });

  it('should handle empty array', () => {
    const hash = hashEvents([]);
    expect(hash).toBeDefined();
  });
});

describe('hashState', () => {
  it('should produce consistent hash for same state', () => {
    const state = { units: ['u1', 'u2'], turn: 5 };
    const hash1 = hashState(state);
    const hash2 = hashState(state);
    expect(hash1).toBe(hash2);
  });

  it('should produce same hash regardless of key order', () => {
    const state1 = { a: 1, b: 2 };
    const state2 = { b: 2, a: 1 };
    expect(hashState(state1)).toBe(hashState(state2));
  });
});

describe('verifyChainIntegrity', () => {
  beforeEach(() => {
    resetSequence();
  });

  it('should pass for valid chain', () => {
    const events1 = [
      createEvent({
        category: EventCategory.Game,
        type: 'e1',
        payload: {},
        context: {},
      }),
    ];
    const chunk1 = createChunk({ events: events1, previousHash: null });

    const events2 = [
      createEvent({
        category: EventCategory.Game,
        type: 'e2',
        payload: {},
        context: {},
      }),
    ];
    const chunk2 = createChunk({ events: events2, previousHash: chunk1.hash });

    const result = verifyChainIntegrity([chunk1, chunk2]);
    expect(result.valid).toBe(true);
  });

  it('should fail for broken chain', () => {
    const events1 = [
      createEvent({
        category: EventCategory.Game,
        type: 'e1',
        payload: {},
        context: {},
      }),
    ];
    const chunk1 = createChunk({ events: events1, previousHash: null });

    const events2 = [
      createEvent({
        category: EventCategory.Game,
        type: 'e2',
        payload: {},
        context: {},
      }),
    ];
    const chunk2 = createChunk({ events: events2, previousHash: 'wrong-hash' });

    const result = verifyChainIntegrity([chunk1, chunk2]);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(1);
  });

  it('should pass for empty array', () => {
    const result = verifyChainIntegrity([]);
    expect(result.valid).toBe(true);
  });

  it('should fail if first chunk has non-null previousHash', () => {
    const events = [
      createEvent({
        category: EventCategory.Game,
        type: 'e1',
        payload: {},
        context: {},
      }),
    ];
    const chunk = createChunk({ events, previousHash: 'some-hash' });

    const result = verifyChainIntegrity([chunk]);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(0);
  });
});

describe('verifyChunk', () => {
  beforeEach(() => {
    resetSequence();
  });

  it('should pass for unmodified chunk', () => {
    const events = [
      createEvent({
        category: EventCategory.Game,
        type: 'test',
        payload: { data: 'test' },
        context: { gameId: 'g1' },
      }),
    ];
    const chunk = createChunk({ events, previousHash: null });

    expect(verifyChunk(chunk)).toBe(true);
  });

  it('should fail for tampered chunk', () => {
    const events = [
      createEvent({
        category: EventCategory.Game,
        type: 'test',
        payload: { data: 'test' },
        context: { gameId: 'g1' },
      }),
    ];
    const chunk = createChunk({ events, previousHash: null });

    // Tamper with the chunk
    const tampered: IEventChunk = {
      ...chunk,
      summary: { ...chunk.summary, eventCount: 999 },
    };

    expect(verifyChunk(tampered)).toBe(false);
  });
});
