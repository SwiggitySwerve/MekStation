import type { ICampaign } from '@/types/campaign/Campaign';
import type { IFactionStanding } from '@/types/campaign/factionStanding/IFactionStanding';
import {
  IDayProcessor,
  IDayProcessorResult,
  DayPhase,
  IDayEvent,
  getDayPipeline,
  isFirstOfMonth,
} from '../dayPipeline';
import { processRegardDecay } from '../factionStanding/standingService';
import {
  checkAccoladeEscalation,
  checkCensureEscalation,
  applyAccolade,
  applyCensure,
  AccoladeLevel,
  CensureLevel,
} from '../factionStanding/escalation';

function createAccoladeEvent(factionId: string, level: AccoladeLevel): IDayEvent {
  const levelNames: Record<AccoladeLevel, string> = {
    [AccoladeLevel.NONE]: 'None',
    [AccoladeLevel.TAKING_NOTICE]: 'Taking Notice',
    [AccoladeLevel.PRESS_RECOGNITION]: 'Press Recognition',
    [AccoladeLevel.CASH_BONUS]: 'Cash Bonus',
    [AccoladeLevel.ADOPTION]: 'Adoption',
    [AccoladeLevel.STATUE]: 'Statue',
  };

  return {
    type: 'faction_accolade',
    description: `Faction ${factionId} has granted accolade: ${levelNames[level]}`,
    severity: 'info',
    data: {
      factionId,
      accoladeLevel: level,
    },
  };
}

function createCensureEvent(factionId: string, level: CensureLevel): IDayEvent {
  const levelNames: Record<CensureLevel, string> = {
    [CensureLevel.NONE]: 'None',
    [CensureLevel.FORMAL_WARNING]: 'Formal Warning',
    [CensureLevel.NEWS_ARTICLE]: 'News Article',
    [CensureLevel.COMMANDER_RETIREMENT]: 'Commander Retirement',
    [CensureLevel.LEADERSHIP_REPLACEMENT]: 'Leadership Replacement',
    [CensureLevel.DISBAND]: 'Disband',
  };

  return {
    type: 'faction_censure',
    description: `Faction ${factionId} has issued censure: ${levelNames[level]}`,
    severity: 'warning',
    data: {
      factionId,
      censureLevel: level,
    },
  };
}

export const factionStandingProcessor: IDayProcessor = {
  id: 'faction-standing',
  phase: DayPhase.EVENTS,
  displayName: 'Faction Standing',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    if (!campaign.options.trackFactionStanding) {
      return { events: [], campaign };
    }

    const events: IDayEvent[] = [];
    const standings = { ...(campaign.factionStandings ?? {}) };

    for (const [factionId, standing] of Object.entries(standings)) {
      standings[factionId] = processRegardDecay(standing, date);
    }

    if (isFirstOfMonth(date)) {
      for (const [factionId, standing] of Object.entries(standings)) {
        const accolade = checkAccoladeEscalation(standing);
        if (accolade !== null) {
          events.push(createAccoladeEvent(factionId, accolade));
          standings[factionId] = applyAccolade(standing, accolade);
        }

        const censure = checkCensureEscalation(standing);
        if (censure !== null) {
          events.push(createCensureEvent(factionId, censure));
          standings[factionId] = applyCensure(standing, censure);
        }
      }
    }

    return {
      events,
      campaign: { ...campaign, factionStandings: standings },
    };
  },
};

export function registerFactionStandingProcessor(): void {
  getDayPipeline().register(factionStandingProcessor);
}
