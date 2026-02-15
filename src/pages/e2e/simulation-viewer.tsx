import { useCallback, useMemo, useState } from 'react';

import type { IThresholds } from '@/components/simulation-viewer/pages/AnalysisBugs';

import { AnalysisBugs } from '@/components/simulation-viewer/pages/AnalysisBugs';
import { CampaignDashboard } from '@/components/simulation-viewer/pages/CampaignDashboard';
import { EncounterHistory } from '@/components/simulation-viewer/pages/EncounterHistory';
import { TabNavigation } from '@/components/simulation-viewer/TabNavigation';
import {
  MOCK_ANOMALIES,
  MOCK_BATTLES,
  MOCK_INVARIANTS,
  MOCK_METRICS,
  MOCK_THRESHOLDS,
  MOCK_VIOLATIONS,
} from '@/pages-modules/e2e/simulation-viewer.mock-data';

const isTestEnv =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  process.env.NEXT_PUBLIC_E2E_TEST === 'true';

type TabId = 'campaign-dashboard' | 'encounter-history' | 'analysis-bugs';

export default function SimulationViewerTestPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('campaign-dashboard');
  const [isDark, setIsDark] = useState(false);
  const [thresholds, setThresholds] = useState<IThresholds>(MOCK_THRESHOLDS);
  const [thresholdSaved, setThresholdSaved] = useState(false);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as TabId);
  }, []);

  const handleDrillDown = useCallback(
    (target: string, _context: Record<string, unknown>) => {
      if (
        target === 'encounter-history' ||
        target === 'analysis-bugs' ||
        target === 'campaign-dashboard'
      ) {
        setActiveTab(target as TabId);
      }
    },
    [],
  );

  const handleToggleDarkMode = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  }, []);

  const handleThresholdChange = useCallback(
    (detector: string, value: number) => {
      setThresholds((prev) => ({ ...prev, [detector]: value }));
      setThresholdSaved(true);
      setTimeout(() => setThresholdSaved(false), 3000);
    },
    [],
  );

  const victoryCount = useMemo(
    () => MOCK_BATTLES.filter((b) => b.outcome === 'victory').length,
    [],
  );

  if (!isTestEnv) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>Not Available</h1>
        <p>This page is only available in development/test environments.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      data-testid="simulation-viewer-harness"
      data-victory-count={victoryCount}
    >
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
        <span
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
          data-testid="harness-label"
        >
          Simulation Viewer E2E Harness
        </span>
        <button
          type="button"
          onClick={handleToggleDarkMode}
          className="min-h-[44px] rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          data-testid="dark-mode-toggle"
        >
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        data-testid={`panel-${activeTab}`}
      >
        {activeTab === 'campaign-dashboard' && (
          <CampaignDashboard
            campaignId="test-campaign-001"
            metrics={MOCK_METRICS}
            onDrillDown={handleDrillDown}
          />
        )}

        {activeTab === 'encounter-history' && (
          <EncounterHistory
            campaignId="test-campaign-001"
            battles={MOCK_BATTLES}
            onDrillDown={handleDrillDown}
          />
        )}

        {activeTab === 'analysis-bugs' && (
          <AnalysisBugs
            campaignId="test-campaign-001"
            invariants={MOCK_INVARIANTS}
            anomalies={MOCK_ANOMALIES}
            violations={MOCK_VIOLATIONS}
            thresholds={thresholds}
            onThresholdChange={handleThresholdChange}
          />
        )}
      </div>

      {thresholdSaved && (
        <div
          className="fixed right-4 bottom-4 rounded-lg bg-green-600 px-4 py-3 text-white shadow-lg"
          data-testid="threshold-saved-toast"
          role="status"
        >
          Thresholds saved
        </div>
      )}
    </div>
  );
}
