import { useRouter } from 'next/router';
/**
 * Campaigns List Page
 * Browse, search, and manage campaign configurations.
 *
 * @spec openspec/specs/campaign-system/spec.md
 * @spec openspec/specs/coop-campaign-sync/spec.md
 */
import { useState, useCallback, useEffect } from 'react';
import { useStore } from 'zustand';

import { PageLayout, Card, Button, EmptyState } from '@/components/ui';
import { parseRoomCode } from '@/lib/p2p/roomCodes';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { ICampaign } from '@/types/campaign/Campaign';

// =============================================================================
// Campaign Card Component
// =============================================================================

interface CampaignCardProps {
  campaign: ICampaign;
  onClick: () => void;
}

function CampaignCard({
  campaign,
  onClick,
}: CampaignCardProps): React.ReactElement {
  // Per PR4 of `wire-iperson-hard-cutover`: roster store is the canonical
  // personnel source — no legacy `campaign.personnel.size` fallback.
  const personnelCount = useCampaignRosterStore((s) => s.pilots.length);
  return (
    <Card
      className="hover:border-accent/50 group cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`campaign-card-${campaign.id}`}
    >
      <h3 className="text-text-theme-primary group-hover:text-accent mb-2 text-lg font-semibold transition-colors">
        {campaign.name}
      </h3>

      <p className="text-text-theme-secondary mb-3 text-sm">
        Faction: {campaign.factionId}
      </p>

      <p className="text-text-theme-secondary mb-4 text-sm">
        Date: {campaign.currentDate.toLocaleDateString()}
      </p>

      <div className="text-text-theme-secondary flex gap-4 text-sm">
        <span>{personnelCount} Personnel</span>
        <span>{campaign.forces.size} Forces</span>
        <span>{campaign.missions.size} Missions</span>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

// =============================================================================
// Helpers — co-op host / guest flow (`wire-coop-campaign-route`, Section 1)
// =============================================================================

/**
 * Default name applied to a fresh co-op campaign so the host can hit
 * "Create Co-op Campaign" once and land on the dashboard without
 * dragging the user through the multi-step create wizard. The user can
 * rename the campaign from the dashboard at any time.
 */
function defaultCoopCampaignName(roomCode: string): string {
  return `Co-op Campaign ${roomCode}`;
}

/** Default faction for the co-op-quick-create path — mirrors `createCampaign`'s `mercenary` default. */
const DEFAULT_COOP_FACTION_ID = 'mercenary';

/**
 * Resolve a room code to a host matchId via the existing multiplayer
 * invite endpoint (`/api/multiplayer/invites/:roomCode`). The guest
 * mirror campaign is minted with that matchId so its `coopSession`
 * pins the mirror to one specific host.
 */
async function resolveInviteCode(
  roomCode: string,
): Promise<{ matchId: string; roomCode: string }> {
  const res = await fetch(
    `/api/multiplayer/invites/${encodeURIComponent(roomCode)}`,
  );
  if (res.status === 404) {
    throw new Error(`No active co-op campaign with room code ${roomCode}`);
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { matchId: string };
  return { matchId: data.matchId, roomCode };
}

export default function CampaignsListPage(): React.ReactElement {
  const router = useRouter();
  const store = useCampaignStore();
  // Reactive subscription (mirrors RosterStateCards.tsx). The previous
  // render-time `store.getState().getCampaign()` read never re-rendered
  // when the store mutated after mount, so a campaign created via store
  // action (create flow, e2e fixture) never surfaced a campaign-card
  // until a full reload (e2e triage RC4).
  const campaign = useStore(store, (s) => s.campaign);
  const campaigns = campaign ? [campaign] : [];
  const [isClient, setIsClient] = useState(false);

  // Join-coop modal state — open / room code input / submission status.
  // The room code lives in local state only; once resolved it becomes
  // the `coopSession.roomCode` on the freshly minted guest mirror.
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createCoopError, setCreateCoopError] = useState<string | null>(null);

  // Hydration fix — flip to client AFTER mount so the SSR pass + the
  // first client render both see `isClient = false` (loading state).
  // The previous `useState(() => { setIsClient(true); })` form invoked
  // the setter inside the state initializer, which fires synchronously
  // during render and produced a server/client divergence on this page
  // (server: empty state; client during hydration: loading state;
  // post-hydration: real grid). PT-102.
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Navigate to create page
  const handleCreateCampaign = useCallback(() => {
    router.push('/gameplay/campaigns/create');
  }, [router]);

  /**
   * Co-op host creation is intentionally disabled until the live
   * multiplayer transport registers an invite server-side. Creating a
   * local-only campaign with a room code would hand guests a code that
   * resolves nowhere, so the honest interim state is an unavailable
   * message.
   */
  const handleCreateCoopCampaign = useCallback(() => {
    setCreateCoopError(
      'Co-op campaign hosting is not available yet. Multiplayer invite registration is still being wired, so no room code was created.',
    );
  }, []);

  /**
   * Open the join-coop modal. The room-code prompt lives inline on
   * this page rather than as a separate route so the user stays on
   * the campaign list while joining.
   */
  const handleOpenJoinCoop = useCallback(() => {
    setCreateCoopError(null);
    setJoinError(null);
    setJoinCode('');
    setJoinOpen(true);
  }, []);

  const handleCloseJoinCoop = useCallback(() => {
    setJoinOpen(false);
    setJoinCode('');
    setJoinError(null);
  }, []);

  /**
   * Submit the room code from the join-coop modal (task 1.2). Resolves
   * the code via `/api/multiplayer/invites/:roomCode` to the host's
   * matchId, then mints a guest mirror campaign through the store's
   * `createGuestMirrorCampaign` action so every campaign-mutating
   * control on the page tree submits an `IGuestProposal` instead of
   * mutating campaign state directly.
   */
  const handleSubmitJoinCoop = useCallback(async () => {
    const parsed = parseRoomCode(joinCode);
    if (!parsed) {
      setJoinError(
        'Enter a 6-character room code (letters and numbers, no I/O/0/1)',
      );
      return;
    }
    setJoinBusy(true);
    setJoinError(null);
    try {
      const { matchId, roomCode } = await resolveInviteCode(parsed);
      // The CO1 baseline-snapshot arrives over the WS layer once the
      // guest connects. For the quick-join path we mint a placeholder
      // mirror named for the room code; the dashboard will accept the
      // baseline snapshot and overwrite the placeholder once it lands.
      const id = store.getState().createGuestMirrorCampaign(matchId, {
        campaignId: `guest-mirror-${matchId}`,
        campaignName: defaultCoopCampaignName(roomCode),
        factionId: DEFAULT_COOP_FACTION_ID,
        roomCode,
      });
      setJoinOpen(false);
      router.push(`/gameplay/campaigns/${id}`);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setJoinBusy(false);
    }
  }, [joinCode, router, store]);

  // Navigate to campaign detail page
  const handleCampaignClick = useCallback(
    (campaign: ICampaign) => {
      router.push(`/gameplay/campaigns/${campaign.id}`);
    },
    [router],
  );

  // Show loading state during SSR/hydration
  if (!isClient) {
    return (
      <PageLayout
        title="Campaigns"
        subtitle="Multi-mission operations with persistent roster and resources"
        maxWidth="wide"
      >
        <div className="animate-pulse">
          <Card className="mb-6 h-20">
            <div className="h-full" />
          </Card>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64">
                <div className="h-full" />
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Campaigns"
      subtitle="Multi-mission operations with persistent roster and resources"
      maxWidth="wide"
      headerContent={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={handleCreateCampaign}
            data-testid="create-campaign-btn"
            leftIcon={
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            }
          >
            New Campaign
          </Button>
          {/*
            Co-op campaign entry points (`wire-coop-campaign-route` Section 1).
            "Create" mints a host-mode campaign with a fresh room code so the
            host lands on the dashboard with the co-op badge + host-review
            surface visible from frame zero. "Join" opens an inline room-code
            prompt that resolves to a host matchId via the existing
            multiplayer invite endpoint and mints a guest mirror campaign.
          */}
          <Button
            variant="secondary"
            onClick={handleCreateCoopCampaign}
            data-testid="create-coop-campaign-btn"
          >
            Create Co-op Campaign
          </Button>
          <Button
            variant="secondary"
            onClick={handleOpenJoinCoop}
            data-testid="join-coop-campaign-btn"
          >
            Join Co-op Campaign
          </Button>
        </div>
      }
    >
      {createCoopError && (
        <div
          role="status"
          data-testid="create-coop-unavailable"
          className="mb-6 rounded-lg border border-amber-600 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
        >
          {createCoopError}
        </div>
      )}

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={
            <div className="bg-surface-raised/50 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-text-theme-muted h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          }
          title="No campaigns yet"
          message="Start a new campaign to lead your mercenary company through multi-mission operations"
          action={
            <Button variant="primary" onClick={handleCreateCampaign}>
              Create First Campaign
            </Button>
          }
          data-testid="campaigns-empty-state"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => handleCampaignClick(campaign)}
            />
          ))}
        </div>
      )}

      {/*
        Join Co-op modal — inline prompt rendered on the campaign list so
        the user can join from the same surface where they would create.
        The modal owns its own state (`joinOpen`/`joinCode`/`joinError`)
        and submits through `handleSubmitJoinCoop`, which resolves the
        code via the multiplayer invite endpoint and mints a guest mirror
        campaign with `coopSession.mode = 'guest'` (task 1.2).
      */}
      {joinOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-coop-dialog-title"
          data-testid="join-coop-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={handleCloseJoinCoop}
        >
          <div
            className="bg-surface-raised w-full max-w-md rounded-xl border border-slate-700 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="join-coop-dialog-title"
              className="text-text-theme-primary mb-2 text-xl font-semibold"
            >
              Join Co-op Campaign
            </h2>
            <p className="text-text-theme-secondary mb-4 text-sm">
              Enter the 6-character room code your host shared with you.
            </p>
            <label
              htmlFor="join-coop-room-code"
              className="text-text-theme-secondary mb-1 block text-xs tracking-wide uppercase"
            >
              Room code
            </label>
            <input
              id="join-coop-room-code"
              data-testid="join-coop-room-code-input"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="ABC-DEF"
              autoFocus
              disabled={joinBusy}
              className="text-text-theme-primary w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-lg tracking-widest uppercase focus:border-sky-500 focus:outline-none"
            />
            {joinError && (
              <p
                role="alert"
                data-testid="join-coop-error"
                className="mt-3 rounded border border-rose-700 bg-rose-900/30 px-3 py-2 text-sm text-rose-200"
              >
                {joinError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleCloseJoinCoop}
                data-testid="join-coop-cancel-btn"
                disabled={joinBusy}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  void handleSubmitJoinCoop();
                }}
                data-testid="join-coop-submit-btn"
                disabled={joinBusy || joinCode.length === 0}
              >
                {joinBusy ? 'Joining…' : 'Join'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
