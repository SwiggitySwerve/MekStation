/**
 * Campaign Command Actions — integration tests
 *
 * Covers tasks.md 2.5 (hire invokes existing logic + marks dirty),
 * 3.7 (take-loan credits the balance + records the loan), 4.6 (accept
 * invokes existing acceptance logic + marks dirty, decline hides the
 * offer), and 5.1 (every command action marks the campaign dirty so the
 * persistence store auto-saves).
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import {
  SAMPLE_CANDIDATES,
  SAMPLE_OFFERS,
} from '@/components/campaign/command/__fixtures__/commandFixtures';
import { AvailabilityRating } from '@/types/campaign/acquisition/acquisitionTypes';

import {
  acceptContractOffer,
  addAcquisitionRequest,
  declineContractOffer,
  hireCandidate,
  removeAcquisitionRequest,
  takeLoan,
} from '../campaignCommandActions';
import {
  selectActiveLoans,
  selectBalance,
  selectVisibleContractOffers,
} from '../campaignCommandSelectors';
import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';

/** Seed the live campaign store with a campaign carrying command state. */
function seedCampaign(): ICampaign {
  const store = useCampaignStore();
  store.getState().createCampaign('Test', 'mercenary');
  const base = store.getState().getCampaign();
  if (!base) throw new Error('campaign not created');

  store.getState().updateCampaign({
    personnelMarket: SAMPLE_CANDIDATES,
    contractMarket: { offers: SAMPLE_OFFERS, declinedOfferIds: [] },
  } as Partial<ICampaign>);
  return store.getState().getCampaign() as ICampaign;
}

function currentCampaign(): ICampaignWithCommand {
  return useCampaignStore().getState().getCampaign() as ICampaignWithCommand;
}

