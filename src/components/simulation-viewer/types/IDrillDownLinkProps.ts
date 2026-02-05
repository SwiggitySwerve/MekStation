/**
 * Props for Drill-Down Link component for navigating between tabs with filters.
 * Enables contextual navigation with optional filter parameters.
 *
 * @example
 * const props: IDrillDownLinkProps = {
 *   label: 'View All Anomalies',
 *   targetTab: 'analysis-bugs',
 *   filter: { severity: 'critical' },
 *   icon: 'arrow-right',
 *   className: 'drill-down-link'
 * };
 */
export interface IDrillDownLinkProps {
  readonly label: string;
  readonly targetTab:
    | 'campaign-dashboard'
    | 'encounter-history'
    | 'analysis-bugs';
  readonly filter?: Record<string, unknown>;
  readonly icon?: string;
  readonly className?: string;
}
