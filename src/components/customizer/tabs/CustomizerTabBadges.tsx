/**
 * Customizer tab markers and validation badge
 *
 * The per-tab status markers rendered inside a CustomizerTabs button: the
 * unsaved-changes dot, the failing-rule dot and the error/warning count badge.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React from 'react';

import { buildStatusCountText } from '@/components/customizer/shared/buildStatusSummary';
import { TabValidationCounts } from '@/utils/validation/validationNavigation';

import workbenchStyles from '../CustomizerWorkbench.module.css';
import { tooltipFor, type BadgeTooltip } from './TabIssueTooltip';

/**
 * Compute the ARIA label + tooltip string for a validation-error dot.
 *
 * When `errorTabs` is a Map the value is the rule code (e.g.
 * `VAL-VEHICLE-ARMOR-MAX`) and is used verbatim so screen-reader users hear
 * the specific failing rule.  When `errorTabs` is a Set (legacy) or the map
 * entry has an empty/undefined value we fall back to the generic label.
 *
 * Satisfies Spec § Requirement: Validation Error Markers.
 */
function getErrorRuleCode(
  errorTabs: Map<string, string> | Set<string>,
  tabId: string,
): string {
  if (errorTabs instanceof Map)
    return errorTabs.get(tabId) || 'Validation error';
  return 'Validation error';
}

/** "2 errors, 1 warning" for a section tab's badge and description. */
function sectionCountsText(counts: TabValidationCounts | undefined): string {
  if (!counts) return '';
  return [
    counts.errors > 0 ? buildStatusCountText('error', counts.errors) : '',
    counts.warnings > 0 ? buildStatusCountText('warning', counts.warnings) : '',
  ]
    .filter(Boolean)
    .join(', ');
}

function badgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

/** Yellow dot marking a tab with unsaved field changes. */
export function DirtyTabMarker(): React.ReactElement {
  return (
    <span
      className="ml-1 text-yellow-400"
      aria-label="Unsaved changes"
      role="img"
      title="Unsaved changes"
    >
      ●
    </span>
  );
}

/**
 * Red dot marking a tab with a failing constraint. When errorTabs is a Map,
 * the value is the rule code (e.g. "VAL-VEHICLE-ARMOR-MAX") and becomes the
 * ARIA label + tooltip so screen-reader users hear the specific failing rule.
 * A plain Set falls back to the generic "Validation error" label.
 *
 * Satisfies Spec § Requirement: Validation Error Markers.
 */
export function ErrorTabMarker({
  errorTabs,
  tabId,
}: {
  errorTabs: Map<string, string> | Set<string>;
  tabId: string;
}): React.ReactElement {
  return (
    <span
      className="ml-1 text-red-500"
      aria-label={getErrorRuleCode(errorTabs, tabId)}
      role="img"
      title={getErrorRuleCode(errorTabs, tabId)}
    >
      ●
    </span>
  );
}

interface SectionValidationBadgeProps {
  tabId: string;
  label: string;
  counts: TabValidationCounts | undefined;
  issueLines: string[];
  /** Id of the screen-reader description the tab button points at. */
  validationId: string;
  onTooltipChange: (tooltip: BadgeTooltip | null) => void;
}

/**
 * Validation badges: shape and count, never color alone. Errors are a red
 * circle, warnings a yellow rounded square, each holding its count; the slot
 * keeps its width when the counts clear.
 */
export function SectionValidationBadge({
  tabId,
  label,
  counts,
  issueLines,
  validationId,
  onTooltipChange,
}: SectionValidationBadgeProps): React.ReactElement {
  const countsText = sectionCountsText(counts);
  const issueText = issueLines.join('. ');
  return (
    <span
      className={workbenchStyles.sectionValidationDot}
      data-severity={
        counts?.errors ? 'error' : counts?.warnings ? 'warning' : undefined
      }
      data-tab-badge
      role={countsText ? 'img' : undefined}
      aria-label={countsText ? `${label}: ${countsText}` : undefined}
      title={
        countsText && issueLines.length === 0
          ? `${label}: ${countsText}`
          : undefined
      }
      onPointerEnter={(event) => {
        if (issueLines.length > 0)
          onTooltipChange(tooltipFor(tabId, issueLines, event.currentTarget));
      }}
      onPointerLeave={() => onTooltipChange(null)}
    >
      {counts && counts.errors > 0 && (
        <span
          aria-hidden="true"
          data-section-badge="error"
          className={workbenchStyles.sectionBadge}
        >
          {badgeCount(counts.errors)}
        </span>
      )}
      {counts && counts.warnings > 0 && (
        <span
          aria-hidden="true"
          data-section-badge="warning"
          className={workbenchStyles.sectionBadge}
        >
          {badgeCount(counts.warnings)}
        </span>
      )}
      {countsText && (
        <span id={validationId} className="sr-only">
          {issueText || countsText}
        </span>
      )}
    </span>
  );
}
