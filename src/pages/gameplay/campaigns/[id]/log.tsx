/**
 * Campaign Activity Log Page
 *
 * Full activity list for one campaign. Both this table and the
 * dashboard card call `useCampaignActivityFeed` so they cannot drift
 * by one surface still reading the browser FIFO.
 */

import React, { useMemo, useState } from 'react';

import type { ICampaignActivityDisplayRow } from '@/lib/campaign/activity/campaignActivityDisplay';
import type { ActivityLogCategory } from '@/types/campaign/ActivityLog';

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
    if (notice) return [];
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
      subtitle={`${campaign.name} — ${notice ? 0 : rows.length} entries`}
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
          className="mt-4 text-xs text-slate-400"
        >
          {sourceLabel}
        </p>
      ) : null}

      {notice ? (
        <p data-testid={notice.testid} className="mt-4 text-sm text-slate-300">
          {notice.message}
        </p>
      ) : (
        <>
          <div className="my-4 flex flex-wrap items-center gap-2">
            <label
              htmlFor="activity-log-category-filter"
              className="text-xs text-slate-400"
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
              className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200"
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
              className="ml-4 text-xs text-slate-400"
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
              className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200"
            />
          </div>

          <table
            data-testid="activity-log-table"
            className="w-full border-collapse text-sm"
          >
            <thead>
              <tr className="border-b border-slate-700 text-xs tracking-wide text-slate-400 uppercase">
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
                    className="py-6 text-center text-xs text-slate-500"
                  >
                    No matching entries.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    data-testid={`activity-log-row-${entry.id}`}
                    className="border-b border-slate-800"
                  >
                    <td className="py-2 font-mono text-slate-400">
                      {entry.campaignDay}
                    </td>
                    <td className="py-2 text-slate-300">
                      {CATEGORY_LABELS[entry.category]}
                    </td>
                    <td className="py-2 text-slate-200">{entry.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </PageLayout>
  );
}
