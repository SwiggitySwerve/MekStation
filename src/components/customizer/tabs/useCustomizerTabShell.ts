import { useCallback } from 'react';

import type { UseCustomizerTabsResult } from '@/hooks/useCustomizerTabs';

import {
  TabSpec,
  toCustomizerTabConfigs,
} from '@/components/customizer/shared/TabSpec';
import { useCustomizerTabs } from '@/hooks/useCustomizerTabs';

interface UseCustomizerTabShellOptions<TState, TTabId extends string> {
  specs: TabSpec<TState>[];
  state: TState;
  initialTab: TTabId;
  onTabChange?: (tabId: TTabId) => void;
}

export function useCustomizerTabShell<TState, TTabId extends string>({
  specs,
  state,
  initialTab,
  onTabChange,
}: UseCustomizerTabShellOptions<TState, TTabId>): {
  readonly tabBarProps: Pick<
    UseCustomizerTabsResult<TState>,
    'activeTab' | 'dirtyTabs' | 'errorTabs'
  > & {
    readonly tabs: ReturnType<typeof toCustomizerTabConfigs>;
    readonly onTabChange: (tabId: string) => void;
  };
  readonly activeTab: string;
  readonly TabComponent: TabSpec<TState>['component'] | undefined;
} {
  const { visibleSpecs, activeTab, setActiveTab, dirtyTabs, errorTabs } =
    useCustomizerTabs({
      specs,
      state,
      initialTabId: initialTab,
    });

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onTabChange?.(tabId as TTabId);
    },
    [setActiveTab, onTabChange],
  );

  const activeSpec =
    visibleSpecs.find((spec) => spec.id === activeTab) ?? visibleSpecs[0];

  return {
    tabBarProps: {
      tabs: toCustomizerTabConfigs(visibleSpecs),
      activeTab,
      onTabChange: handleTabChange,
      dirtyTabs,
      errorTabs,
    },
    activeTab,
    TabComponent: activeSpec?.component,
  };
}
