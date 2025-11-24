'use client';

import React from 'react';
import { CustomizerTabId, useCustomizerStore } from '../store/useCustomizerStore';
import { Tabs } from '../../../ui';

interface TabNavigationProps {
  tabs: Array<{ id: CustomizerTabId; label: string }>;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ tabs }) => {
  const activeTab = useCustomizerStore(state => state.activeTab);
  const setActiveTab = useCustomizerStore(state => state.setActiveTab);

  return (
    <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="sticky top-0 z-20" />
  );
};

