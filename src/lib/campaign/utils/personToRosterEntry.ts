/**
 * Person → Roster Entry Synthesis (PR3 transitional bridge)
 *
 * Synthesizes a minimal `ICampaignRosterEntry` from a legacy `IPerson`
 * so the migrated PR2 helpers (which take `(entry, pilot)`) can be called
 * against `campaign.personnel.values()` data sources.
 *
 * **Lifetime**: PR3 only. PR4 deletes `campaign.personnel` entirely; once
 * gone, all callers must populate `useCampaignRosterStore` directly and
 * this synthesis function becomes unused. Delete it in PR4.
 *
 * @spec openspec/changes/wire-iperson-hard-cutover/design.md
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPerson } from '@/types/campaign/Person';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';

export function personToMinimalEntry(person: IPerson): ICampaignRosterEntry {
  return {
    pilotId: person.id,
    pilotName: person.name,
    status:
      person.status === PersonnelStatus.KIA
        ? CampaignPilotStatus.KIA
        : person.status === PersonnelStatus.WOUNDED
          ? CampaignPilotStatus.Wounded
          : person.status === PersonnelStatus.MIA
            ? CampaignPilotStatus.MIA
            : CampaignPilotStatus.Active,
    wounds: person.hits ?? 0,
    recoveryTime: person.daysToWaitForHealing ?? 0,
    xp: person.xp ?? 0,
    campaignXpEarned: person.totalXpEarned ?? 0,
    campaignKills: person.totalKills ?? 0,
    campaignMissions: person.missionsCompleted ?? 0,
    hireDate: person.recruitmentDate ?? new Date(0),
    primaryRole:
      (person.primaryRole as CampaignPersonnelRole) ??
      CampaignPersonnelRole.PILOT,
    rankIndex: person.rankIndex ?? 0,
    injuries: person.injuries,
    traits: person.traits,
    lastPromotionDate: person.lastPromotionDate,
    isFounder: person.isFounder,
    isCommander: person.isCommander,
  };
}
