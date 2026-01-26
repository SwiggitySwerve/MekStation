import type { ICampaign } from '@/types/campaign/Campaign';
import {
  IDayProcessor,
  IDayProcessorResult,
  DayPhase,
  IDayEvent,
  getDayPipeline,
} from '../dayPipeline';
import {
  performAcquisitionRoll,
  type RandomFn,
} from '../acquisition/acquisitionRoll';
import {
  calculateDeliveryTime,
} from '../acquisition/deliveryTime';
import {
  getPendingRequests,
  getInTransitRequests,
  updateRequest,
} from '../acquisition/shoppingList';
import type { IAcquisitionRequest, IShoppingList } from '@/types/campaign/acquisition/acquisitionTypes';

export const processorId = 'acquisition';

function createAcquisitionEvent(
  eventType: 'acquisition_success' | 'acquisition_failure' | 'delivery',
  request: IAcquisitionRequest,
  deliveryDate?: string,
): IDayEvent {
  const baseDescription = `${request.partName} (${request.quantity}x)`;

  let description: string;
  let severity: 'info' | 'warning' | 'critical';

  switch (eventType) {
    case 'acquisition_success':
      description = `Acquisition successful: ${baseDescription}`;
      severity = 'info';
      break;
    case 'acquisition_failure':
      description = `Acquisition failed: ${baseDescription}`;
      severity = 'warning';
      break;
    case 'delivery':
      description = `Delivery arrived: ${baseDescription}`;
      severity = 'info';
      break;
  }

  return {
    type: 'acquisition',
    description,
    severity,
    data: {
      eventType,
      requestId: request.id,
      partName: request.partName,
      quantity: request.quantity,
      availability: request.availability,
      deliveryDate,
    },
  };
}

function processPendingAcquisitions(
  shoppingList: IShoppingList,
  currentDate: Date,
  random: RandomFn,
): { updatedList: IShoppingList; events: IDayEvent[] } {
  const pending = getPendingRequests(shoppingList);
  const events: IDayEvent[] = [];
  let updatedList = shoppingList;

  for (const request of pending) {
    const result = performAcquisitionRoll(
      request.id,
      request.availability,
      request.isConsumable,
      [],
      random,
    );

    if (result.success) {
      const deliveryDays = calculateDeliveryTime(request.availability, 'month', random);
      const deliveryDate = new Date(currentDate.getTime() + deliveryDays * 24 * 60 * 60 * 1000);

      updatedList = updateRequest(updatedList, request.id, {
        status: 'in_transit',
        deliveryDate: deliveryDate.toISOString(),
        orderedDate: currentDate.toISOString(),
        attempts: (request.attempts || 0) + 1,
        lastAttemptDate: currentDate.toISOString(),
      });

      events.push(createAcquisitionEvent('acquisition_success', request, deliveryDate.toISOString()));
    } else {
      updatedList = updateRequest(updatedList, request.id, {
        status: 'failed',
        attempts: (request.attempts || 0) + 1,
        lastAttemptDate: currentDate.toISOString(),
      });

      events.push(createAcquisitionEvent('acquisition_failure', request));
    }
  }

  return { updatedList, events };
}

function processDeliveries(
  shoppingList: IShoppingList,
  currentDate: Date,
): { updatedList: IShoppingList; events: IDayEvent[] } {
  const inTransit = getInTransitRequests(shoppingList);
  const events: IDayEvent[] = [];
  let updatedList = shoppingList;

  for (const request of inTransit) {
    if (!request.deliveryDate) continue;

    const deliveryDate = new Date(request.deliveryDate);
    if (deliveryDate <= currentDate) {
      updatedList = updateRequest(updatedList, request.id, {
        status: 'delivered',
      });

      events.push(createAcquisitionEvent('delivery', request, request.deliveryDate));
    }
  }

  return { updatedList, events };
}

export const acquisitionProcessor: IDayProcessor & {
  process(campaign: ICampaign, date: Date, random?: RandomFn): IDayProcessorResult;
} = {
  id: processorId,
  phase: DayPhase.EVENTS,
  displayName: 'Acquisition',

  process(campaign: ICampaign, date: Date, random: RandomFn = Math.random): IDayProcessorResult {
    if (!campaign.options.useAcquisitionSystem) {
      return { events: [], campaign };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const shoppingList = (campaign as any).shoppingList;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!shoppingList || !shoppingList.items || shoppingList.items.length === 0) {
      return { events: [], campaign };
    }

    const allEvents: IDayEvent[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let updatedList = shoppingList;

    const pendingResult = processPendingAcquisitions(updatedList, date, random);
    updatedList = pendingResult.updatedList;
    allEvents.push(...pendingResult.events);

    const deliveryResult = processDeliveries(updatedList, date);
    updatedList = deliveryResult.updatedList;
    allEvents.push(...deliveryResult.events);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const updatedCampaign: ICampaign & { shoppingList: IShoppingList } = {
      ...campaign,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      shoppingList: updatedList,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    return { events: allEvents, campaign: updatedCampaign as ICampaign };
  },
};

export function registerAcquisitionProcessor(): void {
  getDayPipeline().register(acquisitionProcessor);
}
