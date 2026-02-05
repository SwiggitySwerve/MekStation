/**
 * Chunk Manager Service
 * Manages event chunks and checkpoints.
 *
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import {
  IBaseEvent,
  IEventChunk,
  ICheckpoint,
  ICampaignManifest,
  ISequenceRange,
} from '@/types/events';
import { createChunk, createCheckpoint } from '@/utils/events/chunkFactory';
import {
  verifyChainIntegrity,
  verifyChunk,
  IChainVerificationResult,
} from '@/utils/events/hashUtils';

// =============================================================================
// Chunk Manager Service
// =============================================================================

/**
 * Manages event chunks and checkpoints.
 * Provides storage, retrieval, and verification capabilities.
 */
export class ChunkManagerService {
  /** Chunks indexed by chunkId */
  private chunks: Map<string, IEventChunk> = new Map();

  /** Checkpoints indexed by checkpointId */
  private checkpoints: Map<string, ICheckpoint> = new Map();

  /** Campaign manifests indexed by campaignId */
  private manifests: Map<string, ICampaignManifest> = new Map();

  // ===========================================================================
  // Chunk Operations
  // ===========================================================================

  /**
   * Create and store a new chunk from events.
   */
  createChunk(params: {
    events: readonly IBaseEvent[];
    campaignId?: string;
    previousHash?: string | null;
  }): IEventChunk {
    const { events, campaignId, previousHash } = params;

    // Get previous hash from campaign's last chunk if not provided
    let prevHash = previousHash;
    if (prevHash === undefined && campaignId) {
      const manifest = this.manifests.get(campaignId);
      if (manifest && manifest.chunkIds.length > 0) {
        const lastChunkId = manifest.chunkIds[manifest.chunkIds.length - 1];
        const lastChunk = this.chunks.get(lastChunkId);
        prevHash = lastChunk?.hash ?? null;
      } else {
        prevHash = null;
      }
    }

    const chunk = createChunk({
      events,
      campaignId,
      previousHash: prevHash ?? null,
    });

    // Store chunk
    this.chunks.set(chunk.chunkId, chunk);

    // Update manifest if campaign
    if (campaignId) {
      this.updateManifest(campaignId, chunk);
    }

    return chunk;
  }

  /**
   * Load a chunk by ID.
   */
  loadChunk(chunkId: string): IEventChunk | undefined {
    return this.chunks.get(chunkId);
  }

  /**
   * Get all chunks for a campaign in order.
   */
  getChunksForCampaign(campaignId: string): readonly IEventChunk[] {
    const manifest = this.manifests.get(campaignId);
    if (!manifest) return [];

    return manifest.chunkIds
      .map((id) => this.chunks.get(id))
      .filter((c): c is IEventChunk => c !== undefined);
  }

  // ===========================================================================
  // Checkpoint Operations
  // ===========================================================================

