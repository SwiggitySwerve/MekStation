/**
 * Settings Page
 *
 * App configuration and preferences.
 *
 * Appearance settings use a draft/preview system:
 * - Changes are applied immediately for live preview
 * - Changes are NOT persisted until the user clicks "Save"
 * - Navigating away without saving reverts to previous values
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PageLayout, Input } from '@/components/ui';
import {
  useAppSettingsStore,
  AccentColor,
  FontSize,
  AnimationLevel,
  UITheme,
  ACCENT_COLOR_CSS,
} from '@/stores/useAppSettingsStore';
import { ArmorDiagramModePreview } from '@/components/customizer/armor/ArmorDiagramPreview';
import { ArmorDiagramSettings } from '@/components/customizer/armor/ArmorDiagramSettings';
import { VaultIdentitySection } from '@/components/vault/VaultIdentitySection';
import { SyncStatusIndicator, PeerList, RoomCodeDialog } from '@/components/sync';
import { useSyncRoomStore, useConnectionState, usePeers, useRoomCode } from '@/lib/p2p/useSyncRoomStore';
import { ConnectionState } from '@/lib/p2p';

/**
 * Section configuration for navigation and state
 */
type SectionId = 'appearance' | 'customizer' | 'vault' | 'p2p-sync' | 'ui-behavior' | 'accessibility' | 'audit' | 'reset';

interface SectionConfig {
  id: SectionId;
  title: string;
  description?: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize colors, fonts, and visual effects. Changes preview instantly but require saving.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
      </svg>
    ),
  },
  {
    id: 'customizer',
    title: 'Customizer',
    description: 'Configure the mech customizer interface',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    id: 'vault',
    title: 'Vault & Sharing',
    description: 'Manage your vault identity for sharing content',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
    ),
  },
  {
    id: 'p2p-sync',
    title: 'P2P Sync',
    description: 'Real-time peer-to-peer synchronization for collaborative play',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
      </svg>
    ),
  },
  {
    id: 'ui-behavior',
    title: 'UI Behavior',
    description: 'Control how the interface behaves',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    description: 'Options for better accessibility',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'audit',
    title: 'Audit Log',
    description: 'View event history and system logs',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'reset',
    title: 'Reset',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
  },
];

/**
 * Quick navigation tags using URL hash anchors
 */