describe('campaignCommandActions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Clear persisted state BEFORE resetting the singleton: the next
    // useCampaignStore() call rehydrates from localStorage, and since the
    // D-1 persistence fix the round-trip preserves personnelMarket /
    // contractMarket / loans — a prior test's campaign would otherwise
    // leak into "no campaign loaded" assertions through the persist
    // middleware's merge().
    window.localStorage.clear();
    resetCampaignStore();
    useCampaignRosterStore.getState().reset();
    useCampaignPersistenceStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
    resetCampaignStore();
  });

  // ===========================================================================
  // acquisition requests
  // ===========================================================================

  describe('acquisition requests', () => {
    it('adds a pending request to the campaign shopping list', () => {
      seedCampaign();
      const result = addAcquisitionRequest({
        partName: 'PPC',
        quantity: 2,
        availability: AvailabilityRating.E,
        isConsumable: false,
      });

      expect(result.applied).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(currentCampaign().shoppingList?.items).toEqual([
        expect.objectContaining({
          id: result.requestId,
          partId: 'ppc',
          partName: 'PPC',
          quantity: 2,
          availability: AvailabilityRating.E,
          isConsumable: false,
          status: 'pending',
        }),
      ]);
    });

    it('marks the campaign dirty when adding an acquisition request', () => {
      seedCampaign();
      expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
      addAcquisitionRequest({
        partName: 'Medium Laser',
        quantity: 1,
        availability: AvailabilityRating.D,
        isConsumable: false,
      });
      expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    });

    it('rejects invalid acquisition request input', () => {
      seedCampaign();
      const result = addAcquisitionRequest({
        partName: '',
        quantity: 1,
        availability: AvailabilityRating.D,
        isConsumable: false,
      });

      expect(result.applied).toBe(false);
      expect(currentCampaign().shoppingList?.items ?? []).toHaveLength(0);
    });

    it('removes a request without mutating delivered inventory', () => {
      seedCampaign();
      const addResult = addAcquisitionRequest({
        partName: 'SRM Ammo',
        quantity: 2,
        availability: AvailabilityRating.C,
        isConsumable: true,
      });
      useCampaignStore()
        .getState()
        .updateCampaign({
          partsInventory: [
            {
              acquiredAt: '3025-02-01T00:00:00.000Z',
              inventoryId: 'inv-srm-ammo',
              partId: 'srm-ammo',
              partName: 'SRM Ammo',
              quantity: 2,
              source: 'acquisition',
            },
          ],
        } as Partial<ICampaign>);

      const removeResult = removeAcquisitionRequest(addResult.requestId ?? '');

      expect(removeResult.applied).toBe(true);
      expect(currentCampaign().shoppingList?.items ?? []).toHaveLength(0);
      expect(currentCampaign().partsInventory).toHaveLength(1);
      expect(currentCampaign().partsInventory?.[0].quantity).toBe(2);
    });
  });

  // ===========================================================================
  // hireCandidate
  // ===========================================================================

  describe('hireCandidate', () => {
    it('adds the recruit to the roster and removes the offer', () => {
      seedCampaign();
      const offer = SAMPLE_CANDIDATES[0];
      const result = hireCandidate(offer.id);

      expect(result.applied).toBe(true);
      // The hired recruit is on the roster (existing personnel logic).
      const pilots = useCampaignRosterStore.getState().pilots;
      expect(pilots.some((p) => p.pilotName === offer.name)).toBe(true);
      // The offer is gone from the market pool.
      expect(
        currentCampaign().personnelMarket?.some((o) => o.id === offer.id),
      ).toBe(false);
    });

    it('debits the hire cost from the balance', () => {
      seedCampaign();
      const before = selectBalance(currentCampaign()).amount;
      const offer = SAMPLE_CANDIDATES[0];
      hireCandidate(offer.id);
      const after = selectBalance(currentCampaign()).amount;
      expect(after).toBeCloseTo(before - offer.hireCost);
    });

    it('marks the campaign dirty so the persistence store auto-saves', () => {
      seedCampaign();
      expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
      hireCandidate(SAMPLE_CANDIDATES[0].id);
      expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    });

    it('fails gracefully on a stale offer no longer on the market', () => {
      seedCampaign();
      const result = hireCandidate('pmo-does-not-exist');
      expect(result.applied).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('reports applied=false when no campaign is loaded', () => {
      expect(hireCandidate('pmo-elite-pilot').applied).toBe(false);
    });
  });

  // ===========================================================================
  // takeLoan
  // ===========================================================================

  describe('takeLoan', () => {
    it('credits the principal to the balance', () => {
      seedCampaign();
      const before = selectBalance(currentCampaign()).amount;
      takeLoan({ principal: 1_000_000, interestRate: 0.1, termDays: 365 });
      const after = selectBalance(currentCampaign()).amount;
      expect(after).toBeCloseTo(before + 1_000_000);
    });

    it('records an active loan with dailyRepayment fixed at creation', () => {
      seedCampaign();
      takeLoan({ principal: 1_000_000, interestRate: 0.1, termDays: 100 });
      const loans = selectActiveLoans(currentCampaign());
      expect(loans).toHaveLength(1);
      // dailyRepayment = 1,000,000 * 1.1 / 100 = 11,000.
      expect(loans[0].dailyRepayment).toBeCloseTo(11_000);
      expect(loans[0].remainingBalance).toBeCloseTo(1_100_000);
      expect(loans[0].status).toBe('active');
    });

    it('marks the campaign dirty so the persistence store auto-saves', () => {
      seedCampaign();
      expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
      takeLoan({ principal: 500_000, interestRate: 0.05, termDays: 180 });
      expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    });

    it('rejects a non-positive principal', () => {
      seedCampaign();
      const result = takeLoan({
        principal: 0,
        interestRate: 0.1,
        termDays: 100,
      });
      expect(result.applied).toBe(false);
    });

    it('rejects a non-positive term', () => {
      seedCampaign();
      const result = takeLoan({
        principal: 100_000,
        interestRate: 0.1,
        termDays: 0,
      });
      expect(result.applied).toBe(false);
    });
  });

  // ===========================================================================
  // acceptContractOffer
  // ===========================================================================

  describe('acceptContractOffer', () => {
    it('adds the contract to campaign missions and removes the offer', () => {
      seedCampaign();
      const offer = SAMPLE_OFFERS[0];
      const result = acceptContractOffer(offer.id);

      expect(result.applied).toBe(true);
      // The existing mission-contracts acceptance logic added it to missions.
      expect(currentCampaign().missions.has(offer.id)).toBe(true);
      expect(
        useCampaignStore()
          .getState()
          .getMissionsStore()
          ?.getState()
          .getMission(offer.id)?.name,
      ).toBe(offer.name);
      // The offer is gone from the market pool.
      expect(
        currentCampaign().contractMarket?.offers.some((o) => o.id === offer.id),
      ).toBe(false);
    });

    it('marks the campaign dirty so the persistence store auto-saves', () => {
      seedCampaign();
      expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
      acceptContractOffer(SAMPLE_OFFERS[0].id);
      expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    });

    it('fails gracefully on a stale offer no longer on the market', () => {
      seedCampaign();
      const result = acceptContractOffer('contract-does-not-exist');
      expect(result.applied).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  // ===========================================================================
  // declineContractOffer
  // ===========================================================================

  describe('declineContractOffer', () => {
    it('hides the offer from the visible contract market', () => {
      seedCampaign();
      const offer = SAMPLE_OFFERS[1];
      const result = declineContractOffer(offer.id);

      expect(result.applied).toBe(true);
      const visible = selectVisibleContractOffers(currentCampaign());
      expect(visible.some((o) => o.id === offer.id)).toBe(false);
    });

    it('keeps the offer record so a refresh can re-offer it', () => {
      seedCampaign();
      const offer = SAMPLE_OFFERS[1];
      declineContractOffer(offer.id);
      // The offer record stays in `offers` — only the declined-id list grew.
      expect(
        currentCampaign().contractMarket?.offers.some((o) => o.id === offer.id),
      ).toBe(true);
    });

    it('marks the campaign dirty so the persistence store auto-saves', () => {
      seedCampaign();
      expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
      declineContractOffer(SAMPLE_OFFERS[1].id);
      expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    });
  });
});
