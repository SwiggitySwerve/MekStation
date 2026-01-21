/**
 * P2P Types Tests
 */

import {
  ConnectionState,
  SyncState,
  P2P_CONFIG,
} from '../types';

// =============================================================================
// Enum Tests
// =============================================================================

describe('ConnectionState enum', () => {
  it('should have correct values', () => {
    expect(ConnectionState.Disconnected).toBe('disconnected');
    expect(ConnectionState.Connecting).toBe('connecting');
    expect(ConnectionState.Connected).toBe('connected');
    expect(ConnectionState.Error).toBe('error');
  });
});

describe('SyncState enum', () => {
  it('should have correct values', () => {
    expect(SyncState.Synced).toBe('synced');
    expect(SyncState.Pending).toBe('pending');
    expect(SyncState.Syncing).toBe('syncing');
    expect(SyncState.Conflict).toBe('conflict');
    expect(SyncState.Disabled).toBe('disabled');
  });
});

// =============================================================================
// Configuration Tests
// =============================================================================

describe('P2P_CONFIG', () => {
  it('should have signaling servers', () => {
    expect(P2P_CONFIG.signalingServers).toBeDefined();
    expect(P2P_CONFIG.signalingServers.length).toBeGreaterThan(0);
  });

  it('should use wss:// for signaling servers', () => {
    for (const server of P2P_CONFIG.signalingServers) {
      expect(server.startsWith('wss://')).toBe(true);
    }
  });

  it('should have reasonable max connections', () => {
    expect(P2P_CONFIG.maxConnections).toBeGreaterThanOrEqual(1);
    expect(P2P_CONFIG.maxConnections).toBeLessThanOrEqual(100);
  });

  it('should have 6-char room codes', () => {
    expect(P2P_CONFIG.roomCodeLength).toBe(6);
  });

  it('should have reasonable reconnect settings', () => {
    expect(P2P_CONFIG.maxReconnectAttempts).toBeGreaterThan(0);
    expect(P2P_CONFIG.reconnectBaseDelay).toBeGreaterThan(0);
  });

  it('should have db name prefix', () => {
    expect(P2P_CONFIG.dbNamePrefix).toBeTruthy();
    expect(P2P_CONFIG.dbNamePrefix).toContain('mekstation');
  });
});