function QuickNavigation({
  activeSection,
  onNavigate,
}: {
  activeSection: SectionId | null;
  onNavigate: (sectionId: SectionId) => void;
}) {
  return (
    <div className="sticky top-0 z-10 bg-surface-deep/95 backdrop-blur-sm border-b border-border-theme-subtle -mx-4 px-4 py-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-theme-muted mr-1">Jump to:</span>
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(section.id);
              }}
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md
                transition-all duration-150 no-underline
                ${isActive
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'bg-surface-raised/50 text-text-theme-secondary border border-border-theme-subtle hover:bg-surface-raised hover:text-text-theme-primary hover:border-border-theme'
                }
              `}
            >
              {section.icon}
              {section.title}
            </a>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Collapsible settings section wrapper
 */
function SettingsSection({
  id,
  title,
  description,
  isExpanded,
  onToggle,
  onRef,
  children,
}: {
  id: SectionId;
  title: string;
  description?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRef?: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={onRef}
      id={`section-${id}`}
      className="bg-surface-base/50 rounded-lg border border-border-theme-subtle overflow-hidden transition-all duration-200"
    >
      {/* Header - always visible, clickable to toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-raised/30 transition-colors"
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-theme-primary">{title}</h3>
          {description && !isExpanded && (
            <p className="text-sm text-text-theme-muted mt-0.5 line-clamp-1">{description}</p>
          )}
        </div>
        <div className={`ml-4 text-text-theme-secondary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Content - collapsible */}
      <div
        className={`
          transition-all duration-200 ease-in-out
          ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}
        `}
      >
        <div className="px-5 pb-5 border-t border-border-theme-subtle/50">
          {description && (
            <p className="text-sm text-text-theme-secondary mb-4 mt-4">{description}</p>
          )}
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Toggle switch component
 * Rectangular tactical style with proper sizing math
 */
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-theme-primary">{label}</div>
        {description && (
          <div className="text-xs text-text-theme-secondary mt-0.5">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative h-7 w-12 flex-shrink-0 cursor-pointer
          rounded-md border-2
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base
          ${checked
            ? 'bg-accent border-accent-hover'
            : 'bg-surface-raised border-border-theme-strong hover:bg-surface-raised/80 hover:border-border-theme-strong'
          }
        `}
      >
        <span
          aria-hidden="true"
          className={`
            absolute top-0.5 left-0.5
            h-5 w-5 rounded bg-white shadow-md
            border border-slate-300
            transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

/**
 * Select dropdown component
 */
function Select<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string; description?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-text-theme-primary mb-1">{label}</div>
      {description && (
        <div className="text-xs text-text-theme-secondary mb-2">{description}</div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-surface-raised border border-border-theme rounded-lg px-3 py-2 text-text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Color picker for accent colors
 */
function AccentColorPicker({
  value,
  onChange,
}: {
  value: AccentColor;
  onChange: (color: AccentColor) => void;
}) {
  const colors: { value: AccentColor; label: string }[] = [
    { value: 'amber', label: 'Amber' },
    { value: 'cyan', label: 'Cyan' },
    { value: 'emerald', label: 'Emerald' },
    { value: 'rose', label: 'Rose' },
    { value: 'violet', label: 'Violet' },
    { value: 'blue', label: 'Blue' },
  ];

  return (
    <div>
      <div className="text-sm font-medium text-text-theme-primary mb-2">Accent Color</div>
      <div className="text-xs text-text-theme-secondary mb-3">
        Customize the highlight color throughout the app
      </div>
      <div className="flex gap-4 flex-wrap">
        {colors.map((color) => (
          <button
            key={color.value}
            onClick={() => onChange(color.value)}
            className={`w-10 h-10 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base ${
              value === color.value
                ? 'scale-125 shadow-xl ring-4 ring-white/50 border-2 border-white'
                : 'border-2 border-border-theme hover:border-border-theme-strong hover:scale-110'
            }`}
            style={{ backgroundColor: ACCENT_COLOR_CSS[color.value].primary }}
            aria-label={color.label}
            title={color.label}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * UI Theme info for display
 */
const UI_THEME_INFO: Record<UITheme, { name: string; description: string; preview: string }> = {
  default: {
    name: 'Default',
    description: 'Clean slate design with amber accents',
    preview: 'bg-surface-base border-border-theme-subtle',
  },
  neon: {
    name: 'Neon',
    description: 'Cyberpunk-inspired with glow effects',
    preview: 'bg-surface-deep border-cyan-500/30',
  },
  tactical: {
    name: 'Tactical',
    description: 'Military HUD style with monospace fonts',
    preview: 'bg-surface-deep border-border-theme',
  },
  minimal: {
    name: 'Minimal',
    description: 'Reduced visual noise, focus on content',
    preview: 'bg-surface-base/50 border-border-theme-subtle/50',
  },
};

/**
 * UI Theme picker
 */
function UIThemePicker({
  value,
  onChange,
}: {
  value: UITheme;
  onChange: (theme: UITheme) => void;
}) {
  const themes: UITheme[] = ['default', 'minimal', 'neon', 'tactical'];

  return (
    <div>
      <div className="text-sm font-medium text-text-theme-primary mb-2">UI Theme</div>
      <div className="text-xs text-text-theme-secondary mb-3">
        Choose the overall visual style of the interface
      </div>
      <div className="grid grid-cols-2 gap-3">
        {themes.map((theme) => {
          const info = UI_THEME_INFO[theme];
          const isSelected = value === theme;

          return (
            <button
              key={theme}
              onClick={() => onChange(theme)}
              className={`
                p-3 rounded-md border-2 text-left transition-all
                focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base
                ${isSelected
                  ? 'border-accent bg-accent-muted'
                  : 'border-border-theme hover:border-border-theme-strong bg-surface-raised/30'
                }
              `}
            >
              {/* Preview bar */}
              <div className={`h-2 w-full rounded mb-2 border ${info.preview}`} />
              <div className="text-sm font-medium text-text-theme-primary">{info.name}</div>
              <div className="text-xs text-text-theme-secondary mt-0.5">{info.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// Valid section IDs for type checking
const VALID_SECTION_IDS: SectionId[] = ['appearance', 'customizer', 'vault', 'p2p-sync', 'ui-behavior', 'accessibility', 'audit', 'reset'];

function isValidSectionId(hash: string): hash is SectionId {
  return VALID_SECTION_IDS.includes(hash as SectionId);
}

/**
 * P2P Sync settings section
 */
function P2PSyncSection({
  isExpanded,
  onToggle,
  onRef,
}: {
  isExpanded: boolean;
  onToggle: () => void;
  onRef: (el: HTMLDivElement | null) => void;
}): React.ReactElement {
  const connectionState = useConnectionState();
  const peers = usePeers();
  const roomCode = useRoomCode();
  const { localPeerName, localPeerId, setLocalPeerName, createRoom, joinRoom, leaveRoom, error, clearError } = useSyncRoomStore();

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
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-surface-raised/50 border border-border-theme-subtle">
        <div className="flex items-center gap-4">
          <SyncStatusIndicator
            connectionState={connectionState}
            peerCount={peers.length}
          />
          {roomCode && (
            <div className="text-sm">
              <span className="text-text-theme-muted">Room: </span>
              <code className="text-accent font-mono font-bold">{roomCode}</code>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <button
              onClick={leaveRoom}
              className="px-3 py-1.5 text-sm font-medium bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md transition-colors border border-red-500/30"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => setShowRoomDialog(true)}
              disabled={isConnecting}
              className="px-3 py-1.5 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Peer Name Setting */}
      <div>
        <div className="text-sm font-medium text-text-theme-primary mb-1">Your Display Name</div>
        <div className="text-xs text-text-theme-secondary mb-2">
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
            className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>

      {/* Connected Peers */}
      {isConnected && (
        <div>
          <div className="text-sm font-medium text-text-theme-primary mb-2">Connected Peers</div>
          {peers.length > 0 ? (
            <PeerList peers={peers} localPeerId={localPeerId} localPeerName={localPeerName} />
          ) : (
            <div className="p-4 text-center text-sm text-text-theme-muted bg-surface-deep/50 rounded-lg border border-border-theme-subtle">
              Waiting for peers to join...
            </div>
          )}
        </div>
      )}

      {/* How it Works */}
      <div className="pt-4 border-t border-border-theme-subtle">
        <div className="text-sm font-medium text-text-theme-primary mb-2">How P2P Sync Works</div>
        <ul className="space-y-2 text-xs text-text-theme-secondary">
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
        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs text-amber-200">
              P2P sync uses WebRTC for direct peer connections. All data stays between you and your peers - no server storage.
            </span>
          </div>
        </div>
      </div>

      {/* Room Dialog */}
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

export default function SettingsPage(): React.ReactElement {
  const router = useRouter();

  // Track hydration to avoid SSR mismatch
  const [_hasMounted, setHasMounted] = useState(false);

  // Active section from URL hash (only one section expanded at a time)
  // Default to 'appearance' for SSR, will update after mount if hash is present
  const [activeSection, setActiveSection] = useState<SectionId>('appearance');

  // Refs for scrolling to sections
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    appearance: null,
    customizer: null,
    vault: null,
    'p2p-sync': null,
    'ui-behavior': null,
    accessibility: null,
    audit: null,
    reset: null,
  });

  // Parse hash from URL on mount and hash changes
  useEffect(() => {
    setHasMounted(true);

    const handleHashChange = (shouldScroll = true) => {
      const hash = window.location.hash.replace('#', '');
      if (hash && isValidSectionId(hash)) {
        setActiveSection(hash);
        // Scroll to section after a short delay
        if (shouldScroll) {
          setTimeout(() => {
            const element = sectionRefs.current[hash];
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }
      }
    };

    // Check initial hash (don't scroll immediately on page load to avoid jumpiness)
    const hash = window.location.hash.replace('#', '');
    if (hash && isValidSectionId(hash)) {
      setActiveSection(hash);
      // Delayed scroll for initial load
      setTimeout(() => {
        const element = sectionRefs.current[hash];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }

    // Listen for hash changes
    const onHashChange = () => handleHashChange(true);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Navigate to section (update URL hash)
  const navigateToSection = useCallback((sectionId: SectionId) => {
    // Update URL hash (this triggers hashchange event)
    window.history.pushState(null, '', `#${sectionId}`);
    setActiveSection(sectionId);

    // Scroll to section after a short delay
    setTimeout(() => {
      const element = sectionRefs.current[sectionId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }, []);

  // Toggle section - clicking header expands that section
  const toggleSection = useCallback((sectionId: SectionId) => {
    if (activeSection === sectionId) {
      // If clicking the active section, keep it open (or optionally close it)
      // For now, we'll navigate to it anyway to update the URL
      navigateToSection(sectionId);
    } else {
      navigateToSection(sectionId);
    }
  }, [activeSection, navigateToSection]);

  // Get store actions and state
  const initDraftAppearance = useAppSettingsStore((s) => s.initDraftAppearance);
  const saveUITheme = useAppSettingsStore((s) => s.saveUITheme);
  const saveOtherAppearance = useAppSettingsStore((s) => s.saveOtherAppearance);
  const revertAppearance = useAppSettingsStore((s) => s.revertAppearance);
  const hasUnsavedUITheme = useAppSettingsStore((s) => s.hasUnsavedUITheme);
  const hasUnsavedOtherAppearance = useAppSettingsStore((s) => s.hasUnsavedOtherAppearance);

  // Get draft values for display (or saved values if no draft)
  const draftAppearance = useAppSettingsStore((s) => s.draftAppearance);
  const savedAccentColor = useAppSettingsStore((s) => s.accentColor);
  const savedUITheme = useAppSettingsStore((s) => s.uiTheme);
  const savedFontSize = useAppSettingsStore((s) => s.fontSize);
  const savedAnimationLevel = useAppSettingsStore((s) => s.animationLevel);
  const savedCompactMode = useAppSettingsStore((s) => s.compactMode);

  // Effective values for display
  const effectiveAccentColor = draftAppearance?.accentColor ?? savedAccentColor;
  const effectiveUITheme = draftAppearance?.uiTheme ?? savedUITheme;
  const effectiveFontSize = draftAppearance?.fontSize ?? savedFontSize;
  const effectiveAnimationLevel = draftAppearance?.animationLevel ?? savedAnimationLevel;
  const effectiveCompactMode = draftAppearance?.compactMode ?? savedCompactMode;

  // Draft setters for live preview
  const setDraftAccentColor = useAppSettingsStore((s) => s.setDraftAccentColor);
  const setDraftUITheme = useAppSettingsStore((s) => s.setDraftUITheme);
  const setDraftFontSize = useAppSettingsStore((s) => s.setDraftFontSize);
  const setDraftAnimationLevel = useAppSettingsStore((s) => s.setDraftAnimationLevel);
  const setDraftCompactMode = useAppSettingsStore((s) => s.setDraftCompactMode);

  // Other settings (not draft-based)
  const settings = useAppSettingsStore();

  // Initialize draft state on mount
  useEffect(() => {
    initDraftAppearance();
  }, [initDraftAppearance]);

  const revertCustomizer = useAppSettingsStore((s) => s.revertCustomizer);

  // Revert on unmount if there are unsaved changes
  useEffect(() => {
    const handleRouteChange = () => {
      // Revert appearance changes when navigating away
      revertAppearance();
      revertCustomizer();
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events, revertAppearance, revertCustomizer]);

  // Create ref callback for each section
  const createSectionRef = (id: SectionId) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <>
      <Head>
        <title>Settings | MekStation</title>
      </Head>

      <PageLayout
        title="Settings"
        subtitle="Customize your MekStation experience"
        maxWidth="narrow"
      >
        {/* Quick Navigation */}
        <QuickNavigation
          activeSection={activeSection}
          onNavigate={navigateToSection}
        />

        <div className="space-y-4 pb-8">
          {/* Appearance Section */}
          <SettingsSection
            id="appearance"
            title="Appearance"
            description="Customize colors, fonts, and visual effects. Changes preview instantly but require saving."
            isExpanded={activeSection === 'appearance'}
            onToggle={() => toggleSection('appearance')}
            onRef={createSectionRef('appearance')}
          >
            <UIThemePicker
              value={effectiveUITheme}
              onChange={setDraftUITheme}
            />

            {/* UI Theme Save Notice */}
            {hasUnsavedUITheme && (
              <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span className="text-sm text-amber-200">
                    Theme preview active — save to keep changes
                  </span>
                </div>
                <button
                  onClick={saveUITheme}
                  className="px-3 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors"
                >
                  Save Theme
                </button>
              </div>
            )}

            <AccentColorPicker
              value={effectiveAccentColor}
              onChange={setDraftAccentColor}
            />

            <Select<FontSize>
              label="Font Size"
              description="Base font size for the application"
              value={effectiveFontSize}
              onChange={setDraftFontSize}
              options={[
                { value: 'small', label: 'Small (14px)' },
                { value: 'medium', label: 'Medium (16px)' },
                { value: 'large', label: 'Large (18px)' },
              ]}
            />

            <Select<AnimationLevel>
              label="Animation Level"
              description="Control the amount of motion and transitions"
              value={effectiveAnimationLevel}
              onChange={setDraftAnimationLevel}
              options={[
                { value: 'full', label: 'Full - All animations enabled' },
                { value: 'reduced', label: 'Reduced - Essential animations only' },
                { value: 'none', label: 'None - Disable all animations' },
              ]}
            />

            <Toggle
              label="Compact Mode"
              description="Reduce spacing and padding for more information density"
              checked={effectiveCompactMode}
              onChange={setDraftCompactMode}
            />

            {/* Save Button - for accent, font, animation, compact (not theme) */}
            <div className="pt-4 border-t border-border-theme-subtle">
              <div className="flex items-center justify-between">
                <div className="text-sm text-text-theme-secondary">
                  {hasUnsavedOtherAppearance
                    ? 'You have unsaved appearance changes'
                    : 'Appearance settings saved'}
                </div>
                <button
                  onClick={saveOtherAppearance}
                  disabled={!hasUnsavedOtherAppearance}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    hasUnsavedOtherAppearance
                      ? 'bg-accent hover:bg-accent-hover text-white'
                      : 'bg-surface-raised text-text-theme-muted cursor-not-allowed'
                  }`}
                >
                  Save Appearance
                </button>
              </div>
            </div>
          </SettingsSection>

          {/* Customizer Section */}
          <SettingsSection
            id="customizer"
            title="Customizer"
            description="Configure the mech customizer interface"
            isExpanded={activeSection === 'customizer'}
            onToggle={() => toggleSection('customizer')}
            onRef={createSectionRef('customizer')}
          >
            {/* Armor Diagram Mode */}
            <div>
              <div className="text-sm font-medium text-text-theme-primary mb-2">Armor Diagram Mode</div>
              <div className="text-xs text-text-theme-secondary mb-3">
                Choose between schematic grid or silhouette SVG display
              </div>
              <ArmorDiagramModePreview
                selectedMode={settings.armorDiagramMode}
                onSelectMode={settings.setArmorDiagramMode}
              />
            </div>

            {/* Armor Diagram Variant (only visible for silhouette mode) */}
            {settings.armorDiagramMode === 'silhouette' && (
              <div>
                <div className="text-sm font-medium text-text-theme-primary mb-2">Silhouette Aesthetic</div>
                <div className="text-xs text-text-theme-secondary mb-3">
                  Visual style for the armor diagram
                </div>
                <ArmorDiagramSettings />
              </div>
            )}

            <Toggle
              label="Show Design Selector (UAT)"
              description="Display the design variant dropdown in the armor tab for testing"
              checked={settings.showArmorDiagramSelector}
              onChange={settings.setShowArmorDiagramSelector}
            />
          </SettingsSection>

          {/* Vault & Sharing Section */}
          <SettingsSection
            id="vault"
            title="Vault & Sharing"
            description="Manage your vault identity for sharing content"
            isExpanded={activeSection === 'vault'}
            onToggle={() => toggleSection('vault')}
            onRef={createSectionRef('vault')}
          >
            <VaultIdentitySection />
          </SettingsSection>

          {/* P2P Sync Section */}
          <P2PSyncSection
            isExpanded={activeSection === 'p2p-sync'}
            onToggle={() => toggleSection('p2p-sync')}
            onRef={createSectionRef('p2p-sync')}
          />

          {/* UI Behavior Section */}
          <SettingsSection
            id="ui-behavior"
            title="UI Behavior"
            description="Control how the interface behaves"
            isExpanded={activeSection === 'ui-behavior'}
            onToggle={() => toggleSection('ui-behavior')}
            onRef={createSectionRef('ui-behavior')}
          >
            <Toggle
              label="Collapse Sidebar by Default"
              description="Start with the sidebar in collapsed state"
              checked={settings.sidebarDefaultCollapsed}
              onChange={settings.setSidebarDefaultCollapsed}
            />

            <Toggle
              label="Confirm Before Closing"
              description="Show a confirmation when closing tabs with unsaved changes"
              checked={settings.confirmOnClose}
              onChange={settings.setConfirmOnClose}
            />

            <Toggle
              label="Show Tooltips"
              description="Display helpful tooltips on hover"
              checked={settings.showTooltips}
              onChange={settings.setShowTooltips}
            />
          </SettingsSection>

          {/* Accessibility Section */}
          <SettingsSection
            id="accessibility"
            title="Accessibility"
            description="Options for better accessibility"
            isExpanded={activeSection === 'accessibility'}
            onToggle={() => toggleSection('accessibility')}
            onRef={createSectionRef('accessibility')}
          >
            <Toggle
              label="High Contrast"
              description="Increase contrast for better visibility"
              checked={settings.highContrast}
              onChange={settings.setHighContrast}
            />

            <Toggle
              label="Reduce Motion"
              description="Minimize animations for motion sensitivity"
              checked={settings.reduceMotion}
              onChange={settings.setReduceMotion}
            />
          </SettingsSection>

          {/* Audit Log Section */}
          <SettingsSection
            id="audit"
            title="Audit Log"
            description="View event history and system logs"
            isExpanded={activeSection === 'audit'}
            onToggle={() => toggleSection('audit')}
            onRef={createSectionRef('audit')}
          >
            <div className="space-y-4">
              <p className="text-sm text-text-theme-secondary">
                Browse the full event history of your campaigns, pilots, and games. 
                Track changes, review decisions, and replay past sessions.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/audit/timeline"
                  className="flex items-center gap-3 p-4 rounded-lg bg-surface-raised/50 border border-border-theme-subtle hover:bg-surface-raised hover:border-border-theme transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-theme-primary group-hover:text-accent transition-colors">
                      Event Timeline
                    </div>
                    <div className="text-xs text-text-theme-muted">
                      Browse all events
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-raised/30 border border-border-theme-subtle/50 opacity-60">
                  <div className="w-10 h-10 rounded-lg bg-surface-raised flex items-center justify-center text-text-theme-muted">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-theme-secondary">
                      Replay Player
                    </div>
                    <div className="text-xs text-text-theme-muted">
                      Coming soon
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border-theme-subtle">
                <div className="text-xs text-text-theme-muted">
                  <strong className="text-text-theme-secondary">Tip:</strong> You can also access event history from individual pilot and force detail pages.
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Reset Section */}
          <SettingsSection
            id="reset"
            title="Reset"
            isExpanded={activeSection === 'reset'}
            onToggle={() => toggleSection('reset')}
            onRef={createSectionRef('reset')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Reset All Settings</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Restore all settings to their default values
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset all settings to defaults?')) {
                    settings.resetToDefaults();
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </SettingsSection>
        </div>
      </PageLayout>
    </>
  );
}
