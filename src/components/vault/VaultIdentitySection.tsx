/**
 * Vault Identity Section
 *
 * Settings section for managing vault identity - create, view, unlock.
 * Integrates with the identity store and API endpoints.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useIdentityStore, selectFriendCode } from '@/stores/useIdentityStore';

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Create identity form for first-time setup
 */
function CreateIdentityForm({
  onSuccess,
}: {
  onSuccess: () => void;
}): React.ReactElement {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const { createIdentity, loading, error, clearError } = useIdentityStore();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLocalError(null);
      clearError();

      // Validate
      if (!displayName.trim()) {
        setLocalError('Display name is required');
        return;
      }

      if (password.length < 8) {
        setLocalError('Password must be at least 8 characters');
        return;
      }

      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }

      const success = await createIdentity(displayName.trim(), password);
      if (success) {
        onSuccess();
      }
    },
    [displayName, password, confirmPassword, createIdentity, clearError, onSuccess]
  );

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-200">
        <div className="font-medium mb-1">Create Your Vault Identity</div>
        <p className="text-blue-300/80">
          Your vault identity is used to sign and verify shared content. 
          Choose a display name others will see and a password to protect your signing key.
        </p>
      </div>

      {displayError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-200">
          {displayError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text-theme-primary mb-1">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name or alias"
          className="w-full px-3 py-2 bg-surface-raised border border-border-theme rounded-lg text-text-theme-primary placeholder-text-theme-muted focus:outline-none focus:ring-2 focus:ring-accent"
          maxLength={100}
        />
        <p className="text-xs text-text-theme-secondary mt-1">
          This name will appear on content you share with others.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-theme-primary mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="w-full px-3 py-2 bg-surface-raised border border-border-theme rounded-lg text-text-theme-primary placeholder-text-theme-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <p className="text-xs text-text-theme-secondary mt-1">
          Used to encrypt your private signing key. Choose a strong password.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-theme-primary mb-1">
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          className="w-full px-3 py-2 bg-surface-raised border border-border-theme rounded-lg text-text-theme-primary placeholder-text-theme-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating Identity...' : 'Create Identity'}
      </button>
    </form>
  );
}

/**
 * Unlock identity form
 */
function UnlockIdentityForm({
  displayName,
  onSuccess,
}: {
  displayName: string;
  onSuccess: () => void;
}): React.ReactElement {
  const [password, setPassword] = useState('');
  const { unlockIdentity, loading, error, clearError } = useIdentityStore();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearError();

      const success = await unlockIdentity(password);
      if (success) {
        setPassword('');
        onSuccess();
      }
    },
    [password, unlockIdentity, clearError, onSuccess]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm">
        <div className="font-medium text-amber-200 mb-1">Vault Locked</div>
        <p className="text-amber-300/80">
          Enter your password to unlock your vault identity as <strong>{displayName}</strong>.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text-theme-primary mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your vault password"
          className="w-full px-3 py-2 bg-surface-raised border border-border-theme rounded-lg text-text-theme-primary placeholder-text-theme-muted focus:outline-none focus:ring-2 focus:ring-accent"
          autoFocus
        />
      </div>

      <button
        type="submit"
        disabled={loading || !password}
        className="w-full px-4 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Unlocking...' : 'Unlock Vault'}
      </button>
    </form>
  );
}

/**
 * Unlocked identity display
 */
function UnlockedIdentityDisplay(): React.ReactElement {
  const { publicIdentity, lockIdentity } = useIdentityStore();
  const friendCode = useIdentityStore(selectFriendCode);
  const [copied, setCopied] = useState(false);

  const handleCopyFriendCode = useCallback(async () => {
    if (friendCode) {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [friendCode]);

  if (!publicIdentity) return <></>;

  return (
    <div className="space-y-4">
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
              {publicIdentity.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-text-theme-primary">
                {publicIdentity.displayName}
              </div>
              <div className="text-xs text-green-400">Vault Unlocked</div>
            </div>
          </div>
          <button
            onClick={lockIdentity}
            className="px-3 py-1.5 text-sm bg-surface-raised hover:bg-surface-raised/80 text-text-theme-secondary rounded-md transition-colors"
          >
            Lock
          </button>
        </div>

        <div className="bg-surface-deep/50 rounded-lg p-3">
          <div className="text-xs text-text-theme-secondary mb-1">Your Friend Code</div>
          <div className="flex items-center justify-between">
            <code className="font-mono text-sm text-text-theme-primary tracking-wider">
              {friendCode}
            </code>
            <button
              onClick={handleCopyFriendCode}
              className="px-2 py-1 text-xs bg-surface-raised hover:bg-surface-raised/80 text-text-theme-secondary rounded transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-text-theme-muted mt-2">
            Share this code with others so they can verify content you share.
          </p>
        </div>
      </div>

      <div className="text-sm text-text-theme-secondary">
        <p>
          Your vault identity is used to sign content you export. 
          Recipients can verify the authenticity of shared units, pilots, and forces.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function VaultIdentitySection(): React.ReactElement {
  const { initialized, hasIdentity, publicIdentity, isUnlocked, checkIdentity, loading } =
    useIdentityStore();

  // Check identity status on mount
  useEffect(() => {
    if (!initialized) {
      checkIdentity();
    }
  }, [initialized, checkIdentity]);

  // Loading state
  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-text-theme-secondary">Loading vault identity...</div>
      </div>
    );
  }

  // No identity - show create form
  if (!hasIdentity) {
    return (
      <CreateIdentityForm
        onSuccess={() => {
          // Identity created and unlocked
        }}
      />
    );
  }

  // Has identity but locked - show unlock form
  if (!isUnlocked) {
    return (
      <UnlockIdentityForm
        displayName={publicIdentity?.displayName || 'Unknown'}
        onSuccess={() => {
          // Identity unlocked
        }}
      />
    );
  }

  // Identity unlocked - show status
  return <UnlockedIdentityDisplay />;
}

export default VaultIdentitySection;
