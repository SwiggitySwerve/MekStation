import { getActiveRoom, getLocalPeerId } from './SyncProvider';

export const GAME_SESSION_AWARENESS_FIELD = 'gameSession';

export type GameSessionPeerRole = 'host' | 'guest';

export interface IGameSessionAwarenessState {
  readonly peerId: string;
  readonly role: GameSessionPeerRole;
  readonly assignedAt: string;
}

export interface IGameSessionAwarenessAdapter {
  readonly clientID?: number;
  readonly getStates: () => Map<number, Record<string, unknown>>;
  readonly setLocalStateField: (field: string, value: unknown) => void;
}

export interface IGameSessionRoleOptions {
  readonly awareness?: IGameSessionAwarenessAdapter;
  readonly localPeerId?: string;
  readonly now?: () => string;
}

export type GameSessionLifecycleEvent =
  | {
      readonly type: 'HostPromoted';
      readonly peerId: string;
      readonly role: 'host';
      readonly timestamp: string;
    }
  | {
      readonly type: 'GuestJoined';
      readonly peerId: string;
      readonly role: 'guest';
      readonly timestamp: string;
    };

type LifecycleListener = (event: GameSessionLifecycleEvent) => void;

const lifecycleListeners = new Set<LifecycleListener>();

export function onGameSessionLifecycleEvent(
  listener: LifecycleListener,
): () => void {
  lifecycleListeners.add(listener);
  return () => {
    lifecycleListeners.delete(listener);
  };
}

export function promoteLocalPeerToHost(
  options: IGameSessionRoleOptions = {},
): IGameSessionAwarenessState {
  const metadata = setLocalGameSessionRole('host', options);
  emitLifecycleEvent({
    type: 'HostPromoted',
    peerId: metadata.peerId,
    role: 'host',
    timestamp: metadata.assignedAt,
  });
  return metadata;
}

export function joinLocalPeerAsGuest(
  options: IGameSessionRoleOptions = {},
): IGameSessionAwarenessState {
  const awareness = requireAwareness(options);
  const localPeerId = resolveAwarenessPeerId(options, awareness);
  const currentPeers = getGameSessionAwarenessStates(awareness);
  const guestPeer = currentPeers.find(
    (peer) => peer.role === 'guest' && peer.peerId !== localPeerId,
  );

  if (guestPeer) {
    throw new Error('Match is full');
  }

  const metadata = setLocalGameSessionRole('guest', {
    ...options,
    awareness,
    localPeerId,
  });
  emitLifecycleEvent({
    type: 'GuestJoined',
    peerId: metadata.peerId,
    role: 'guest',
    timestamp: metadata.assignedAt,
  });
  return metadata;
}

export function getGameSessionAwarenessStates(
  awareness?: IGameSessionAwarenessAdapter,
): readonly IGameSessionAwarenessState[] {
  const resolvedAwareness =
    awareness ?? getActiveRoom()?.webrtcProvider.awareness;
  if (!resolvedAwareness) return [];

  const peers: IGameSessionAwarenessState[] = [];
  resolvedAwareness.getStates().forEach((state) => {
    const metadata = readGameSessionAwarenessState(state);
    if (metadata) {
      peers.push(metadata);
    }
  });
  return peers;
}

function setLocalGameSessionRole(
  role: GameSessionPeerRole,
  options: IGameSessionRoleOptions,
): IGameSessionAwarenessState {
  const awareness = requireAwareness(options);
  const peerId = resolveAwarenessPeerId(options, awareness);
  const assignedAt = options.now?.() ?? new Date().toISOString();
  const metadata: IGameSessionAwarenessState = {
    peerId,
    role,
    assignedAt,
  };

  awareness.setLocalStateField(GAME_SESSION_AWARENESS_FIELD, metadata);
  return metadata;
}

function requireAwareness(
  options: IGameSessionRoleOptions,
): IGameSessionAwarenessAdapter {
  const awareness =
    options.awareness ?? getActiveRoom()?.webrtcProvider.awareness;
  if (!awareness) {
    throw new Error('No active Yjs awareness');
  }
  return awareness;
}

function resolveAwarenessPeerId(
  options: IGameSessionRoleOptions,
  awareness: IGameSessionAwarenessAdapter,
): string {
  const peerId =
    options.localPeerId ??
    getLocalPeerId() ??
    (typeof awareness.clientID === 'number'
      ? String(awareness.clientID)
      : null);

  if (!peerId) {
    throw new Error('No local peer id available');
  }

  return peerId;
}

function readGameSessionAwarenessState(
  state: Record<string, unknown>,
): IGameSessionAwarenessState | null {
  const metadata = state[GAME_SESSION_AWARENESS_FIELD];
  if (!isRecord(metadata)) return null;
  if (
    typeof metadata.peerId !== 'string' ||
    !isGameSessionPeerRole(metadata.role) ||
    typeof metadata.assignedAt !== 'string'
  ) {
    return null;
  }

  return {
    peerId: metadata.peerId,
    role: metadata.role,
    assignedAt: metadata.assignedAt,
  };
}

function isGameSessionPeerRole(value: unknown): value is GameSessionPeerRole {
  return value === 'host' || value === 'guest';
}

function emitLifecycleEvent(event: GameSessionLifecycleEvent): void {
  lifecycleListeners.forEach((listener) => {
    listener(event);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
