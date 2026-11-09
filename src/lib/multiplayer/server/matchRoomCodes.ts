import { generateRoomCode, normalizeRoomCode } from '@/lib/p2p/roomCodes';
import { assertMatchStatusTransition } from '@/types/multiplayer/MatchStatus';

import type { IMatchMeta, IMatchMetaPatch, IMatchStore } from './IMatchStore';

import { RoomCodeCollisionError } from './IMatchStore';

/** The compare-and-swap token; rows written before it existed read as 0. */
export function metaRevision(meta: Pick<IMatchMeta, 'revision'>): number {
  return meta.revision ?? 0;
}

/**
 * Match metadata patch semantics shared by both server stores. This is the
 * one writer every status change passes through, so it owns the transition
 * guard: an illegal edge throws before anything is merged or persisted. It
 * also stamps the next revision, so every metadata write is a swap.
 */
export function patchMatchMeta(
  before: IMatchMeta,
  patch: IMatchMetaPatch,
): IMatchMeta {
  if (patch.status !== undefined) {
    assertMatchStatusTransition(before.status, patch.status);
  }
  const { roomCode: patchRoomCode, ...restPatch } = patch;
  const roomCode =
    patchRoomCode === null ? undefined : (patchRoomCode ?? before.roomCode);
  return lobbyMatchMeta({
    ...before,
    ...restPatch,
    roomCode,
    revision: metaRevision(before) + 1,
    updatedAt: new Date().toISOString(),
  });
}

/** Only lobby metadata may carry an invitation; SQL uses NULL for absence. */
export function roomCodeForMatch(
  status: string,
  roomCode: string | undefined,
): string | undefined {
  return status === 'lobby' && roomCode
    ? normalizeRoomCode(roomCode)
    : undefined;
}

export function lobbyMatchMeta(meta: IMatchMeta): IMatchMeta {
  return { ...meta, roomCode: roomCodeForMatch(meta.status, meta.roomCode) };
}

/** Retry allocation, never unrelated persistence failures or guarded mission creates. */
export async function createMatchWithRoomCodeRetry(
  store: Pick<IMatchStore, 'createMatch'>,
  proposed: IMatchMeta,
  nextCode: () => string = generateRoomCode,
): Promise<IMatchMeta> {
  let meta = proposed;
  for (let attempt = 1; ; attempt++) {
    try {
      await store.createMatch(meta);
      return meta;
    } catch (error) {
      if (
        !(error instanceof RoomCodeCollisionError) ||
        !meta.roomCode ||
        attempt >= 5
      )
        throw error;
      meta = { ...meta, roomCode: nextCode() };
    }
  }
}
