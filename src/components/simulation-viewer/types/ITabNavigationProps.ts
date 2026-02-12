/**
 * Props for Tab Navigation component for switching between viewer tabs.
 * Manages active tab state and navigation between Campaign Dashboard, Encounter History, and Analysis & Bugs.
 *
 * @example
 * const props: ITabNavigationProps = {
 *   activeTab: 'campaign-dashboard',
 *   onTabChange: (tab) => logger.debug('Tab changed to:', tab),
 *   className: 'custom-tabs'
 * };
 */
export interface ITabNavigationProps {
  readonly activeTab:
    | 'campaign-dashboard'
    | 'encounter-history'
    | 'analysis-bugs';
  readonly onTabChange: (tab: string) => void;
  readonly className?: string;
}
