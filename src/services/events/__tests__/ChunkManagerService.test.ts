/**
 * Tests for Chunk Manager Service
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

// Jest globals are available
import { ChunkManagerService, getChunkManager, resetChunkManager } from '../ChunkManagerService';
import { createEvent, resetSequence } from '@/utils/events/eventFactory';
import { EventCategory } from '@/types/events';

describe('ChunkManagerService', () => {
  let manager: ChunkManagerService;

  beforeEach(() => {
    manager = new ChunkManagerService();
    resetSequence();
  });

  describe('createChunk', () => {
    it('should create a chunk from events', () => {
      const events = [
        createEvent({ category: EventCategory.Game, type: 'e1', payload: {}, context: {} }),
        createEvent({ category: EventCategory.Game, type: 'e2', payload: {}, context: {} }),
      ];

      const chunk = manager.createChunk({ events });

      expect(chunk.chunkId).toBeDefined();
      expect(chunk.events.length).toBe(2);
      expect(chunk.sequenceRange.from).toBe(1);
      expect(chunk.sequenceRange.to).toBe(2);
      expect(chunk.hash).toBeDefined();
      expect(chunk.previousHash).toBeNull();
    });

    it('should store the chunk', () => {
      const events = [
        createEvent({ category: EventCategory.Game, type: 'e1', payload: {}, context: {} }),
      ];

      const chunk = manager.createChunk({ events });
      const loaded = manager.loadChunk(chunk.chunkId);

      expect(loaded).toBeDefined();
      expect(loaded?.chunkId).toBe(chunk.chunkId);
    });

    it('should link chunks via previousHash', () => {
      const events1 = [
        createEvent({ category: EventCategory.Game, type: 'e1', payload: {}, context: {} }),
      ];
      const chunk1 = manager.createChunk({ events: events1, campaignId: 'c1' });

      const events2 = [
        createEvent({ category: EventCategory.Game, type: 'e2', payload: {}, context: {} }),
      ];
      const chunk2 = manager.createChunk({ events: events2, campaignId: 'c1' });

      expect(chunk2.previousHash).toBe(chunk1.hash);
    });

    it('should throw for empty events', () => {
      expect(() => manager.createChunk({ events: [] })).toThrow();
    });
  });

  describe('loadChunk', () => {
    it('should return undefined for non-existent chunk', () => {
      const loaded = manager.loadChunk('non-existent');
      expect(loaded).toBeUndefined();
    });
  });

  describe('getChunksForCampaign', () => {
    it('should return all chunks for a campaign in order', () => {
      const events1 = [
        createEvent({ category: EventCategory.Game, type: 'e1', payload: {}, context: {} }),
      ];
      manager.createChunk({ events: events1, campaignId: 'c1' });

      const events2 = [
        createEvent({ category: EventCategory.Game, type: 'e2', payload: {}, context: {} }),
      ];
      manager.createChunk({ events: events2, campaignId: 'c1' });

      const events3 = [
        createEvent({ category: EventCategory.Game, type: 'e3', payload: {}, context: {} }),
      ];
      manager.createChunk({ events: events3, campaignId: 'c2' }); // Different campaign

      const c1Chunks = manager.getChunksForCampaign('c1');
      expect(c1Chunks.length).toBe(2);
      expect(c1Chunks[0].sequenceRange.to).toBeLessThan(c1Chunks[1].sequenceRange.from);
    });

    it('should return empty array for non-existent campaign', () => {
      const chunks = manager.getChunksForCampaign('non-existent');
      expect(chunks.length).toBe(0);
    });
  });

  describe('createCheckpoint', () => {
    it('should create a checkpoint', () => {
      const state = { turn: 5, units: ['u1', 'u2'] };
      const checkpoint = manager.createCheckpoint({
        sequence: 100,
        state,
        campaignId: 'c1',
      });

      expect(checkpoint.checkpointId).toBeDefined();
      expect(checkpoint.sequence).toBe(100);
      expect(checkpoint.state).toEqual(state);
      expect(checkpoint.hash).toBeDefined();
    });

    it('should store the checkpoint', () => {
      const checkpoint = manager.createCheckpoint({
        sequence: 50,
        state: { data: 'test' },
      });

      const loaded = manager.loadCheckpoint(checkpoint.checkpointId);
      expect(loaded).toBeDefined();
      expect(loaded?.state).toEqual({ data: 'test' });
    });
  });

  describe('getLatestCheckpoint', () => {
    it('should return the latest checkpoint for a campaign', () => {
      manager.createManifest('c1');

      manager.createCheckpoint({ sequence: 10, state: { v: 1 }, campaignId: 'c1' });
      const cp2 = manager.createCheckpoint({ sequence: 20, state: { v: 2 }, campaignId: 'c1' });

      const latest = manager.getLatestCheckpoint('c1');
      expect(latest?.checkpointId).toBe(cp2.checkpointId);
    });

    it('should return undefined for campaign without checkpoints', () => {
      const latest = manager.getLatestCheckpoint('no-checkpoints');
      expect(latest).toBeUndefined();
    });
  });

  describe('findCheckpointBefore', () => {
    it('should find nearest checkpoint before sequence', () => {
      manager.createCheckpoint({ sequence: 10, state: { v: 1 }, campaignId: 'c1' });
      const cp2 = manager.createCheckpoint({ sequence: 50, state: { v: 2 }, campaignId: 'c1' });
      manager.createCheckpoint({ sequence: 100, state: { v: 3 }, campaignId: 'c1' });

      const found = manager.findCheckpointBefore('c1', 75);
      expect(found?.checkpointId).toBe(cp2.checkpointId);
    });

    it('should return undefined if no checkpoint exists before sequence', () => {
      manager.createCheckpoint({ sequence: 100, state: {}, campaignId: 'c1' });

      const found = manager.findCheckpointBefore('c1', 50);
      expect(found).toBeUndefined();
    });
  });

  describe('manifest operations', () => {
    it('should create and retrieve manifest', () => {
      const manifest = manager.createManifest('c1');

      expect(manifest.campaignId).toBe('c1');
      expect(manifest.chunkIds).toEqual([]);
      expect(manifest.latestSequence).toBe(0);

      const retrieved = manager.getManifest('c1');
      expect(retrieved).toEqual(manifest);
    });

    it('should update manifest when chunks are added', () => {
      const events = [
        createEvent({ category: EventCategory.Game, type: 'e1', payload: {}, context: {} }),
      ];
      manager.createChunk({ events, campaignId: 'c1' });

      const manifest = manager.getManifest('c1');
      expect(manifest?.chunkIds.length).toBe(1);
      expect(manifest?.latestSequence).toBe(1);
    });
  });

  describe('verifyCampaignIntegrity', () => {
    it('should pass for valid campaign', () => {
      const events1 = [
        createEvent({ category: EventCategory.Game, type: 'e1', payload: {}, context: {} }),
      ];
      manager.createChunk({ events: events1, campaignId: 'c1' });

      const events2 = [
        createEvent({ category: EventCategory.Game, type: 'e2', payload: {}, context: {} }),
      ];
      manager.createChunk({ events: events2, campaignId: 'c1' });

      const result = manager.verifyCampaignIntegrity('c1');
      expect(result.valid).toBe(true);
    });
  });

  describe('getEventsFromChunks', () => {
    it('should return all events from campaign chunks', () => {
      const events1 = [
        createEvent({ category: EventCategory.Game, type: 'e1', payload: {}, context: {} }),
        createEvent({ category: EventCategory.Game, type: 'e2', payload: {}, context: {} }),
      ];
      manager.createChunk({ events: events1, campaignId: 'c1' });

      const events2 = [
        createEvent({ category: EventCategory.Game, type: 'e3', payload: {}, context: {} }),
      ];
      manager.createChunk({ events: events2, campaignId: 'c1' });

      const allEvents = manager.getEventsFromChunks('c1');
      expect(allEvents.length).toBe(3);
    });

    it('should filter by sequence range', () => {
      const events = [
        createEvent({ category: EventCategory.Game, type: 'e1', payload: {}, context: {} }),
        createEvent({ category: EventCategory.Game, type: 'e2', payload: {}, context: {} }),
        createEvent({ category: EventCategory.Game, type: 'e3', payload: {}, context: {} }),
      ];
      manager.createChunk({ events, campaignId: 'c1' });

      const filtered = manager.getEventsFromChunks('c1', { from: 2, to: 2 });
      expect(filtered.length).toBe(1);
      expect(filtered[0].sequence).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      manager.createChunk({
        events: [createEvent({ category: EventCategory.Game, type: 'e1', payload: {}, context: {} })],
        campaignId: 'c1',
      });
      manager.createCheckpoint({ sequence: 1, state: {}, campaignId: 'c1' });

      const stats = manager.getStats();
      expect(stats.chunkCount).toBe(1);
      expect(stats.checkpointCount).toBe(1);
      expect(stats.campaignCount).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all data', () => {
      manager.createChunk({
        events: [createEvent({ category: EventCategory.Game, type: 'e1', payload: {}, context: {} })],
        campaignId: 'c1',
      });

      manager.clear();

      expect(manager.getStats()).toEqual({ chunkCount: 0, checkpointCount: 0, campaignCount: 0 });
    });
  });
});

describe('Singleton helpers', () => {
  beforeEach(() => {
    resetChunkManager();
  });

  it('should return same instance', () => {
    const m1 = getChunkManager();
    const m2 = getChunkManager();
    expect(m1).toBe(m2);
  });

  it('should reset instance', () => {
    const m1 = getChunkManager();
    resetChunkManager();
    const m2 = getChunkManager();
    expect(m1).not.toBe(m2);
  });
});
