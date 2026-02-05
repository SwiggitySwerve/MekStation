/**
 * Tests for Event Factory Functions
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import { EventCategory, isBaseEvent } from '@/types/events';

// Jest globals are available
import {
  createEventId,
  getNextSequence,
  getCurrentSequence,
  resetSequence,
  setSequence,
  createEvent,
  createGameEvent,
  createCampaignEvent,
  createPilotEvent,
  createRepairEvent,
  createAwardEvent,
  createMetaEvent,
} from '../eventFactory';

describe('Event ID Generation', () => {
  it('should generate unique UUIDs', () => {
    const id1 = createEventId();
    const id2 = createEventId();
    const id3 = createEventId();

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it('should generate valid UUID format', () => {
    const id = createEventId();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidRegex);
  });
});

describe('Sequence Management', () => {
  beforeEach(() => {
    resetSequence();
  });

  it('should start at 0', () => {
    expect(getCurrentSequence()).toBe(0);
  });

  it('should increment on each call to getNextSequence', () => {
    expect(getNextSequence()).toBe(1);
    expect(getNextSequence()).toBe(2);
    expect(getNextSequence()).toBe(3);
    expect(getCurrentSequence()).toBe(3);
  });

  it('should reset to specified value', () => {
    getNextSequence();
    getNextSequence();
    resetSequence(100);
    expect(getCurrentSequence()).toBe(100);
    expect(getNextSequence()).toBe(101);
  });

  it('should set to specific value', () => {
    setSequence(500);
    expect(getCurrentSequence()).toBe(500);
    expect(getNextSequence()).toBe(501);
  });
});

describe('createEvent', () => {
  beforeEach(() => {
    resetSequence();
  });

  it('should create a valid base event', () => {
    const event = createEvent({
      category: EventCategory.Game,
      type: 'test_event',
      payload: { foo: 'bar' },
      context: { gameId: 'game-1' },
    });

    expect(isBaseEvent(event)).toBe(true);
    expect(event.category).toBe(EventCategory.Game);
    expect(event.type).toBe('test_event');
    expect(event.payload).toEqual({ foo: 'bar' });
    expect(event.context.gameId).toBe('game-1');
    expect(event.sequence).toBe(1);
    expect(event.id).toBeDefined();
    expect(event.timestamp).toBeDefined();
  });

  it('should include causedBy when provided', () => {
    const event = createEvent({
      category: EventCategory.Pilot,
      type: 'xp_gained',
      payload: { amount: 100 },
      context: { pilotId: 'pilot-1' },
      causedBy: { eventId: 'mission-1', relationship: 'triggered' },
    });

    expect(event.causedBy).toEqual({
      eventId: 'mission-1',
      relationship: 'triggered',
    });
  });

  it('should increment sequence for each event', () => {
    const event1 = createEvent({
      category: EventCategory.Meta,
      type: 'test',
      payload: {},
      context: {},
    });
    const event2 = createEvent({
      category: EventCategory.Meta,
      type: 'test',
      payload: {},
      context: {},
    });

    expect(event2.sequence).toBe(event1.sequence + 1);
  });
});

describe('Category-specific event factories', () => {
  beforeEach(() => {
    resetSequence();
  });

  describe('createGameEvent', () => {
    it('should create a game event', () => {
      const event = createGameEvent(
        'movement_declared',
        { unitId: 'u1' },
        'game-1',
      );

      expect(event.category).toBe(EventCategory.Game);
      expect(event.type).toBe('movement_declared');
      expect(event.context.gameId).toBe('game-1');
    });

    it('should include additional context', () => {
      const event = createGameEvent(
        'damage_applied',
        { amount: 10 },
        'game-1',
        { unitId: 'u1' },
      );

      expect(event.context.gameId).toBe('game-1');
      expect(event.context.unitId).toBe('u1');
    });
  });

  describe('createCampaignEvent', () => {
    it('should create a campaign event', () => {
      const event = createCampaignEvent(
        'mission_completed',
        { victory: true },
        'camp-1',
        'miss-1',
      );

      expect(event.category).toBe(EventCategory.Campaign);
      expect(event.context.campaignId).toBe('camp-1');
      expect(event.context.missionId).toBe('miss-1');
    });
  });

  describe('createPilotEvent', () => {
    it('should create a pilot event', () => {
      const event = createPilotEvent(
        'skill_improved',
        { skill: 'gunnery' },
        'pilot-1',
      );

      expect(event.category).toBe(EventCategory.Pilot);
      expect(event.context.pilotId).toBe('pilot-1');
    });
  });

  describe('createRepairEvent', () => {
    it('should create a repair event', () => {
      const event = createRepairEvent(
        'armor_repaired',
        { location: 'CT' },
        'unit-1',
      );

      expect(event.category).toBe(EventCategory.Repair);
      expect(event.context.unitId).toBe('unit-1');
    });
  });

  describe('createAwardEvent', () => {
    it('should create an award event', () => {
      const event = createAwardEvent(
        'medal_earned',
        { medal: 'bronze_star' },
        'pilot-1',
      );

      expect(event.category).toBe(EventCategory.Award);
      expect(event.context.pilotId).toBe('pilot-1');
    });
  });

  describe('createMetaEvent', () => {
    it('should create a meta event', () => {
      const event = createMetaEvent('system_initialized', { version: '1.0' });

      expect(event.category).toBe(EventCategory.Meta);
      expect(event.context).toEqual({});
    });
  });
});
