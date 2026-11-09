import { generateRoomCode, normalizeRoomCode } from '@/lib/p2p/roomCodes';

import type { IMatchMeta, IMatchMetaPatch, IMatchStore } from './IMatchStore';

import { RoomCodeCollisionError } from './IMatchStore';

/** Match metadata patch semantics shared by both server stores. */
export function patchMatchMeta(
  before: IMatchMeta,
  patch: IMatchMetaPatch,
): IMatchMeta {
  const { roomCode: patchRoomCode, ...restPatch } = patch;
  const roomCode =
    patchRoomCode === null ? undefined : (patchRoomCode ?? before.roomCode);
  return lobbyMatchMeta({
    ...before,
    ...restPatch,
    roomCode,
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
