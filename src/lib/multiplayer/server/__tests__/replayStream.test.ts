/**
 * replayStream unit tests.
 *
 * Pure-helper tests — assert the envelope sequence + chunk math without
 * standing up a host or socket.
 */

import {
  GameEventType,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { streamReplay } from '../reconnection/replayStream';

// =============================================================================
// Helpers
// =============================================================================

function fakeEvent(seq: number): IGameEvent {
  // We only need the `sequence` field for these tests; the rest can
  // be a permissive cast since the helper treats events as opaque.
  return {
    sequence: seq,
    type: GameEventType.GameStarted,
    timestamp: 0,
    payload: {},
  } as unknown as IGameEvent;
}

// =============================================================================
// Tests
// =============================================================================

describe('streamReplay', () => {
  it('emits start, one chunk, and end with toSeq=fromSeq for an empty list', () => {
    const frames = streamReplay('match-x', [], 0);
    expect(frames.start.kind).toBe('ReplayStart');
    expect(frames.chunks.length).toBe(1);
    expect(frames.chunks[0].kind).toBe('ReplayChunk');
    if (frames.chunks[0].kind === 'ReplayChunk') {
      expect(frames.chunks[0].events.length).toBe(0);
    }
    expect(frames.end.kind).toBe('ReplayEnd');
    if (frames.end.kind === 'ReplayEnd') {
      expect(frames.end.toSeq).toBe(0);
    }
  });

  it('packs all events into a single chunk when below the chunk size', () => {
    const events = [fakeEvent(1), fakeEvent(2), fakeEvent(3)];
    const frames = streamReplay('match-x', events, 1, 50);
    expect(frames.chunks.length).toBe(1);
    if (frames.chunks[0].kind === 'ReplayChunk') {
      expect(frames.chunks[0].events.length).toBe(3);
    }
    if (frames.start.kind === 'ReplayStart') {
      expect(frames.start.totalEvents).toBe(3);
      expect(frames.start.fromSeq).toBe(1);
    }
    if (frames.end.kind === 'ReplayEnd') {
      expect(frames.end.toSeq).toBe(3);
    }
  });

  it('paginates events into multiple chunks of the specified size', () => {
    const events = Array.from({ length: 5 }, (_, i) => fakeEvent(i + 10));
    const frames = streamReplay('match-x', events, 0, 2);
    expect(frames.chunks.length).toBe(3); // 2 + 2 + 1
    const sizes = frames.chunks.map((c) =>
      c.kind === 'ReplayChunk' ? c.events.length : -1,
    );
    expect(sizes).toEqual([2, 2, 1]);
    if (frames.end.kind === 'ReplayEnd') {
      expect(frames.end.toSeq).toBe(14); // last event sequence
    }
  });

  it('preserves event ordering across chunks', () => {
    const events = Array.from({ length: 7 }, (_, i) => fakeEvent(i + 1));
    const frames = streamReplay('match-x', events, 0, 3);
    const flat: number[] = [];
    for (const chunk of frames.chunks) {
      if (chunk.kind === 'ReplayChunk') {
        for (const e of chunk.events) {
          flat.push((e as IGameEvent).sequence);
        }
      }
    }
    expect(flat).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('clamps a non-positive chunk size to 1 to avoid infinite loops', () => {
    const events = [fakeEvent(1), fakeEvent(2)];
    const frames = streamReplay('match-x', events, 0, 0);
    // Should produce 2 chunks of 1 event each.
    expect(frames.chunks.length).toBe(2);
  });

  it('stamps every envelope with the matchId', () => {
    const frames = streamReplay('match-y', [fakeEvent(1)], 0);
    expect(frames.start.matchId).toBe('match-y');
    expect(frames.end.matchId).toBe('match-y');
    expect(frames.chunks[0].matchId).toBe('match-y');
  });
});
