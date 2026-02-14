import React, { ReactNode } from 'react';

import { useDeviceType } from '@/hooks/useDeviceType';
import { PanelId, useNavigationStore } from '@/stores/useNavigationStore';

export interface Tab {
  id: string;
  icon: ReactNode;
  label: string;
  panelId: PanelId;
}

interface BottomNavBarProps {
  tabs: Tab[];
  className?: string;
}

/**
 * Bottom navigation bar for mobile editor tabs
 *
 * Fixed-position navigation bar at bottom of screen for mobile.
 * Displays tab icons with active state highlighting and safe-area padding.
 *
 * Integrates with navigation store - tapping a tab pushes the corresponding
 * panel to the navigation stack.
 *
 * Only visible on mobile viewports (< 768px).
 *
 * @example
 * ```tsx
 * const tabs = [
 *   { id: 'structure', icon: <StructureIcon />, label: 'Structure', panelId: 'structure' },
 *   { id: 'armor', icon: <ArmorIcon />, label: 'Armor', panelId: 'armor' },
 *   { id: 'equipment', icon: <EquipIcon />, label: 'Equipment', panelId: 'equipment' },
 * ];
 *
 * <BottomNavBar tabs={tabs} />
 * ```
 */
export function BottomNavBar({
  tabs,
  className = '',
}: BottomNavBarProps): React.ReactElement | null {
  const { isMobile } = useDeviceType();
  const { currentPanel, pushPanel } = useNavigationStore();

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  // Find active tab based on current panel
  const activeTab = tabs.find((tab) => tab.panelId === currentPanel);

  const handleTabPress = (tab: Tab) => {
    // Only push if not already active
    if (tab.panelId !== currentPanel) {
      pushPanel(tab.panelId);
    }
  };

  return (
    <nav
      className={`fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white md:hidden dark:border-gray-700 dark:bg-gray-900 ${className}`.trim()}
      style={{
        minHeight: '56px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="navigation"
      aria-label="Editor tabs"
    >
      <div className="flex h-full min-h-[44px] items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab?.id === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab)}
              className={`flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center transition-colors duration-200 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              } `.trim()}
              style={{
                paddingTop: '8px',
                paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
              }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              aria-selected={isActive}
              role="tab"
              type="button"
            >
              <div className="mb-1 text-xl" aria-hidden="true">
                {tab.icon}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
