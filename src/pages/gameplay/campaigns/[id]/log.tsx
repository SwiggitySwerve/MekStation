import React, { useMemo, useState } from 'react';
/**
 * Campaign Activity Log Page
 *
 * Full activity list for one campaign. Both this table and the
 * dashboard card call `useCampaignActivityFeed` so they cannot drift
 * by one surface still reading the browser FIFO.
 */

import type { ICampaignActivityDisplayRow } from '@/lib/campaign/activity/campaignActivityDisplay';
import type { ActivityLogCategory } from '@/types/campaign/ActivityLog';

import { CampaignAvailabilityFooter } from '@/components/campaign/CampaignAvailabilityFooter';
import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { PageLayout } from '@/components/ui';
import {
  campaignActivityFeedNotice,
  displayRowsFromCampaignActivityFeed,
} from '@/lib/campaign/activity/campaignActivityDisplay';
import { useCampaignActivityFeed } from '@/lib/campaign/hooks/useCampaignActivityFeed';
import {
  getLoadedCampaign,
  renderPendingCampaignPage,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import { ACTIVITY_LOG_CATEGORIES } from '@/types/campaign/ActivityLog';

const CATEGORY_LABELS: Record<ActivityLogCategory, string> = {
  battle: 'Battle',
  personnel: 'Personnel',
  medical: 'Medical',
  finances: 'Finances',
  acquisitions: 'Acquisitions',
  technical: 'Technical',
  travel: 'Travel',
};

export default function CampaignActivityLogPage(): React.ReactElement {
  const shell = useCampaignPageShell('Activity Log');
  const campaignId =
    shell.routeCampaignId ?? (typeof shell.id === 'string' ? shell.id : '');
  const feed = useCampaignActivityFeed(campaignId);
  const rows = displayRowsFromCampaignActivityFeed(feed);
  const notice = campaignActivityFeedNotice(feed);
  const sourceLabel = feed.source === 'local' ? feed.sourceLabel : undefined;
  const [category, setCategory] = useState<ActivityLogCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo<readonly ICampaignActivityDisplayRow[]>(() => {
    if (notice && !notice.keepsEntries) return [];
    const lowerSearch = search.trim().toLowerCase();
    return rows.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      if (lowerSearch === '') return true;
      return entry.message.toLowerCase().includes(lowerSearch);
    });
  }, [rows, notice, category, search]);

  const pending = renderPendingCampaignPage(shell, {
    title: 'Activity Log',
    subtitle: 'Loading activity log...',
  });
  if (pending) return pending;

  const campaign = getLoadedCampaign(shell);

  return (
    <PageLayout
      title="Activity Log"
      subtitle={`${campaign.name} — ${rows.length} entries`}
      maxWidth="wide"
      breadcrumbs={shell.breadcrumbs}
    >
      <CampaignNavigation
        campaignId={campaign.id}
        currentPage="dashboard"
        coopSession={campaign.coopSession}
      />

      {sourceLabel ? (
        <p
          data-testid="activity-log-source-label"
          className="text-text-theme-secondary mt-4 text-xs"
        >
          {sourceLabel}
        </p>
      ) : null}

      {notice && (
        <p
          data-testid={notice.testid}
          className="text-text-theme-secondary mt-4 text-sm"
        >
          {notice.message}
        </p>
      )}
      {(!notice || notice.keepsEntries) && (
        <>
          <div className="my-4 flex flex-wrap items-center gap-2">
            <label
              htmlFor="activity-log-category-filter"
              className="text-text-theme-secondary text-xs"
            >
              Category:
            </label>
            <select
              id="activity-log-category-filter"
              data-testid="activity-log-category-filter"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ActivityLogCategory | 'all')
              }
              className="border-border-theme bg-surface-deep text-text-theme-primary rounded border px-2 py-1 text-sm"
            >
              <option value="all">All categories</option>
              {ACTIVITY_LOG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>

            <label
              htmlFor="activity-log-search"
              className="text-text-theme-secondary ml-4 text-xs"
            >
              Search:
            </label>
            <input
              id="activity-log-search"
              data-testid="activity-log-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter messages…"
              className="border-border-theme bg-surface-deep text-text-theme-primary rounded border px-2 py-1 text-sm"
            />
          </div>

          <table
            data-testid="activity-log-table"
            className="w-full border-collapse text-sm"
          >
            <thead>
              <tr className="border-border-theme text-text-theme-secondary border-b text-xs tracking-wide uppercase">
                <th className="py-2 text-left">Day</th>
                <th className="py-2 text-left">Category</th>
                <th className="py-2 text-left">Message</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    data-testid="activity-log-empty"
                    className="text-text-theme-muted py-6 text-center text-xs"
                  >
                    No matching entries.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    data-testid={`activity-log-row-${entry.id}`}
                    className="border-border-theme-subtle border-b"
                  >
                    <td className="text-text-theme-secondary py-2 font-mono">
                      {entry.campaignDay}
                    </td>
                    <td className="text-text-theme-secondary py-2">
                      {CATEGORY_LABELS[entry.category]}
                    </td>
                    <td className="text-text-theme-primary py-2">
                      {entry.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
      <CampaignAvailabilityFooter
        campaignId={campaign.id}
        coopSession={campaign.coopSession}
      />
    </PageLayout>
  );
}
