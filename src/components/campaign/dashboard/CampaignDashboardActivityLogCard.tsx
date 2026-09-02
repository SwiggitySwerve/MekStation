/**
 * Recent-activity card. Rows and status come from the activity feed,
 * never from `IDashboardSummary`. Feed status wins over the rows prop
 * so a 403 or rejoin answer cannot be painted as an empty log or as
 * leftover FIFO entries the caller forgot to drop. `viewerSeat` is
 * not read — the server already scoped the body.
 */

import Link from 'next/link';
import React, { useMemo, useState } from 'react';

import type { ICampaignActivityDisplayRow } from '@/lib/campaign/activity/campaignActivityDisplay';
import type { CampaignActivityFeedState } from '@/lib/campaign/hooks/useCampaignActivityFeed';
import type { ActivityLogCategory } from '@/types/campaign/ActivityLog';

import { campaignActivityFeedNotice } from '@/lib/campaign/activity/campaignActivityDisplay';
import { ACTIVITY_LOG_CATEGORIES } from '@/types/campaign/ActivityLog';

import { DashboardCard } from './CampaignDashboardCardShell';

const CATEGORY_LABELS: Record<ActivityLogCategory, string> = {
  battle: 'Battle',
  personnel: 'Personnel',
  medical: 'Medical',
  finances: 'Finances',
  acquisitions: 'Acquisitions',
  technical: 'Technical',
  travel: 'Travel',
};

export interface IActivityLogCardProps {
  readonly campaignId: string;
  readonly rows: readonly ICampaignActivityDisplayRow[];
  readonly feed: CampaignActivityFeedState;
}

export function ActivityLogCard({
  campaignId,
  rows,
  feed,
}: IActivityLogCardProps): React.ReactElement {
  const [activeCategory, setActiveCategory] =
    useState<ActivityLogCategory>('battle');
  const notice = campaignActivityFeedNotice(feed);
  const sourceLabel = feed.source === 'local' ? feed.sourceLabel : undefined;
  const filtered = useMemo(
    () => rows.filter((entry) => entry.category === activeCategory).slice(-10),
    [rows, activeCategory],
  );

  return (
    <DashboardCard
      title="Recent Activity"
      testid="dashboard-card-activity-log"
      headerNote={sourceLabel}
      headerNoteTestId="activity-log-source-label"
      footer={
        <Link
          href={`/gameplay/campaigns/${campaignId}/log`}
          className="text-xs text-sky-400 hover:text-sky-200"
        >
          View full log →
        </Link>
      }
    >
      {notice ? (
        <p data-testid={notice.testid} className="text-xs text-slate-400">
          {notice.message}
        </p>
      ) : (
        <>
          <nav
            role="tablist"
            className="-mb-px flex flex-wrap gap-1 border-b border-slate-700"
          >
            {ACTIVITY_LOG_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                data-testid={`activity-log-tab-${cat}`}
                aria-selected={cat === activeCategory}
                onClick={() => setActiveCategory(cat)}
                className={
                  cat === activeCategory
                    ? 'border-b-2 border-sky-400 px-2 py-1 text-xs text-sky-200'
                    : 'px-2 py-1 text-xs text-slate-400 hover:text-slate-200'
                }
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </nav>
          {filtered.length === 0 ? (
            <p
              data-testid="activity-log-empty"
              className="mt-3 text-xs text-slate-500"
            >
              No {CATEGORY_LABELS[activeCategory].toLowerCase()} entries yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-xs text-slate-200">
              {filtered.map((entry) => (
                <li
                  key={entry.id}
                  data-testid={`activity-log-entry-${entry.id}`}
                  className="flex justify-between gap-2"
                >
                  <span className="truncate">{entry.message}</span>
                  <span className="shrink-0 font-mono text-slate-500">
                    Day {entry.campaignDay}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </DashboardCard>
  );
}
