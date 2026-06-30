import React, { createContext, useContext } from 'react';

import type { CampaignCustomizerRouteState } from '@/lib/campaign/customizer/campaignCustomizerRoute';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

export interface CampaignCustomizerSession {
  readonly route: CampaignCustomizerRouteState;
  readonly unit: IRosterUnitProjection;
  readonly campaignName: string;
  readonly currentConfiguration: MechBuildConfig;
  readonly returnHref: string;
}

const CampaignCustomizerSessionContext =
  createContext<CampaignCustomizerSession | null>(null);

export function CampaignCustomizerSessionProvider({
  children,
  session,
}: {
  readonly children: React.ReactNode;
  readonly session: CampaignCustomizerSession | null;
}): React.ReactElement {
  return (
    <CampaignCustomizerSessionContext.Provider value={session}>
      {children}
    </CampaignCustomizerSessionContext.Provider>
  );
}

export function useCampaignCustomizerSession(): CampaignCustomizerSession | null {
  return useContext(CampaignCustomizerSessionContext);
}
