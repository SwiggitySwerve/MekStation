/**
 * Tests for Base Event Interfaces
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

// Jest globals are available
import {
  EventCategory,
  IBaseEvent,
  isBaseEvent,
  isEventCategory,
  isCausedBy,
  isEventContext,
} from '../BaseEventInterfaces';

describe('EventCategory', () => {
  it('should have all expected categories', () => {
    expect(EventCategory.Game).toBe('game');
    expect(EventCategory.Campaign).toBe('campaign');
    expect(EventCategory.Pilot).toBe('pilot');
    expect(EventCategory.Repair).toBe('repair');
    expect(EventCategory.Award).toBe('award');
    expect(EventCategory.Meta).toBe('meta');
  });
});

describe('isEventCategory', () => {
  it('should return true for valid categories', () => {
    expect(isEventCategory('game')).toBe(true);
    expect(isEventCategory('campaign')).toBe(true);
    expect(isEventCategory('pilot')).toBe(true);
    expect(isEventCategory('repair')).toBe(true);
    expect(isEventCategory('award')).toBe(true);
    expect(isEventCategory('meta')).toBe(true);
  });

  it('should return false for invalid categories', () => {
    expect(isEventCategory('invalid')).toBe(false);
    expect(isEventCategory('')).toBe(false);
    expect(isEventCategory('GAME')).toBe(false);
  });
});

describe('isBaseEvent', () => {
  const validEvent: IBaseEvent = {
    id: 'test-id',
    sequence: 1,
    timestamp: '2026-01-20T00:00:00.000Z',
    category: EventCategory.Game,
    type: 'test_event',
    payload: { data: 'test' },
    context: { gameId: 'game-1' },
  };

  it('should return true for valid events', () => {
    expect(isBaseEvent(validEvent)).toBe(true);
  });

  it('should return true for events with causedBy', () => {
    const eventWithCause: IBaseEvent = {
      ...validEvent,
      causedBy: { eventId: 'cause-1', relationship: 'triggered' },
    };
    expect(isBaseEvent(eventWithCause)).toBe(true);
  });

  it('should return false for null/undefined', () => {
    expect(isBaseEvent(null)).toBe(false);
    expect(isBaseEvent(undefined)).toBe(false);
  });

  it('should return false for missing required fields', () => {
    expect(isBaseEvent({ ...validEvent, id: undefined })).toBe(false);
    expect(isBaseEvent({ ...validEvent, sequence: undefined })).toBe(false);
    expect(isBaseEvent({ ...validEvent, timestamp: undefined })).toBe(false);
    expect(isBaseEvent({ ...validEvent, category: undefined })).toBe(false);
    expect(isBaseEvent({ ...validEvent, type: undefined })).toBe(false);
    expect(isBaseEvent({ ...validEvent, context: undefined })).toBe(false);
  });

  it('should return false for wrong field types', () => {
    expect(isBaseEvent({ ...validEvent, id: 123 })).toBe(false);
    expect(isBaseEvent({ ...validEvent, sequence: '1' })).toBe(false);
    expect(isBaseEvent({ ...validEvent, context: 'invalid' })).toBe(false);
  });
});

describe('isCausedBy', () => {
  it('should return true for valid causedBy objects', () => {
    expect(isCausedBy({ eventId: 'e1', relationship: 'triggered' })).toBe(true);
    expect(isCausedBy({ eventId: 'e2', relationship: 'derived' })).toBe(true);
    expect(isCausedBy({ eventId: 'e3', relationship: 'undone' })).toBe(true);
    expect(isCausedBy({ eventId: 'e4', relationship: 'superseded' })).toBe(
      true,
    );
  });

  it('should return false for invalid objects', () => {
    expect(isCausedBy(null)).toBe(false);
    expect(isCausedBy(undefined)).toBe(false);
    expect(isCausedBy({})).toBe(false);
    expect(isCausedBy({ eventId: 'e1' })).toBe(false);
    expect(isCausedBy({ eventId: 'e1', relationship: 'invalid' })).toBe(false);
  });
});

describe('isEventContext', () => {
  it('should return true for empty context', () => {
    expect(isEventContext({})).toBe(true);
  });

  it('should return true for valid contexts', () => {
    expect(isEventContext({ gameId: 'g1' })).toBe(true);
    expect(isEventContext({ campaignId: 'c1', missionId: 'm1' })).toBe(true);
    expect(isEventContext({ pilotId: 'p1', unitId: 'u1' })).toBe(true);
    expect(
      isEventContext({
        campaignId: 'c1',
        missionId: 'm1',
        gameId: 'g1',
        pilotId: 'p1',
        unitId: 'u1',
        forceId: 'f1',
      }),
    ).toBe(true);
  });

  it('should return false for invalid contexts', () => {
    expect(isEventContext(null)).toBe(false);
    expect(isEventContext(undefined)).toBe(false);
    expect(isEventContext({ gameId: 123 })).toBe(false);
    expect(isEventContext({ campaignId: null })).toBe(false);
  });
});