  /**
   * Create and store a checkpoint.
   */
  createCheckpoint<TState>(params: {
    sequence: number;
    state: TState;
    campaignId?: string;
  }): ICheckpoint<TState> {
    const { sequence, state, campaignId } = params;

    const checkpoint = createCheckpoint({
      sequence,
      state,
      campaignId,
    });

    // Store checkpoint
    this.checkpoints.set(checkpoint.checkpointId, checkpoint as ICheckpoint);

    // Update manifest if campaign
    if (campaignId) {
      const manifest = this.manifests.get(campaignId);
      if (manifest) {
        this.manifests.set(campaignId, {
          ...manifest,
          latestCheckpointId: checkpoint.checkpointId,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return checkpoint;
  }

  /**
   * Load a checkpoint by ID.
   */
  loadCheckpoint<TState>(
    checkpointId: string,
  ): ICheckpoint<TState> | undefined {
    return this.checkpoints.get(checkpointId) as
      | ICheckpoint<TState>
      | undefined;
  }

  /**
   * Get the latest checkpoint for a campaign.
   */
  getLatestCheckpoint<TState>(
    campaignId: string,
  ): ICheckpoint<TState> | undefined {
    const manifest = this.manifests.get(campaignId);
    if (!manifest?.latestCheckpointId) return undefined;
    return this.loadCheckpoint(manifest.latestCheckpointId);
  }

  /**
   * Find the nearest checkpoint before a sequence number.
   */
  findCheckpointBefore<TState>(
    campaignId: string,
    sequence: number,
  ): ICheckpoint<TState> | undefined {
    // Get all checkpoints for campaign
    const campaignCheckpoints = Array.from(this.checkpoints.values())
      .filter((c) => c.campaignId === campaignId && c.sequence <= sequence)
      .sort((a, b) => b.sequence - a.sequence);

    return campaignCheckpoints[0] as ICheckpoint<TState> | undefined;
  }

  // ===========================================================================
  // Manifest Operations
  // ===========================================================================

  /**
   * Get the manifest for a campaign.
   */
  getManifest(campaignId: string): ICampaignManifest | undefined {
    return this.manifests.get(campaignId);
  }

  /**
   * Create a new manifest for a campaign.
   */
  createManifest(campaignId: string): ICampaignManifest {
    const manifest: ICampaignManifest = {
      campaignId,
      chunkIds: [],
      latestSequence: 0,
      latestCheckpointId: null,
      updatedAt: new Date().toISOString(),
    };
    this.manifests.set(campaignId, manifest);
    return manifest;
  }

  /**
   * Update a campaign manifest with a new chunk.
   */
  private updateManifest(campaignId: string, chunk: IEventChunk): void {
    let manifest = this.manifests.get(campaignId);
    if (!manifest) {
      manifest = this.createManifest(campaignId);
    }

    this.manifests.set(campaignId, {
      ...manifest,
      chunkIds: [...manifest.chunkIds, chunk.chunkId],
      latestSequence: chunk.sequenceRange.to,
      updatedAt: new Date().toISOString(),
    });
  }

  // ===========================================================================
  // Verification Operations
  // ===========================================================================

  /**
   * Verify a campaign's chunk chain integrity.
   */
  verifyCampaignIntegrity(campaignId: string): IChainVerificationResult {
    const chunks = this.getChunksForCampaign(campaignId);
    return verifyChainIntegrity(chunks);
  }

  /**
   * Verify a single chunk has not been tampered with.
   */
  verifyChunk(chunkId: string): boolean {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return false;
    return verifyChunk(chunk);
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.chunks.clear();
    this.checkpoints.clear();
    this.manifests.clear();
  }

  /**
   * Get statistics about stored data.
   */
  getStats(): {
    chunkCount: number;
    checkpointCount: number;
    campaignCount: number;
  } {
    return {
      chunkCount: this.chunks.size,
      checkpointCount: this.checkpoints.size,
      campaignCount: this.manifests.size,
    };
  }

  /**
   * Get events from chunks in a sequence range.
   */
  getEventsFromChunks(
    campaignId: string,
    range?: ISequenceRange,
  ): readonly IBaseEvent[] {
    const chunks = this.getChunksForCampaign(campaignId);
    const events: IBaseEvent[] = [];

    for (const chunk of chunks) {
      // Skip chunks outside range
      if (range) {
        if (chunk.sequenceRange.to < range.from) continue;
        if (chunk.sequenceRange.from > range.to) continue;
      }

      // Add events from chunk
      if (range) {
        events.push(
          ...chunk.events.filter(
            (e) => e.sequence >= range.from && e.sequence <= range.to,
          ),
        );
      } else {
        events.push(...chunk.events);
      }
    }

    return events.sort((a, b) => a.sequence - b.sequence);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultChunkManager: ChunkManagerService | null = null;

/**
 * Get the default chunk manager instance.
 */
export function getChunkManager(): ChunkManagerService {
  if (!defaultChunkManager) {
    defaultChunkManager = new ChunkManagerService();
  }
  return defaultChunkManager;
}

/**
 * Reset the default chunk manager (for testing).
 */
export function resetChunkManager(): void {
  defaultChunkManager = null;
}
