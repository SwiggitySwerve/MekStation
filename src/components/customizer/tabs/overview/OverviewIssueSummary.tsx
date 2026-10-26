/**
 * Phone issue summary
 *
 * On phones the Overview opens with what needs attention: the readiness rows
 * that are not passing, each with its link to the tab that fixes it, above
 * Identity. It reuses the Build readiness rows and counts; with nothing to
 * fix it renders nothing and Identity stays first.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React from 'react';

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';

import { BUILD_STATE_TINT_CLASS } from '@/components/customizer/shared/BuildStatusLabel';

import type { BuildReadiness } from './useBuildReadiness';

import { BuildReadinessList } from './BuildReadinessList';

interface OverviewIssueSummaryProps {
  readonly readiness: BuildReadiness;
  readonly onNavigate?: (tabId: CustomizerTabId) => void;
}

export function OverviewIssueSummary({
  readiness,
  onNavigate,
}: OverviewIssueSummaryProps): React.ReactElement | null {
  const failing = readiness.rows.filter((row) => row.severity !== 'ok');
  if (failing.length === 0) return null;
  return (
    <div
      className={`${BUILD_STATE_TINT_CLASS[readiness.status.state]} min-w-0 rounded-lg border p-4 sm:hidden`}
      data-testid="overview-issue-summary"
    >
      <BuildReadinessList
        rows={failing}
        status={readiness.status}
        onNavigate={onNavigate}
        title="Needs attention"
        idPrefix="overview-issues"
        headingLevel="h3"
      />
    </div>
  );
}
