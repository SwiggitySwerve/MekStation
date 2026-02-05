/**
 * RoomCodeDialog Component
 * Modal dialog for creating or joining P2P sync rooms.
 * Features tabbed interface with room code display/input and optional password.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */
import React, { useState, useCallback, useEffect } from 'react';

import type { IPeer } from '@/lib/p2p';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  formatRoomCode,
  getRoomCodePlaceholder,
  isValidRoomCode,
} from '@/lib/p2p';

import { PeerList } from './PeerList';

// =============================================================================
// Types
// =============================================================================

type DialogTab = 'create' | 'join';

interface RoomCodeDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Create room handler - returns the room code */
  onCreateRoom: (password?: string) => Promise<string>;
  /** Join room handler */
  onJoinRoom: (roomCode: string, password?: string) => Promise<void>;
  /** Leave room handler */
  onLeaveRoom: () => void;
  /** Whether currently connected to a room */
  isConnected: boolean;
  /** Whether currently connecting */
  isConnecting: boolean;
  /** Current room code (when connected) */
  currentRoomCode: string | null;
  /** Connected peers */
  peers: readonly IPeer[];
  /** Local peer ID */
  localPeerId: string | null;
  /** Local peer name */
  localPeerName?: string;
  /** Error message */
  error: string | null;
  /** Clear error handler */
  onClearError?: () => void;
}

// =============================================================================
// Tab Button Component
// =============================================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

function TabButton({
  active,
  onClick,
  children,
  disabled,
}: TabButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
        active
          ? 'bg-surface-raised text-text-theme-primary border-border-theme border'
          : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-base/50'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
    >
      {children}
    </button>
  );
}

// =============================================================================
// Room Code Display Component
// =============================================================================

interface RoomCodeDisplayProps {
  roomCode: string;
}

function RoomCodeDisplay({
  roomCode,
}: RoomCodeDisplayProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const formattedCode = formatRoomCode(roomCode);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formattedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = formattedCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [formattedCode]);

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-text-theme-muted text-xs tracking-wider uppercase">
        Room Code
      </p>
      <div className="flex items-center gap-3">
        <span className="font-mono text-3xl font-bold tracking-[0.3em] text-cyan-400">
          {formattedCode}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={`rounded-lg p-2 transition-all ${
            copied
              ? 'border border-emerald-500/30 bg-emerald-600/20 text-emerald-400'
              : 'bg-surface-raised/50 text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised border-border-theme-subtle border'
          } `}
          aria-label={copied ? 'Copied!' : 'Copy room code'}
        >
          {copied ? (
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
              />
            </svg>
          )}
        </button>
      </div>
      <p className="text-text-theme-muted text-xs">
        Share this code with others to sync
      </p>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function RoomCodeDialog({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  isConnected,
  isConnecting,
  currentRoomCode,
  peers,
  localPeerId,
  localPeerName,
  error,
  onClearError,
}: RoomCodeDialogProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<DialogTab>('create');
  const [joinCode, setJoinCode] = useState('');
  const [password, setPassword] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setJoinCode('');
      setPassword('');
      setCreatedCode(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Clear error when switching tabs
  useEffect(() => {
    onClearError?.();
  }, [activeTab, onClearError]);

  const handleCreateRoom = useCallback(async () => {
    setIsLoading(true);
    onClearError?.();
    try {
      const code = await onCreateRoom(password || undefined);
      setCreatedCode(code);
    } finally {
      setIsLoading(false);
    }
  }, [onCreateRoom, password, onClearError]);

  const handleJoinRoom = useCallback(async () => {
    if (!isValidRoomCode(joinCode)) return;
    setIsLoading(true);
    onClearError?.();
    try {
      await onJoinRoom(joinCode, password || undefined);
    } finally {
      setIsLoading(false);
    }
  }, [onJoinRoom, joinCode, password, onClearError]);

  const handleLeaveRoom = useCallback(() => {
    onLeaveRoom();
    setCreatedCode(null);
  }, [onLeaveRoom]);

  const handleJoinCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Auto-format as user types
      const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (raw.length <= 6) {
        setJoinCode(
          raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw,
        );
      }
    },
    [],
  );

  if (!isOpen) return null;

  const isJoinCodeValid = isValidRoomCode(joinCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="bg-surface-base border-border-theme relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="border-border-theme-subtle flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-text-theme-primary text-lg font-semibold">
            {isConnected ? 'Sync Room' : 'Connect to Sync'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-theme-muted hover:text-text-theme-primary hover:bg-surface-raised rounded-lg p-1.5 transition-colors"
            aria-label="Close dialog"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isConnected && currentRoomCode ? (
            /* Connected state */
            <div className="space-y-6">
              <RoomCodeDisplay roomCode={currentRoomCode} />

              <div className="border-border-theme-subtle border-t pt-4">
                <h3 className="text-text-theme-secondary mb-3 text-sm font-medium">
                  Connected Peers
                </h3>
                <PeerList
                  peers={peers}
                  localPeerId={localPeerId}
                  localPeerName={localPeerName}
                  className="max-h-48 overflow-y-auto"
                />
              </div>

              <Button variant="danger" fullWidth onClick={handleLeaveRoom}>
                Leave Room
              </Button>
            </div>
          ) : (
            /* Disconnected state - show tabs */
            <div className="space-y-6">
              {/* Tab buttons */}
              <div className="bg-surface-base/50 border-border-theme-subtle flex gap-2 rounded-xl border p-1">
                <TabButton
                  active={activeTab === 'create'}
                  onClick={() => setActiveTab('create')}
                  disabled={isLoading || isConnecting}
                >
                  Create Room
                </TabButton>
                <TabButton
                  active={activeTab === 'join'}
                  onClick={() => setActiveTab('join')}
                  disabled={isLoading || isConnecting}
                >
                  Join Room
                </TabButton>
              </div>

              {/* Tab content */}
              {activeTab === 'create' ? (
                <div className="space-y-4">
                  {createdCode ? (
                    <RoomCodeDisplay roomCode={createdCode} />
                  ) : (
                    <>
                      <p className="text-text-theme-secondary text-center text-sm">
                        Create a new room and share the code with others to sync
                        your vault.
                      </p>
                      <Input
                        type="password"
                        placeholder="Optional password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        accent="cyan"
                      />
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={handleCreateRoom}
                        isLoading={isLoading || isConnecting}
                      >
                        Create Room
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-text-theme-secondary text-center text-sm">
                    Enter a room code to join an existing sync session.
                  </p>
                  <Input
                    type="text"
                    placeholder={getRoomCodePlaceholder()}
                    value={joinCode}
                    onChange={handleJoinCodeChange}
                    accent="cyan"
                    className="text-center font-mono text-lg tracking-wider"
                  />
                  <Input
                    type="password"
                    placeholder="Password (if required)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    accent="cyan"
                  />
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleJoinRoom}
                    disabled={!isJoinCodeValid}
                    isLoading={isLoading || isConnecting}
                  >
                    Join Room
                  </Button>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-600/10 px-4 py-3">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-red-400"
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
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoomCodeDialog;
