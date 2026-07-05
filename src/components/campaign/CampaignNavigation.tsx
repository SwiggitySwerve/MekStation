/**
 * Campaign Navigation Tabs
 * Shared navigation component for campaign detail pages.
 *
 * The "Bays" group (Mech / Repair / Medical / Salvage) was added by
 * `add-campaign-bay-ui` (CP2a, design D1) — the four post-battle bay
 * surfaces share one navigation group so they read as a cohesive cluster.
 *
 * The "Command" group (Personnel & Hiring / Finances & Loans / Contract
 * Market) was added by `add-campaign-command-ui` (CP2b, design D1) — the
 * three command-tier surfaces share one navigation group so they read as
 * a cohesive management cluster, paralleling the Bays group.
 *
 * The "Co-op session" badge (`wire-coop-campaign-route` Wave 6.1, task
 * 2.5) shows when the campaign has a `coopSession` set, surfacing the
 * local user's role (Host / Guest) and the session's room code so it's
 * legible at a glance across every campaign sub-route.
 *
 * The GM Ledger tab exposes the campaign intervention control plane added by
 * `browser-campaign-gm-ledger`, where GM-only corrections can be previewed and
 * approved without exposing private reasoning to player-facing logs.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 * @spec openspec/changes/wire-coop-campaign-route/specs/coop-campaign-sync/spec.md
 */
import Link from 'next/link';

import type { ICoopSession } from '@/types/campaign/CoopSession';

import { canUseCampaignGmControls } from '@/lib/campaign/campaignAuthority';

/**
 * Identifier of the currently-active campaign page. The bay pages
 * (`mech-bay`, `repair-bay`, `medical-bay`, `salvage`) were added by CP2a;
 * the command pages (`hiring`, `finances`, `contract-market`) by CP2b.
 */
export type CampaignPageId =
  | 'dashboard'
  | 'personnel'
  | 'forces'
  | 'missions'
  | 'starmap'
  | 'mech-bay'
  | 'repair-bay'
  | 'medical-bay'
  | 'salvage'
  | 'hiring'
  | 'finances'
  | 'contract-market'
  | 'acquisitions'
  | 'prestige-morale'
  | 'gm-ledger';

interface CampaignNavigationProps {
  campaignId: string;
  currentPage: CampaignPageId;
  /**
   * Co-op session metadata. When set, the navigation renders the
   * "Co-op session" badge with the local user's role (Host / Guest)
   * and the session's room code (`wire-coop-campaign-route` task 2.5).
   * Absent on single-player campaigns.
   */
  coopSession?: ICoopSession;
}

interface NavTab {
  readonly id: CampaignPageId;
  readonly label: string;
  readonly href: string;
}

