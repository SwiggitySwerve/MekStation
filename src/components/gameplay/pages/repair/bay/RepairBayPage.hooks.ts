import { useCallback, useEffect, useState } from 'react';

import type { StatusFilter } from './RepairBayPage.types';

interface UseRepairFiltersResult {
  searchQuery: string;
  statusFilter: StatusFilter;
  setStatusFilter: (statusFilter: StatusFilter) => void;
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  resetFilters: () => void;
}

export function useRepairFilters(): UseRepairFiltersResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
  }, []);

  return {
    searchQuery,
    statusFilter,
    setStatusFilter,
    handleSearchChange,
    resetFilters,
  };
}

interface UseRepairInitializationOptions {
  activeCampaignId: string;
  initializeCampaign: (campaignId: string) => void;
}

export function useRepairInitialization({
  activeCampaignId,
  initializeCampaign,
}: UseRepairInitializationOptions): boolean {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeCampaign(activeCampaignId);
    setIsInitialized(true);
  }, [activeCampaignId, initializeCampaign]);

  return isInitialized;
}
