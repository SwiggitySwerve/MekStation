import React from 'react';

import {
  SyncStatusIndicator,
  PeerList,
  RoomCodeDialog,
} from '@/components/sync';
import { Input } from '@/components/ui';
import { ConnectionState } from '@/lib/p2p';
import {
  useSyncRoomStore,
  useConnectionState,
  usePeers,
  useRoomCode,
} from '@/lib/p2p/useSyncRoomStore';

import { SettingsSection, SettingsSectionProps } from './SettingsShared';

export function P2PSyncSettings({
  isExpanded,
  onToggle,
  onRef,
}: SettingsSectionProps): React.ReactElement {
  const connectionState = useConnectionState();
  const peers = usePeers();
  const roomCode = useRoomCode();
  const {
    localPeerName,
    localPeerId,
    setLocalPeerName,
    createRoom,
    joinRoom,
    leaveRoom,
    error,
    clearError,
  } = useSyncRoomStore();

  const [showRoomDialog, setShowRoomDialog] = React.useState(false);
  const [peerNameInput, setPeerNameInput] = React.useState(localPeerName);

  const isConnected = connectionState === ConnectionState.Connected;
  const isConnecting = connectionState === ConnectionState.Connecting;

  const handleSavePeerName = () => {
    if (peerNameInput.trim()) {
      setLocalPeerName(peerNameInput.trim());
    }
  };

  return (
    <SettingsSection
      id="p2p-sync"
      title="P2P Sync"
      description="Real-time peer-to-peer synchronization for collaborative play"
      isExpanded={isExpanded}
      onToggle={onToggle}
      onRef={onRef}
    >
      <div className="bg-surface-raised/50 border-border-theme-subtle flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-4">
          <SyncStatusIndicator
            connectionState={connectionState}
            peerCount={peers.length}
          />
          {roomCode && (
            <div className="text-sm">
              <span className="text-text-theme-muted">Room: </span>
              <code className="text-accent font-mono font-bold">
                {roomCode}
              </code>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <button
              onClick={leaveRoom}
              className="rounded-md border border-red-500/30 bg-red-600/20 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/30"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => setShowRoomDialog(true)}
              disabled={isConnecting}
              className="bg-accent hover:bg-accent-hover rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <div className="flex items-center gap-2 text-red-400">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <div>
        <div className="text-text-theme-primary mb-1 text-sm font-medium">
          Your Display Name
        </div>
        <div className="text-text-theme-secondary mb-2 text-xs">
          How you appear to other peers in sync rooms
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            value={peerNameInput}
            onChange={(e) => setPeerNameInput(e.target.value)}
            placeholder="Enter your name"
            className="flex-1 text-sm"
          />
          <button
            onClick={handleSavePeerName}
            disabled={!peerNameInput.trim() || peerNameInput === localPeerName}
            className="bg-accent hover:bg-accent-hover rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      {isConnected && (
        <div>
          <div className="text-text-theme-primary mb-2 text-sm font-medium">
            Connected Peers
          </div>
          {peers.length > 0 ? (
            <PeerList
              peers={peers}
              localPeerId={localPeerId}
              localPeerName={localPeerName}
            />
          ) : (
            <div className="text-text-theme-muted bg-surface-deep/50 border-border-theme-subtle rounded-lg border p-4 text-center text-sm">
              Waiting for peers to join...
            </div>
          )}
        </div>
      )}

      <div className="border-border-theme-subtle border-t pt-4">
        <div className="text-text-theme-primary mb-2 text-sm font-medium">
          How P2P Sync Works
        </div>
        <ul className="text-text-theme-secondary space-y-2 text-xs">
          <li className="flex items-start gap-2">
            <span className="text-accent">1.</span>
            Create a room or join with a room code
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">2.</span>
            Share the room code with your gaming group
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">3.</span>
            Enable sync on vault items you want to share
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">4.</span>
            Changes sync automatically in real-time
          </li>
        </ul>
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-xs text-amber-200">
              P2P sync uses WebRTC for direct peer connections. All data stays
              between you and your peers - no server storage.
            </span>
          </div>
        </div>
      </div>

      <RoomCodeDialog
        isOpen={showRoomDialog}
        onClose={() => setShowRoomDialog(false)}
        onCreateRoom={async (password) => {
          const code = await createRoom(password ? { password } : undefined);
          return code;
        }}
        onJoinRoom={async (code, password) => {
          await joinRoom(code, password);
        }}
        onLeaveRoom={leaveRoom}
        isConnected={isConnected}
        isConnecting={isConnecting}
        currentRoomCode={roomCode}
        peers={peers}
        localPeerId={localPeerId}
        localPeerName={localPeerName}
        error={error}
        onClearError={clearError}
      />
    </SettingsSection>
  );
}
