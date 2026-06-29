/**
 * Campaign Activity Log Page
 *
 * Full 200-entry activity log surfaced from the campaign store
 * (`add-campaign-command-center` Wave 6.1.B, task 5.1). The
 * dashboard's <ActivityLogCard> shows the last 10 entries per
 * category — this page is the operator's drill-down view with a
 * category filter + free-text search.
 *
 * Wave 6.1.B ships the basic filter + search. The full date-range
 * filter (also called out by the proposal) is deliberately deferred
 * — the activity log carries `campaignDay` already, and the existing
 * filter pattern composes cleanly when a follow-up adds the
 * date-range picker.
 *
 * @spec openspec/changes/add-campaign-command-center/specs/campaign-system/spec.md
 */

import React, { useMemo, useState } from 'react';
import { useStore } from 'zustand';

import type {
  ActivityLogCategory,
  IActivityLogEntry,
} from '@/types/campaign/ActivityLog';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { PageLayout } from '@/components/ui';
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
  const entries = useStore(shell.store, (state) => state.activityLog);
  const [category, setCategory] = useState<ActivityLogCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo<readonly IActivityLogEntry[]>(() => {
    const lowerSearch = search.trim().toLowerCase();
    return entries
      .filter((e) => (category === 'all' ? true : e.category === category))
      .filter((e) =>
        lowerSearch === ''
          ? true
          : e.message.toLowerCase().includes(lowerSearch),
      )
      .slice()
      .reverse();
  }, [entries, category, search]);

  const pending = renderPendingCampaignPage(shell, {
    title: 'Activity Log',
    subtitle: 'Loading activity log...',
  });
  if (pending) return pending;

  const campaign = getLoadedCampaign(shell);

  return (
    <PageLayout
      title="Activity Log"
      subtitle={`${campaign.name} — ${entries.length} entries`}
      maxWidth="wide"
      breadcrumbs={shell.breadcrumbs}
    >
      <CampaignNavigation
        campaignId={campaign.id}
        currentPage="dashboard"
        coopSession={campaign.coopSession}
      />

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
            <th className="py-2 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td
                colSpan={4}
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
                <td className="py-2 text-right font-mono text-xs text-slate-500">
                  {entry.timestamp.slice(0, 19).replace('T', ' ')}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </PageLayout>
  );
}
