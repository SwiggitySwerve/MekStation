/**
 * Share Link Handler Page
 *
 * Handles incoming share links by validating and redeeming tokens.
 * Displays content preview and import options.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  PageLayout,
  PageLoading,
  Card,
  Button,
} from '@/components/ui';
import type { IShareLink } from '@/types/vault';

// =============================================================================
// Types
// =============================================================================

interface RedeemResult {
  success: boolean;
  link?: IShareLink;
  error?: string;
  errorCode?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format scope for display
 */
function formatScope(link: IShareLink): string {
  switch (link.scopeType) {
    case 'all':
      return 'All Vault Content';
    case 'category':
      return `All ${link.scopeCategory || 'Items'}`;
    case 'folder':
      return 'Shared Folder';
    case 'item':
      return 'Single Item';
    default:
      return link.scopeType;
  }
}

/**
 * Format permission level for display
 */
function formatLevel(level: string): string {
  switch (level) {
    case 'read':
      return 'View & Copy';
    case 'write':
      return 'View, Copy & Edit';
    case 'admin':
      return 'Full Access';
    default:
      return level;
  }
}

/**
 * Get level badge color
 */
function getLevelColor(level: string): string {
  switch (level) {
    case 'read':
      return 'bg-emerald-600';
    case 'write':
      return 'bg-amber-600';
    case 'admin':
      return 'bg-violet-600';
    default:
      return 'bg-gray-600';
  }
}

// =============================================================================
// Component
// =============================================================================

export default function ShareLinkPage(): React.JSX.Element {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RedeemResult | null>(null);

  // Redeem the share link on mount
  useEffect(() => {
    if (!token || typeof token !== 'string') {
      return;
    }

    const redeemLink = async () => {
      try {
        const response = await fetch('/api/vault/share/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = (await response.json()) as RedeemResult;
        setResult(data);
      } catch (err) {
        setResult({
          success: false,
          error: err instanceof Error ? err.message : 'Failed to redeem share link',
        });
      } finally {
        setLoading(false);
      }
    };

    redeemLink();
  }, [token]);

  const handleGoHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleTryAgain = useCallback(() => {
    setLoading(true);
    setResult(null);
    router.reload();
  }, [router]);

  // Loading state
  if (loading || !token) {
    return (
      <>
        <Head>
          <title>Loading Share Link - MekStation</title>
        </Head>
        <PageLoading message="Validating share link..." />
      </>
    );
  }

  // Error states
  if (!result?.success) {
    const errorTitle = result?.errorCode === 'NOT_FOUND'
      ? 'Share Link Not Found'
      : result?.errorCode === 'EXPIRED'
      ? 'Share Link Expired'
      : result?.errorCode === 'MAX_USES'
      ? 'Share Link Used Up'
      : result?.errorCode === 'INACTIVE'
      ? 'Share Link Inactive'
      : 'Invalid Share Link';

    const errorMessage = result?.errorCode === 'NOT_FOUND'
      ? 'This share link does not exist or has been deleted.'
      : result?.errorCode === 'EXPIRED'
      ? 'This share link has expired and is no longer valid.'
      : result?.errorCode === 'MAX_USES'
      ? 'This share link has reached its maximum number of uses.'
      : result?.errorCode === 'INACTIVE'
      ? 'This share link has been deactivated by its owner.'
      : result?.error || 'There was a problem with this share link.';

    return (
      <>
        <Head>
          <title>{errorTitle} - MekStation</title>
        </Head>
        <PageLayout
          title={errorTitle}
          subtitle={errorMessage}
          backLink="/"
          backLabel="Go Home"
        >
          <Card variant="dark" className="max-w-md mx-auto text-center p-8">
            <div className="text-6xl mb-4">
              {result?.errorCode === 'NOT_FOUND' ? '🔍' : 
               result?.errorCode === 'EXPIRED' ? '⏰' :
               result?.errorCode === 'MAX_USES' ? '📊' :
               result?.errorCode === 'INACTIVE' ? '🔒' : '⚠️'}
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{errorTitle}</h2>
            <p className="text-gray-400 mb-6">{errorMessage}</p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={handleTryAgain}>
                Try Again
              </Button>
              <Button variant="primary" onClick={handleGoHome}>
                Go Home
              </Button>
            </div>
          </Card>
        </PageLayout>
      </>
    );
  }

  // Success state - show link details
  const link = result.link!;

  return (
    <>
      <Head>
        <title>Share Link - MekStation</title>
      </Head>
      <PageLayout
        title="Share Link Accessed"
        subtitle="This share link grants you access to shared content"
        backLink="/"
        backLabel="Go Home"
      >
        <Card variant="dark" className="max-w-md mx-auto p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="text-xl font-bold text-green-400">Access Granted</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400">Scope</span>
              <span className="text-white">{formatScope(link)}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400">Permission</span>
              <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getLevelColor(link.level)}`}>
                {formatLevel(link.level)}
              </span>
            </div>

            {link.label && (
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Label</span>
                <span className="text-white">{link.label}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-gray-400">Uses</span>
              <span className="text-white">
                {link.useCount}{link.maxUses ? ` / ${link.maxUses}` : ''}
              </span>
            </div>

            {link.expiresAt && (
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400">Expires</span>
                <span className="text-white">
                  {new Date(link.expiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-400 text-center">
              You now have <span className="text-white font-medium">{formatLevel(link.level)}</span> access
              to the shared content. The content should be available in your vault.
            </p>
          </div>

          <div className="mt-6">
            <Button variant="primary" className="w-full" onClick={handleGoHome}>
              Go to Vault
            </Button>
          </div>
        </Card>
      </PageLayout>
    </>
  );
}
