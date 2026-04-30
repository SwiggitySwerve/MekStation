/**
 * Networked 1v1 lobby contracts.
 *
 * @spec openspec/changes/add-game-session-invite-and-lobby-1v1/specs/multiplayer-sync/spec.md
 * @spec openspec/changes/add-game-session-invite-and-lobby-1v1/specs/game-session-management/spec.md
 */

import { z } from 'zod';

export const LOBBY_MODE_1V1 = '1v1' as const;
export const LOBBY_SIDES = ['host', 'guest'] as const;

export type LobbyMode = typeof LOBBY_MODE_1V1;
export type LobbySide = (typeof LOBBY_SIDES)[number];

export const SelectedUnitSchema = z
  .object({
    unitId: z.string().min(1),
    designation: z.string().min(1),
    tonnage: z.number().nonnegative(),
    bv: z.number().nonnegative(),
    source: z.enum(['canonical', 'custom', 'vault']).optional(),
  })
  .strict();

export type ISelectedUnit = z.infer<typeof SelectedUnitSchema>;

export const SelectedPilotSchema = z
  .object({
    pilotId: z.string().min(1),
    unitId: z.string().min(1),
    callsign: z.string().min(1),
    gunnery: z.number().int().min(0),
    piloting: z.number().int().min(0),
  })
  .strict();

export type ISelectedPilot = z.infer<typeof SelectedPilotSchema>;

export const LoadoutSchema = z
  .object({
    units: z.array(SelectedUnitSchema).max(4),
    pilots: z.array(SelectedPilotSchema).max(4),
  })
  .strict();

export type ILoadout = z.infer<typeof LoadoutSchema>;

export const MapConfigSchema = z
  .object({
    radius: z.number().int().min(4).max(30),
    terrainPreset: z.string().min(1),
    turnLimit: z.number().int().min(0).max(200),
  })
  .strict();

export type IMapConfig = z.infer<typeof MapConfigSchema>;

export const LobbyStateSchema = z
  .object({
    mode: z.literal(LOBBY_MODE_1V1),
    hostPeerId: z.string().min(1),
    guestPeerId: z.string().min(1).nullable(),
    hostLoadout: LoadoutSchema,
    guestLoadout: LoadoutSchema,
    mapConfig: MapConfigSchema,
    hostReady: z.boolean(),
    guestReady: z.boolean(),
    matchId: z.string().min(1).optional(),
    closed: z.boolean().optional(),
  })
  .strict();

export type ILobbyState = z.infer<typeof LobbyStateSchema>;

export const DEFAULT_LOBBY_MAP_CONFIG: IMapConfig = {
  radius: 8,
  terrainPreset: 'clear',
  turnLimit: 20,
};

export const EMPTY_LOBBY_LOADOUT: ILoadout = {
  units: [],
  pilots: [],
};

export function createInitialLobbyState(hostPeerId: string): ILobbyState {
  return {
    mode: LOBBY_MODE_1V1,
    hostPeerId,
    guestPeerId: null,
    hostLoadout: { units: [], pilots: [] },
    guestLoadout: { units: [], pilots: [] },
    mapConfig: DEFAULT_LOBBY_MAP_CONFIG,
    hostReady: false,
    guestReady: false,
  };
}

export function parseLobbyState(value: unknown): ILobbyState | null {
  const result = LobbyStateSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function getLobbySideForPeer(
  state: ILobbyState,
  peerId: string | null | undefined,
): LobbySide | null {
  if (!peerId) return null;
  if (state.hostPeerId === peerId) return 'host';
  if (state.guestPeerId === peerId) return 'guest';
  return null;
}

export function getLobbyOwnerForSide(
  state: ILobbyState,
  side: LobbySide,
): string | null {
  return side === 'host' ? state.hostPeerId : state.guestPeerId;
}

export function getLoadoutForSide(
  state: ILobbyState,
  side: LobbySide,
): ILoadout {
  return side === 'host' ? state.hostLoadout : state.guestLoadout;
}

export function getReadyForSide(state: ILobbyState, side: LobbySide): boolean {
  return side === 'host' ? state.hostReady : state.guestReady;
}

export function isLoadoutComplete(loadout: ILoadout): boolean {
  if (loadout.units.length < 1 || loadout.units.length > 4) return false;
  if (loadout.pilots.length !== loadout.units.length) return false;

  const unitIds = new Set(loadout.units.map((unit) => unit.unitId));
  const pilotUnitIds = new Set(loadout.pilots.map((pilot) => pilot.unitId));
  if (pilotUnitIds.size !== loadout.pilots.length) return false;

  for (const unitId of Array.from(unitIds)) {
    if (!pilotUnitIds.has(unitId)) return false;
  }
  return true;
}

export function getLobbyReadyBlockReason(
  state: ILobbyState,
  side: LobbySide,
): string | null {
  const localLoadout = getLoadoutForSide(state, side);
  if (!isLoadoutComplete(localLoadout)) {
    return 'Pick 1-4 mechs and assign one pilot per mech';
  }

  const hostCount = state.hostLoadout.units.length;
  const guestCount = state.guestLoadout.units.length;
  if (hostCount > 0 && guestCount > 0 && hostCount !== guestCount) {
    return 'Both sides must pick the same number of mechs';
  }

  return null;
}

export function canLaunchLobby(state: ILobbyState): boolean {
  return (
    state.guestPeerId !== null &&
    state.hostReady &&
    state.guestReady &&
    getLobbyReadyBlockReason(state, 'host') === null &&
    getLobbyReadyBlockReason(state, 'guest') === null
  );
}
