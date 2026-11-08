import type { IIntentPayload } from '@/types/multiplayer/Protocol';

import type { MatchStatus } from './IMatchStore';

type IntentPolicy =
  | { readonly route: 'engine' | 'rewind' }
  | {
      readonly route: 'lobby';
      readonly hostOnly: boolean;
      readonly statuses: readonly MatchStatus[];
    };

/** One classification for wire routing, lifecycle admission and handler types. */
export const MATCH_INTENT_KINDS = {
  Move: { route: 'engine' },
  Stand: { route: 'engine' },
  GoProne: { route: 'engine' },
  ActivateMovementEnhancement: { route: 'engine' },
  TorsoTwist: { route: 'engine' },
  Attack: { route: 'engine' },
  Physical: { route: 'engine' },
  RequestSpot: { route: 'engine' },
  AdvancePhase: { route: 'engine' },
  Concede: { route: 'engine' },
  Eject: { route: 'engine' },
  Withdraw: { route: 'engine' },
  OccupySeat: { route: 'lobby', hostOnly: false, statuses: ['lobby'] },
  LeaveSeat: { route: 'lobby', hostOnly: false, statuses: ['lobby'] },
  ReassignSeat: { route: 'lobby', hostOnly: true, statuses: ['lobby'] },
  SetAiSlot: { route: 'lobby', hostOnly: true, statuses: ['lobby'] },
  SetHumanSlot: { route: 'lobby', hostOnly: true, statuses: ['lobby'] },
  SetReady: { route: 'lobby', hostOnly: false, statuses: ['lobby'] },
  LaunchMatch: { route: 'lobby', hostOnly: true, statuses: ['lobby'] },
  MarkSeatAi: { route: 'lobby', hostOnly: true, statuses: ['active'] },
  ForfeitMatch: {
    route: 'lobby',
    hostOnly: true,
    statuses: ['lobby', 'active'],
  },
  RewindRequest: { route: 'rewind' },
} as const satisfies Record<IIntentPayload['kind'], IntentPolicy>;

type IntentKindForRoute<R extends IntentPolicy['route']> = {
  [K in keyof typeof MATCH_INTENT_KINDS]: (typeof MATCH_INTENT_KINDS)[K]['route'] extends R
    ? K
    : never;
}[keyof typeof MATCH_INTENT_KINDS];

export type LobbyIntentKind = IntentKindForRoute<'lobby'>;
export type EngineIntent = Extract<
  IIntentPayload,
  { kind: IntentKindForRoute<'engine'> }
>;

export function isLobbyIntentKind(
  kind: IIntentPayload['kind'],
): kind is LobbyIntentKind {
  return MATCH_INTENT_KINDS[kind].route === 'lobby';
}

export function lobbyIntentAllowedInStatus(
  kind: LobbyIntentKind,
  status: MatchStatus,
): boolean {
  const statuses: readonly MatchStatus[] = MATCH_INTENT_KINDS[kind].statuses;
  return statuses.includes(status);
}
