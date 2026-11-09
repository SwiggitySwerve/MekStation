import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import { createDailyRandom } from '@/lib/campaign/utils/campaignRng';
import { createCampaign } from '@/types/campaign/Campaign';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelMarketStyle } from '@/types/campaign/markets/marketTypes';

import {
  generatePersonnelForDay,
  initializePersonnelMarket,
} from '../personnelMarket';

function campaign(patch: Partial<ICampaign> = {}): ICampaign {
  return {
    ...createCampaign('Market Co.', 'mercenary', {
      personnelMarketStyle: PersonnelMarketStyle.MEKHQ,
    }),
    id: 'campaign-initial-market',
    rngSeed: 42,
    currentDate: new Date('3025-06-15T00:00:00.000Z'),
    ...patch,
  };
}

/** @spec openspec/changes/seed-initial-personnel-market/specs/markets-system/spec.md */
describe('personnel offer identity and rolls', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reproduces complete offers despite changed ambient time and randomness', () => {
    const source = campaign();
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const first = generatePersonnelForDay(
      source,
      createDailyRandom(source, source.currentDate, 'personnel-market'),
    );
    jest.spyOn(Date, 'now').mockReturnValue(2000);
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const second = generatePersonnelForDay(
      source,
      createDailyRandom(source, source.currentDate, 'personnel-market'),
    );

    expect(second).toEqual(first);
  });

  it('scopes identities by campaign, seed, date and candidate ordinal', () => {
    const source = campaign();
    const ids = (one: ICampaign) =>
      generatePersonnelForDay(one, () => 0.99).map((offer) => offer.id);
    const initial = ids(source);
    expect(initial).toHaveLength(3);
    expect(new Set(initial).size).toBe(3);
    for (const patch of [
      { id: 'another-campaign' },
      { rngSeed: 43 },
      { currentDate: new Date('3025-06-16T00:00:00.000Z') },
    ]) {
      expect(
        ids({ ...source, ...patch }).some((id) => initial.includes(id)),
      ).toBe(false);
    }
  });

  it('preserves attribute rolls and does not consume identity rolls', () => {
    const random = jest.fn(() => 0.25);
    const [{ id, ...offer }] = generatePersonnelForDay(campaign(), random);
    expect(id).toMatch(/^pmo-/);
    expect(random).toHaveBeenCalledTimes(6);
    expect(offer).toEqual({
      name: 'Hanse Liao',
      role: CampaignPersonnelRole.AEROSPACE_PILOT,
      experienceLevel: 'green',
      skills: { gunnery: 5, piloting: 5 },
      hireCost: 25000,
      expirationDate: '3025-07-15',
    });
  });
});

describe('initial personnel market', () => {
  it('uses the existing seeded daily personnel stream and preserves campaign state', () => {
    const source = campaign();
    const initialized = initializePersonnelMarket(source);
    expect(initialized.personnelMarket).toEqual(
      generatePersonnelForDay(
        source,
        createDailyRandom(source, source.currentDate, 'personnel-market'),
      ),
    );
    expect(initialized.currentDate).toBe(source.currentDate);
    expect(initialized.finances).toBe(source.finances);
    expect((source as ICampaignWithCommand).personnelMarket).toBeUndefined();
    expect(initializePersonnelMarket(initialized)).toBe(initialized);
  });

  it('preserves explicit empty and saved pools without replenishing them', () => {
    const initial = initializePersonnelMarket(campaign());
    const exhausted: ICampaignWithCommand = { ...initial, personnelMarket: [] };
    expect(initializePersonnelMarket(exhausted)).toBe(exhausted);
    expect(initializePersonnelMarket(initial)).toBe(initial);
  });

  it('does not generate offers for disabled markets or guest mirrors', () => {
    const source = campaign();
    const disabled = {
      ...source,
      options: {
        ...source.options,
        personnelMarketStyle: PersonnelMarketStyle.DISABLED,
      },
    };
    const guest: ICampaign = {
      ...source,
      coopSession: { mode: 'guest', hostMatchId: 'match', roomCode: 'ROOMBB' },
    };
    expect(initializePersonnelMarket(disabled)).toBe(disabled);
    expect(initializePersonnelMarket(guest)).toBe(guest);
  });

  it('reproduces legacy seed fallback without mutating the save', () => {
    const legacy = campaign({ rngSeed: undefined });
    expect(initializePersonnelMarket(legacy).personnelMarket).toEqual(
      initializePersonnelMarket(legacy).personnelMarket,
    );
    expect(legacy.rngSeed).toBeUndefined();
  });
});
