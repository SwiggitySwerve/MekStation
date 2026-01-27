/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach } from '@jest/globals';
import type { ICampaign } from '@/types/campaign/Campaign';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { AvailabilityRating } from '@/types/campaign/acquisition/acquisitionTypes';
import type { IAcquisitionRequest, IShoppingList } from '@/types/campaign/acquisition/acquisitionTypes';
import { Money } from '@/types/campaign/Money';
import { DayPhase, _resetDayPipeline } from '../../dayPipeline';
import { acquisitionProcessor, registerAcquisitionProcessor } from '../acquisitionProcessor';
import {
  createShoppingList,
} from '../../acquisition/shoppingList';

// =============================================================================
// Test Helpers
// =============================================================================

function createTestCampaign(overrides?: Partial<ICampaign> & { shoppingList?: IShoppingList }): ICampaign & { shoppingList: IShoppingList } {
  const baseDate = new Date('3025-01-15');
  const { shoppingList, ...campaignOverrides } = overrides || {};
  
  const campaign: ICampaign = {
    id: 'test-campaign',
    name: 'Test Campaign',
    currentDate: baseDate,
    factionId: 'davion',
    personnel: new Map(),
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: {
      transactions: [],
      balance: new Money(100000),
    },
    factionStandings: {},
    options: {
      ...createDefaultCampaignOptions(),
      useAcquisitionSystem: true,
    },
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-01-15T00:00:00Z',
    ...campaignOverrides,
    campaignType: CampaignType.MERCENARY,
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...campaign,
    shoppingList: shoppingList || createShoppingList(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function createPendingRequest(overrides?: Partial<IAcquisitionRequest>): IAcquisitionRequest {
  return {
    id: 'req-001',
    partId: 'part-001',
    partName: 'Autocannon/20',
    quantity: 1,
    availability: AvailabilityRating.D,
    isConsumable: false,
    status: 'pending',
    attempts: 0,
    ...overrides,
  };
}

function createInTransitRequest(overrides?: Partial<IAcquisitionRequest>): IAcquisitionRequest {
  const baseDate = new Date('3025-01-15');
  const deliveryDate = new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000);
  return {
    id: 'req-002',
    partId: 'part-002',
    partName: 'Medium Laser',
    quantity: 2,
    availability: AvailabilityRating.C,
    isConsumable: false,
    status: 'in_transit',
    orderedDate: '3025-01-10T00:00:00Z',
    deliveryDate: deliveryDate.toISOString(),
    attempts: 1,
    lastAttemptDate: '3025-01-10T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// Configuration Tests
// =============================================================================

 
describe('acquisitionProcessor', () => {
  beforeEach(() => {
    _resetDayPipeline();
  });

  describe('configuration', () => {
    it('should have correct id', () => {
      expect(acquisitionProcessor.id).toBe('acquisition');
    });

    it('should run in EVENTS phase', () => {
      expect(acquisitionProcessor.phase).toBe(DayPhase.EVENTS);
    });

    it('should have displayName', () => {
      expect(acquisitionProcessor.displayName).toBe('Acquisition');
    });

    it('should be a valid IDayProcessor', () => {
      expect(acquisitionProcessor.id).toBeDefined();
      expect(acquisitionProcessor.phase).toBeDefined();
      expect(acquisitionProcessor.displayName).toBeDefined();
      expect(typeof acquisitionProcessor.process).toBe('function');
    });
  });

  // ==========================================================================
  // Skip Conditions
  // ==========================================================================

  describe('skip conditions', () => {
    it('should skip when useAcquisitionSystem is false', () => {
      const campaign = createTestCampaign({
        options: {
          ...createDefaultCampaignOptions(),
          useAcquisitionSystem: false,
        },
        shoppingList: {
          items: [createPendingRequest()],
        },
      });

      const result = acquisitionProcessor.process(campaign, campaign.currentDate);

      expect(result.campaign).toBe(campaign);
      expect(result.events).toHaveLength(0);
    });

    it('should skip when useAcquisitionSystem is undefined', () => {
      const campaign = createTestCampaign({
        options: {
          ...createTestCampaign().options,
          useAcquisitionSystem: undefined,
        },
        shoppingList: {
          items: [createPendingRequest()],
        },
      });

      const result = acquisitionProcessor.process(campaign, campaign.currentDate);

      expect(result.campaign).toBe(campaign);
      expect(result.events).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Empty Shopping List
  // ==========================================================================

  describe('empty shopping list', () => {
    it('should handle empty shopping list', () => {
       const campaign = createTestCampaign({
         shoppingList: createShoppingList(),
       });

       const result = acquisitionProcessor.process(campaign, campaign.currentDate);

       expect(result.campaign.shoppingList!.items).toHaveLength(0);
       expect(result.events).toHaveLength(0);
     });
  });

  // ==========================================================================
  // Pending Acquisitions
  // ==========================================================================

  describe('pending acquisitions', () => {
    it('should attempt pending acquisitions', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      const result = acquisitionProcessor.process(campaign, campaign.currentDate);

      // Request should be processed (status changed)
      const updatedRequest = result.campaign.shoppingList!.items[0];
      expect(updatedRequest.status).not.toBe('pending');
    });

    it('should emit event on successful acquisition roll', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      // Use deterministic random for guaranteed success (roll 12 vs TN 8)
      const deterministicRandom = () => 1; // Will roll 6+6=12
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      const successEvents = result.events.filter((e) => e.type === 'acquisition' && e.data?.eventType === 'acquisition_success');
      expect(successEvents.length).toBeGreaterThan(0);
    });

    it('should emit event on failed acquisition roll', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      // Use deterministic random for guaranteed failure (roll 2 vs TN 8)
      const deterministicRandom = () => 0; // Will roll 1+1=2
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      const failureEvents = result.events.filter((e) => e.type === 'acquisition' && e.data?.eventType === 'acquisition_failure');
      expect(failureEvents.length).toBeGreaterThan(0);
    });

    it('should set status to in_transit on successful roll', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-01'),
        shoppingList: {
          items: [request],
        },
      });

      const deterministicRandom = () => 1; // Guaranteed success
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedRequest = (result.campaign as any).shoppingList.items[0];
      expect(updatedRequest.status).toBe('in_transit');
    });

    it('should set status to failed on failed roll', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      const deterministicRandom = () => 0; // Guaranteed failure
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      const updatedRequest = result.campaign.shoppingList!.items[0];
      expect(updatedRequest.status).toBe('failed');
    });

    it('should set deliveryDate on successful roll', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      const deterministicRandom = () => 1; // Guaranteed success
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      const updatedRequest = result.campaign.shoppingList!.items[0];
      expect(updatedRequest.deliveryDate).toBeDefined();
      expect(updatedRequest.deliveryDate).not.toBe('');
    });

    it('should increment attempts on roll attempt', () => {
      const request = createPendingRequest({ attempts: 0 });
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      const deterministicRandom = () => 1;
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      const updatedRequest = result.campaign.shoppingList!.items[0];
      expect(updatedRequest.attempts).toBe(1);
    });

    it('should set lastAttemptDate on roll attempt', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      const deterministicRandom = () => 1;
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      const updatedRequest = result.campaign.shoppingList!.items[0];
      expect(updatedRequest.lastAttemptDate).toBeDefined();
    });

    it('should process multiple pending requests', () => {
      const req1 = createPendingRequest({ id: 'req-1' });
      const req2 = createPendingRequest({ id: 'req-2' });
      const campaign = createTestCampaign({
        shoppingList: {
          items: [req1, req2],
        },
      });

      const deterministicRandom = () => 1;
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      expect(result.campaign.shoppingList!.items).toHaveLength(2);
      expect(result.campaign.shoppingList!.items[0].status).not.toBe('pending');
      expect(result.campaign.shoppingList!.items[1].status).not.toBe('pending');
    });
  });

  // ==========================================================================
  // Deliveries
  // ==========================================================================

  describe('deliveries', () => {
    it('should deliver items when deliveryDate is reached', () => {
      const pastDate = new Date('3025-01-10');
      const request = createInTransitRequest({
        deliveryDate: pastDate.toISOString(),
      });
      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-15'),
        shoppingList: {
          items: [request],
        },
      });

      const result = acquisitionProcessor.process(campaign, campaign.currentDate);

      const updatedRequest = result.campaign.shoppingList!.items[0];
      expect(updatedRequest.status).toBe('delivered');
    });

    it('should emit delivery event when item arrives', () => {
      const pastDate = new Date('3025-01-10');
      const request = createInTransitRequest({
        deliveryDate: pastDate.toISOString(),
      });
      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-15'),
        shoppingList: {
          items: [request],
        },
      });

      const result = acquisitionProcessor.process(campaign, campaign.currentDate);

      const deliveryEvents = result.events.filter((e) => e.type === 'acquisition' && e.data?.eventType === 'delivery');
      expect(deliveryEvents.length).toBeGreaterThan(0);
    });

    it('should not deliver items when deliveryDate is in future', () => {
      const futureDate = new Date('3025-02-15');
      const request = createInTransitRequest({
        deliveryDate: futureDate.toISOString(),
      });
      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-15'),
        shoppingList: {
          items: [request],
        },
      });

      const result = acquisitionProcessor.process(campaign, campaign.currentDate);

      const updatedRequest = result.campaign.shoppingList!.items[0];
      expect(updatedRequest.status).toBe('in_transit');
    });

    it('should deliver items when deliveryDate equals currentDate', () => {
      const currentDate = new Date('3025-01-15');
      const request = createInTransitRequest({
        deliveryDate: currentDate.toISOString(),
      });
      const campaign = createTestCampaign({
        currentDate,
        shoppingList: {
          items: [request],
        },
      });

      const result = acquisitionProcessor.process(campaign, campaign.currentDate);

      const updatedRequest = result.campaign.shoppingList!.items[0];
      expect(updatedRequest.status).toBe('delivered');
    });

    it('should process multiple in-transit requests', () => {
      const pastDate = new Date('3025-01-10');
      const req1 = createInTransitRequest({
        id: 'req-1',
        deliveryDate: pastDate.toISOString(),
      });
      const req2 = createInTransitRequest({
        id: 'req-2',
        deliveryDate: pastDate.toISOString(),
      });
      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-15'),
        shoppingList: {
          items: [req1, req2],
        },
      });

      const result = acquisitionProcessor.process(campaign, campaign.currentDate);

      expect(result.campaign.shoppingList!.items[0].status).toBe('delivered');
      expect(result.campaign.shoppingList!.items[1].status).toBe('delivered');
    });
  });

  // ==========================================================================
  // Mixed Requests
  // ==========================================================================

  describe('mixed requests', () => {
    it('should process pending and in-transit requests together', () => {
      const pending = createPendingRequest({ id: 'pending-1' });
      const inTransit = createInTransitRequest({
        id: 'transit-1',
        deliveryDate: new Date('3025-01-10').toISOString(),
      });
      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-15'),
        shoppingList: {
          items: [pending, inTransit],
        },
      });

      const deterministicRandom = () => 1;
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      expect(result.campaign.shoppingList!.items).toHaveLength(2);
      expect(result.campaign.shoppingList!.items[0].status).not.toBe('pending');
      expect(result.campaign.shoppingList!.items[1].status).toBe('delivered');
    });

    it('should emit multiple event types', () => {
      const pending = createPendingRequest({ id: 'pending-1' });
      const inTransit = createInTransitRequest({
        id: 'transit-1',
        deliveryDate: new Date('3025-01-10').toISOString(),
      });
      const campaign = createTestCampaign({
        currentDate: new Date('3025-01-15'),
        shoppingList: {
          items: [pending, inTransit],
        },
      });

      const deterministicRandom = () => 1;
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      expect(result.events.length).toBeGreaterThan(0);
      const eventTypes = result.events.map((e) => e.data?.eventType);
      expect(eventTypes).toContain('acquisition_success');
      expect(eventTypes).toContain('delivery');
    });
  });

  // ==========================================================================
  // Event Structure
  // ==========================================================================

  describe('event structure', () => {
    it('should emit events with type=acquisition', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      const deterministicRandom = () => 1;
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      const acquisitionEvents = result.events.filter((e) => e.type === 'acquisition');
      expect(acquisitionEvents.length).toBeGreaterThan(0);
    });

    it('should include request details in event data', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      const deterministicRandom = () => 1;
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      const successEvent = result.events.find((e) => e.data?.eventType === 'acquisition_success');
      expect(successEvent?.data?.requestId).toBe(request.id);
      expect(successEvent?.data?.partName).toBe(request.partName);
    });

    it('should have proper event severity', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      const deterministicRandom = () => 1;
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      const acquisitionEvents = result.events.filter((e) => e.type === 'acquisition');
      acquisitionEvents.forEach((event) => {
        expect(['info', 'warning', 'critical']).toContain(event.severity);
      });
    });

    it('should have description in events', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      const deterministicRandom = () => 1;
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      const acquisitionEvents = result.events.filter((e) => e.type === 'acquisition');
      acquisitionEvents.forEach((event) => {
        expect(event.description).toBeDefined();
        expect(event.description.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Registration
  // ==========================================================================

  describe('registration', () => {
    it('should register processor with pipeline', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call
      const pipeline = require('../../dayPipeline').getDayPipeline();
      registerAcquisitionProcessor();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const processors = pipeline.getProcessors();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
      const registered = processors.find((p: any) => p.id === 'acquisition');
      expect(registered).toBeDefined();
    });
  });

  // ==========================================================================
  // Immutability
  // ==========================================================================

  describe('immutability', () => {
    it('should not mutate original campaign', () => {
      const request = createPendingRequest();
      const campaign = createTestCampaign({
        shoppingList: {
          items: [request],
        },
      });

      const originalStatus = campaign.shoppingList.items[0].status;
      const deterministicRandom = () => 1;
      acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      expect(campaign.shoppingList.items[0].status).toBe(originalStatus);
    });

    it('should return new campaign object', () => {
      const campaign = createTestCampaign({
        shoppingList: {
          items: [createPendingRequest()],
        },
      });

      const deterministicRandom = () => 1;
      const result = acquisitionProcessor.process(campaign, campaign.currentDate, deterministicRandom);

      expect(result.campaign).not.toBe(campaign);
    });
  });
});
