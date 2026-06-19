/**
 * Identity Store
 *
 * Zustand store for vault identity state management.
 * Handles identity initialization, unlocking, and state.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { create } from 'zustand';

import type { IPublicIdentity } from '@/types/vault';

// =============================================================================
// API Response Types
// =============================================================================

interface CheckIdentityResponse {
  hasIdentity: boolean;
  publicIdentity: IPublicIdentity | null;
  error?: string;
}

interface CreateIdentityResponse {
  success: boolean;
  publicIdentity?: IPublicIdentity;
  error?: string;
}

interface UnlockIdentityResponse {
  success: boolean;
  publicIdentity?: IPublicIdentity;
  error?: string;
}

interface UpdateIdentityResponse {
  success: boolean;
  error?: string;
}

// =============================================================================
// Store Types
// =============================================================================

interface IdentityState {
  /** Whether identity system has been checked */
  initialized: boolean;

  /** Whether an identity exists (may be locked) */
  hasIdentity: boolean;

  /** Public identity (available when identity exists) */
  publicIdentity: IPublicIdentity | null;

  /** Whether identity is currently unlocked (password verified with server) */
  isUnlocked: boolean;

  /** Loading state */
  loading: boolean;

  /** Error message */
  error: string | null;
}

interface IdentityActions {
  /** Check if identity exists and load public info */
  checkIdentity: () => Promise<void>;

  /** Create a new identity */
  createIdentity: (displayName: string, password: string) => Promise<boolean>;

  /** Unlock existing identity with password */
  unlockIdentity: (password: string) => Promise<boolean>;

  /** Lock the identity (clear private key from memory) */
  lockIdentity: () => void;

  /** Update display name */
  updateDisplayName: (displayName: string) => Promise<boolean>;

  /** Clear any error */
  clearError: () => void;
}

type IdentityStore = IdentityState & IdentityActions;
type SetIdentityState = (
  partial:
    | Partial<IdentityStore>
    | ((state: IdentityStore) => Partial<IdentityStore>),
) => void;
type GetIdentityState = () => IdentityStore;

function identityError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function checkIdentityLogic(set: SetIdentityState): Promise<void> {
  set({ loading: true, error: null });

  try {
    const response = await fetch('/api/vault/identity');
    const data = (await response.json()) as CheckIdentityResponse;
    set(
      response.ok
        ? {
            initialized: true,
            hasIdentity: data.hasIdentity,
            publicIdentity: data.publicIdentity ?? null,
            loading: false,
          }
        : {
            initialized: true,
            hasIdentity: false,
            error: data.error ?? 'Failed to check identity',
            loading: false,
          },
    );
  } catch (error) {
    set({
      initialized: true,
      hasIdentity: false,
      error: identityError(error, 'Failed to check identity'),
      loading: false,
    });
  }
}

async function createIdentityLogic(
  set: SetIdentityState,
  displayName: string,
  password: string,
): Promise<boolean> {
  set({ loading: true, error: null });

  try {
    const response = await fetch('/api/vault/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, password }),
    });
    const data = (await response.json()) as CreateIdentityResponse;

    if (response.ok && data.success && data.publicIdentity) {
      set({
        hasIdentity: true,
        publicIdentity: data.publicIdentity,
        isUnlocked: true,
        loading: false,
      });
      return true;
    }

    set({ error: data.error ?? 'Failed to create identity', loading: false });
    return false;
  } catch (error) {
    set({
      error: identityError(error, 'Failed to create identity'),
      loading: false,
    });
    return false;
  }
}

async function unlockIdentityLogic(
  set: SetIdentityState,
  password: string,
): Promise<boolean> {
  set({ loading: true, error: null });

  try {
    const response = await fetch('/api/vault/identity/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = (await response.json()) as UnlockIdentityResponse;

    if (response.ok && data.success && data.publicIdentity) {
      set({
        publicIdentity: data.publicIdentity,
        isUnlocked: true,
        loading: false,
      });
      return true;
    }

    set({ error: data.error ?? 'Failed to unlock identity', loading: false });
    return false;
  } catch (error) {
    set({
      error: identityError(error, 'Failed to unlock identity'),
      loading: false,
    });
    return false;
  }
}

async function updateDisplayNameLogic(
  set: SetIdentityState,
  get: GetIdentityState,
  displayName: string,
): Promise<boolean> {
  const { publicIdentity, isUnlocked } = get();
  if (!isUnlocked || !publicIdentity) {
    set({ error: 'No identity to update' });
    return false;
  }

  set({ loading: true, error: null });

  try {
    const response = await fetch('/api/vault/identity', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    });
    const data = (await response.json()) as UpdateIdentityResponse;

    if (response.ok && data.success) {
      set({
        publicIdentity: { ...publicIdentity, displayName },
        loading: false,
      });
      return true;
    }

    set({
      error: data.error ?? 'Failed to update display name',
      loading: false,
    });
    return false;
  } catch (error) {
    set({
      error: identityError(error, 'Failed to update display name'),
      loading: false,
    });
    return false;
  }
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useIdentityStore = create<IdentityStore>((set, get) => ({
  // Initial state
  initialized: false,
  hasIdentity: false,
  publicIdentity: null,
  isUnlocked: false,
  loading: false,
  error: null,

  checkIdentity: () => checkIdentityLogic(set),
  createIdentity: (displayName, password) =>
    createIdentityLogic(set, displayName, password),
  unlockIdentity: (password) => unlockIdentityLogic(set, password),

  lockIdentity: () => {
    set({
      isUnlocked: false,
    });
  },

  updateDisplayName: (displayName) =>
    updateDisplayNameLogic(set, get, displayName),

  clearError: () => {
    set({ error: null });
  },
}));

// =============================================================================
// Selectors
// =============================================================================

export function useIdentitySelector<T>(
  selector: (state: IdentityStore) => T,
): T {
  return useIdentityStore(selector);
}

/** Select if identity is ready for sharing operations */
export const selectCanShare = (state: IdentityStore): boolean =>
  state.isUnlocked && state.publicIdentity !== null;

/** Select friend code */
export const selectFriendCode = (state: IdentityStore): string | null =>
  state.publicIdentity?.friendCode || null;