export function CampaignNavigation({
  campaignId,
  currentPage,
  coopSession,
}: CampaignNavigationProps): React.ReactElement {
  const canUseGmLedger = canUseCampaignGmControls(coopSession);

  const tabs: readonly NavTab[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: `/gameplay/campaigns/${campaignId}`,
    },
    {
      id: 'personnel',
      label: 'Personnel',
      href: `/gameplay/campaigns/${campaignId}/personnel`,
    },
    {
      id: 'forces',
      label: 'Forces',
      href: `/gameplay/campaigns/${campaignId}/forces`,
    },
    {
      id: 'missions',
      label: 'Missions',
      href: `/gameplay/campaigns/${campaignId}/missions`,
    },
    // Starmap surface (`wire-starmap-into-campaign` Wave 6.4) — Inner
    // Sphere navigation + travel between star systems. Sits alongside
    // the other top-level surfaces so the player can jump into the
    // starmap without scrolling past the Bays / Command clusters.
    {
      id: 'starmap',
      label: 'Starmap',
      href: `/gameplay/campaigns/${campaignId}/starmap`,
    },
  ];

  // The "Bays" group — the four post-battle bay surfaces (CP2a, design D1).
  const bayTabs: readonly NavTab[] = [
    {
      id: 'mech-bay',
      label: 'Mech Bay',
      href: `/gameplay/campaigns/${campaignId}/mech-bay`,
    },
    {
      id: 'repair-bay',
      label: 'Repair Bay',
      href: `/gameplay/campaigns/${campaignId}/repair-bay`,
    },
    {
      id: 'medical-bay',
      label: 'Medical Bay',
      href: `/gameplay/campaigns/${campaignId}/medical-bay`,
    },
    {
      id: 'salvage',
      label: 'Salvage',
      href: `/gameplay/campaigns/${campaignId}/salvage`,
    },
  ];

  // The "Command" group — the three command-tier surfaces (CP2b, design D1).
  const commandTabs: readonly NavTab[] = [
    {
      id: 'hiring',
      label: 'Personnel & Hiring',
      href: `/gameplay/campaigns/${campaignId}/hiring`,
    },
    {
      id: 'finances',
      label: 'Finances & Loans',
      href: `/gameplay/campaigns/${campaignId}/finances`,
    },
    {
      id: 'contract-market',
      label: 'Contract Market',
      href: `/gameplay/campaigns/${campaignId}/contract-market`,
    },
    {
      id: 'acquisitions',
      label: 'Acquisitions',
      href: `/gameplay/campaigns/${campaignId}/acquisitions`,
    },
    // The Prestige & Morale surface (CP3 — `add-campaign-refit-and-prestige`,
    // design D10) — a company-level read-only surface, grouped with the
    // other command-tier surfaces.
    {
      id: 'prestige-morale',
      label: 'Prestige & Morale',
      href: `/gameplay/campaigns/${campaignId}/prestige-morale`,
    },
    ...(canUseGmLedger
      ? [
          {
            id: 'gm-ledger',
            label: 'GM Ledger',
            href: `/gameplay/campaigns/${campaignId}/gm-ledger`,
          } satisfies NavTab,
        ]
      : []),
  ];

  const renderTab = (
    tab: NavTab,
    variant: 'primary' | 'menu' = 'primary',
  ): React.ReactElement => {
    const isActive = currentPage === tab.id;
    const primaryClassName = `px-3 py-2 transition-colors sm:px-4 sm:py-3 ${
      isActive
        ? 'text-accent border-accent border-b-2 font-semibold'
        : 'text-text-theme-secondary hover:text-text-theme-primary font-medium'
    }`;
    const menuClassName = `block rounded px-3 py-2 text-sm transition-colors ${
      isActive
        ? 'bg-accent/10 text-accent font-semibold'
        : 'text-text-theme-secondary hover:bg-surface-hover hover:text-text-theme-primary font-medium'
    }`;

    return (
      <Link
        key={tab.id}
        href={tab.href}
        onClick={(event) => {
          if (
            process.env.NODE_ENV !== 'production' ||
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.altKey ||
            event.ctrlKey ||
            event.shiftKey
          ) {
            return;
          }

          event.preventDefault();
          window.location.assign(tab.href);
        }}
        className={variant === 'primary' ? primaryClassName : menuClassName}
        aria-current={isActive ? 'page' : undefined}
      >
        {tab.label}
      </Link>
    );
  };

  const renderTabGroup = (
    label: string,
    testId: string,
    groupTabs: readonly NavTab[],
  ): React.ReactElement => {
    const activeTab = groupTabs.find((tab) => tab.id === currentPage);
    const isActive = activeTab !== undefined;

    return (
      <details
        className="group relative"
        role="group"
        aria-label={label}
        key={label}
      >
        <summary
          className={`flex cursor-pointer list-none items-center gap-2 rounded px-3 py-2 text-sm transition-colors marker:content-none [&::-webkit-details-marker]:hidden ${
            isActive
              ? 'bg-accent/10 text-accent font-semibold'
              : 'text-text-theme-secondary hover:bg-surface-hover hover:text-text-theme-primary font-medium'
          }`}
          data-testid={testId}
        >
          <span>{label}</span>
          {activeTab ? (
            <span className="text-xs normal-case opacity-80">
              {activeTab.label}
            </span>
          ) : null}
          <span
            aria-hidden="true"
            className="text-text-theme-secondary transition-transform group-open:rotate-180"
          >
            v
          </span>
        </summary>
        <div className="border-border-theme bg-surface-primary absolute top-full left-0 z-30 mt-2 hidden min-w-56 flex-col gap-1 rounded-md border p-2 shadow-lg group-open:flex">
          {groupTabs.map((tab) => renderTab(tab, 'menu'))}
        </div>
      </details>
    );
  };

  return (
    <div className="border-border-theme mb-6 border-b">
      <nav
        className="flex flex-wrap items-center gap-1 pb-2"
        role="navigation"
        aria-label="Campaign sections"
      >
        {tabs.map((tab) => renderTab(tab))}

        {/* "Bays" group — visually separated, semantically labelled. */}
        {renderTabGroup('Bays', 'campaign-nav-bays-group', bayTabs)}

        {/* "Command" group — visually separated, semantically labelled. */}
        {renderTabGroup('Command', 'campaign-nav-command-group', commandTabs)}

        {/*
         * "Co-op session" badge — only rendered when a coopSession is set
         * (`wire-coop-campaign-route` task 2.5). Surfaces the local user's
         * role (Host / Guest) and the session's room code at a glance,
         * legible from every campaign sub-route. Single-player campaigns
         * MUST not render this badge (spec scenario "Single-player campaign
         * mounts neither co-op surface").
         */}
        {coopSession ? (
          <span
            className="border-accent text-accent ml-auto rounded border bg-slate-900/60 px-3 py-1 text-xs font-semibold tracking-wider uppercase"
            data-testid="coop-session-badge"
            aria-label={`Co-op session: ${
              coopSession.mode === 'host' ? 'Host' : 'Guest'
            }`}
          >
            Co-op session: {coopSession.mode === 'host' ? 'Host' : 'Guest'}
            {coopSession.mode === 'host' && coopSession.roomCode ? (
              <span
                className="text-text-theme-secondary ml-2 font-mono normal-case"
                data-testid="coop-session-room-code"
              >
                {coopSession.roomCode}
              </span>
            ) : null}
          </span>
        ) : null}
      </nav>
    </div>
  );
}
