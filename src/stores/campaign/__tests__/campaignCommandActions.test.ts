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
import type { ILoan } from '@/types/campaign/Loan';

import {
  SAMPLE_CANDIDATES,
  SAMPLE_OFFERS,
} from '@/components/campaign/command/__fixtures__/commandFixtures';
import { createLoan } from '@/lib/finances/loanService';
import { AvailabilityRating } from '@/types/campaign/acquisition/acquisitionTypes';
import {
  createHostCoopSession,
  createGuestCoopSession,
} from '@/types/campaign/CoopSession';
import { Money } from '@/types/campaign/Money';

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
  store
    .getState()
    .createCampaign('Test', 'mercenary', { startingFunds: 1_000_000 });
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
    it('does not reuse request IDs after removing and adding the same part', () => {
      seedCampaign();
      const params = {
        partName: 'PPC',
        quantity: 2,
        availability: AvailabilityRating.E,
        isConsumable: false,
      };
      const first = addAcquisitionRequest(params);
      const second = addAcquisitionRequest(params);
      expect(removeAcquisitionRequest(first.requestId ?? '').applied).toBe(
        true,
      );
      const third = addAcquisitionRequest(params);
      expect(third.requestId).not.toBe(second.requestId);
      expect(third.requestId).not.toBe(first.requestId);
      expect(removeAcquisitionRequest(second.requestId ?? '').applied).toBe(
        true,
      );
      expect(
        currentCampaign().shoppingList?.items.map((item) => item.id),
      ).toEqual([third.requestId]);
    });

    it('does not reuse the identity of a removed delivered request', () => {
      seedCampaign();
      const params = {
        partName: 'PPC',
        quantity: 2,
        availability: AvailabilityRating.E,
        isConsumable: false,
      };
      const first = addAcquisitionRequest(params);
      useCampaignStore()
        .getState()
        .updateCampaign({
          shoppingList: {
            items: (currentCampaign().shoppingList?.items ?? []).map(
              (item) => ({ ...item, status: 'delivered' }),
            ),
          },
          partsInventory: [
            {
              inventoryId: `acquisition-${first.requestId}`,
              partId: 'ppc',
              partName: 'PPC',
              quantity: 2,
              source: 'acquisition',
              acquiredAt: '3025-01-01T00:00:00.000Z',
            },
          ],
        });
      expect(removeAcquisitionRequest(first.requestId ?? '').applied).toBe(
        true,
      );
      const second = addAcquisitionRequest(params);
      expect(second.requestId).not.toBe(first.requestId);
      expect(currentCampaign().partsInventory?.[0].quantity).toBe(2);
    });

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
    it.each([-1, NaN, Infinity])(
      'refuses an invalid hire cost %s without mutation',
      (hireCost) => {
        seedCampaign();
        useCampaignStore()
          .getState()
          .updateCampaign({
            personnelMarket: [{ ...SAMPLE_CANDIDATES[0], hireCost }],
          } as Partial<ICampaign>);
        const before = currentCampaign();
        expect(hireCandidate(SAMPLE_CANDIDATES[0].id)).toEqual({
          applied: false,
          reason: 'Invalid offer cost',
        });
        expect(currentCampaign()).toBe(before);
        expect(useCampaignRosterStore.getState().pilots).toEqual([]);
      },
    );
    it('refuses insufficient funds without enrolling or consuming the offer', () => {
      seedCampaign();
      const campaign = currentCampaign();
      useCampaignStore()
        .getState()
        .updateCampaign({
          finances: { ...campaign.finances, balance: Money.ZERO },
        });
      const before = currentCampaign();
      expect(hireCandidate(SAMPLE_CANDIDATES[0].id)).toEqual({
        applied: false,
        reason: 'Insufficient funds',
      });
      expect(currentCampaign()).toBe(before);
      expect(useCampaignRosterStore.getState().pilots).toEqual([]);
    });

    it('commits payment and consumes the offer before enrollment, preserving loan metadata', () => {
      seedCampaign();
      const loans: ILoan[] = [
        createLoan(new Money(100_000), 0.05, 12, new Date('3025-01-01')),
      ];
      useCampaignStore()
        .getState()
        .updateCampaign({ finances: { ...currentCampaign().finances, loans } });
      const offer = SAMPLE_CANDIDATES[0];
      const before = currentCampaign().finances.balance.amount;
      const addPilot = useCampaignRosterStore.getState().addPilot;
      const spy = jest
        .spyOn(useCampaignRosterStore.getState(), 'addPilot')
        .mockImplementation((pilot) => {
          expect(currentCampaign().finances.balance.amount).toBe(
            before - offer.hireCost,
          );
          expect(currentCampaign().finances.transactions.at(-1)?.id).toBe(
            `tx-hire-${offer.id}`,
          );
          expect(currentCampaign().personnelMarket).not.toContainEqual(offer);
          expect(hireCandidate(offer.id).applied).toBe(false);
          addPilot(pilot);
        });
      try {
        expect(hireCandidate(offer.id).applied).toBe(true);
        expect(currentCampaign().finances.loans).toBe(loans);
        expect(hireCandidate(offer.id).applied).toBe(false);
        expect(useCampaignRosterStore.getState().pilots).toHaveLength(1);
      } finally {
        spy.mockRestore();
        useCampaignRosterStore.setState({ addPilot });
      }
    });

    it('restores the debit, offer and roster when enrollment throws after writing', () => {
      seedCampaign();
      const before = currentCampaign();
      const addPilot = useCampaignRosterStore.getState().addPilot;
      const spy = jest
        .spyOn(useCampaignRosterStore.getState(), 'addPilot')
        .mockImplementation((pilot) => {
          addPilot(pilot);
          throw new Error('Enrollment failed');
        });
      try {
        expect(hireCandidate(SAMPLE_CANDIDATES[0].id)).toEqual({
          applied: false,
          reason: 'Enrollment failed',
        });
        expect(currentCampaign().finances).toEqual(before.finances);
        expect(currentCampaign().personnelMarket).toEqual(
          before.personnelMarket,
        );
        expect(useCampaignRosterStore.getState().pilots).toEqual([]);
        expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
      } finally {
        spy.mockRestore();
        useCampaignRosterStore.setState({ addPilot });
      }
    });

    it('rejects an expired candidate and an old paid offer without charging again', () => {
      seedCampaign();
      useCampaignStore()
        .getState()
        .updateCampaign({ currentDate: new Date('3025-04-01') });
      expect(hireCandidate(SAMPLE_CANDIDATES[0].id).applied).toBe(false);
      useCampaignStore()
        .getState()
        .updateCampaign({ currentDate: new Date('3025-01-01') });
      expect(hireCandidate(SAMPLE_CANDIDATES[0].id).applied).toBe(true);
      useCampaignStore()
        .getState()
        .updateCampaign({
          personnelMarket: SAMPLE_CANDIDATES,
        } as Partial<ICampaign>);
      const before = currentCampaign();
      expect(hireCandidate(SAMPLE_CANDIDATES[0].id).applied).toBe(false);
      expect(currentCampaign()).toBe(before);
    });
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
    it('refuses a declined offer and cannot decline an accepted legacy offer', () => {
      seedCampaign();
      const offer = SAMPLE_OFFERS[0];
      expect(declineContractOffer(offer.id).applied).toBe(true);
      expect(acceptContractOffer(offer.id).applied).toBe(false);
      expect(currentCampaign().missions.has(offer.id)).toBe(false);
      useCampaignStore()
        .getState()
        .updateCampaign({
          contractMarket: { offers: SAMPLE_OFFERS, declinedOfferIds: [] },
        } as Partial<ICampaign>);
      expect(acceptContractOffer(offer.id).applied).toBe(true);
      useCampaignStore()
        .getState()
        .updateCampaign({
          contractMarket: { offers: SAMPLE_OFFERS, declinedOfferIds: [] },
        } as Partial<ICampaign>);
      expect(declineContractOffer(offer.id).applied).toBe(false);
      expect(acceptContractOffer(offer.id).applied).toBe(false);
    });
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

  describe('local market admission', () => {
    it.each(['host', 'guest', 'advancing'] as const)(
      'refuses hire, accept and decline while %s without changing any state',
      (mode) => {
        seedCampaign();
        const store = useCampaignStore();
        if (mode === 'advancing') store.setState({ dayAdvanceInFlight: true });
        else
          store.setState({
            campaign: {
              ...currentCampaign(),
              coopSession:
                mode === 'host'
                  ? createHostCoopSession('ABCDEF', 'match')
                  : createGuestCoopSession('match', 'ABCDEF'),
            },
          });
        const before = currentCampaign();
        const roster = useCampaignRosterStore.getState();
        for (const run of [
          () => hireCandidate(SAMPLE_CANDIDATES[0].id),
          () => acceptContractOffer(SAMPLE_OFFERS[0].id),
          () => declineContractOffer(SAMPLE_OFFERS[0].id),
        ]) {
          const result = run();
          expect(result.applied).toBe(false);
          expect(result.reason).toBe(
            mode === 'advancing'
              ? 'Wait for the campaign clock to finish advancing.'
              : 'Use the co-op proposal controls for market changes.',
          );
          expect(currentCampaign()).toBe(before);
          expect(useCampaignRosterStore.getState()).toBe(roster);
          expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
        }
      },
    );
  });
});
