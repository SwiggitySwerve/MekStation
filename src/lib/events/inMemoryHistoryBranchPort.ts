/**
 * In-memory history-branch port.
 *
 * Maps are keyed streamType/streamId/branchId. The default seam refuses
 * createBranch so this adapter cannot mint a second branch until a
 * caller is handed an allowing seam. readEffectiveHead never invents a
 * genesis — a missing head is null.
 */

import type {
  EventHistoryBranchStatus,
  IBranchCreationSeam,
  IEventHistoryBranch,
  IEventHistoryEffectiveHead,
  IEventHistoryStreamRef,
} from '@/lib/events/journal/EventHistoryBranchContract';
import {
  EventHistoryBranchError,
  PRODUCTION_BRANCH_CREATION_SEAM,
  assertLegalBranchStatusTransition,
  assertValidBranchRecord,
} from '@/lib/events/journal/EventHistoryBranchContract';

import type { IEventHistoryBranchPort } from './storeCapabilityPorts';

function streamKey(stream: IEventHistoryStreamRef): string {
  return `${stream.streamType}/${stream.streamId}`;
}

function branchKey(stream: IEventHistoryStreamRef, branchId: string): string {
  return `${streamKey(stream)}/${branchId}`;
}

export class InMemoryHistoryBranchPort implements IEventHistoryBranchPort {
  private readonly branches = new Map<string, IEventHistoryBranch>();
  private readonly heads = new Map<string, IEventHistoryEffectiveHead>();

  public constructor(
    private readonly seam: IBranchCreationSeam = PRODUCTION_BRANCH_CREATION_SEAM,
  ) {}

  public clearBranches(): void {
    this.branches.clear();
    this.heads.clear();
  }

  public readBranch(
    stream: IEventHistoryStreamRef,
    branchId: string,
  ): IEventHistoryBranch | null {
    return this.branches.get(branchKey(stream, branchId)) ?? null;
  }

  public requireBranch(
    stream: IEventHistoryStreamRef,
    branchId: string,
  ): IEventHistoryBranch {
    const branch = this.readBranch(stream, branchId);
    if (branch === null) {
      throw new EventHistoryBranchError(
        'unknown-branch',
        `Branch '${branchId}' does not exist in stream ${stream.streamType}/${stream.streamId}`,
      );
    }
    return branch;
  }

  public readEffectiveHead(
    stream: IEventHistoryStreamRef,
  ): IEventHistoryEffectiveHead | null {
    return this.heads.get(streamKey(stream)) ?? null;
  }

  public requireEffectiveHead(
    stream: IEventHistoryStreamRef,
  ): IEventHistoryEffectiveHead {
    const head = this.readEffectiveHead(stream);
    if (head === null) {
      throw new EventHistoryBranchError(
        'no-effective-branch',
        `Stream ${stream.streamType}/${stream.streamId} has no effective branch`,
      );
    }
    return head;
  }

  public createBranch(branch: IEventHistoryBranch): void {
    if (!this.seam.allowsBranchCreation) {
      throw new EventHistoryBranchError(
        'branch-creation-disabled',
        'Branch creation is disabled; production streams stay genesis-only',
      );
    }
    assertValidBranchRecord(branch);
    this.assertResolvableParent(branch);
    if (branch.status === 'effective') this.assertNoEffectiveBranch(branch);
    const key = branchKey(branch, branch.branchId);
    if (this.branches.has(key)) {
      throw new EventHistoryBranchError(
        'duplicate-branch',
        `A branch already occupies the identity slot '${branch.branchId}'`,
      );
    }
    this.branches.set(key, branch);
    if (branch.status === 'effective') this.installHead(branch, branch.createdAt);
  }

  public transitionBranchStatus(
    stream: IEventHistoryStreamRef,
    branchId: string,
    to: EventHistoryBranchStatus,
  ): void {
    const current = this.requireBranch(stream, branchId);
    assertLegalBranchStatusTransition(current.status, to);
    if (to === 'effective') this.assertNoEffectiveBranch(stream);
    const next: IEventHistoryBranch = { ...current, status: to };
    this.branches.set(branchKey(stream, branchId), next);
    if (to === 'effective') this.installHead(next, new Date().toISOString());
    if (current.status === 'effective' && to !== 'effective') {
      this.heads.delete(streamKey(stream));
    }
  }

  private assertResolvableParent(branch: IEventHistoryBranch): void {
    if (branch.parentBranchId === null) return;
    const parent = this.readBranch(branch, branch.parentBranchId);
    if (parent === null || parent.ancestorDepth !== branch.ancestorDepth - 1) {
      throw new EventHistoryBranchError(
        'invalid-ancestry',
        `Branch '${branch.branchId}' names a parent '${branch.parentBranchId}' that does not resolve in this stream one depth above it`,
      );
    }
  }

  private assertNoEffectiveBranch(stream: IEventHistoryStreamRef): void {
    for (const row of Array.from(this.branches.values())) {
      if (
        row.streamType === stream.streamType &&
        row.streamId === stream.streamId &&
        row.status === 'effective'
      ) {
        throw new EventHistoryBranchError(
          'duplicate-effective-branch',
          `Stream ${stream.streamType}/${stream.streamId} is already effective on branch '${row.branchId}'; there may be only one`,
        );
      }
    }
  }

  private installHead(branch: IEventHistoryBranch, installedAt: string): void {
    this.heads.set(streamKey(branch), {
      streamType: branch.streamType,
      streamId: branch.streamId,
      branchId: branch.branchId,
      effectiveGeneration: 1,
      installedAt,
    });
  }
}
