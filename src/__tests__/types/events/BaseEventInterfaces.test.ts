// src/__tests__/types/events/BaseEventInterfaces.test.ts
import { describe, it, expect } from '@jest/globals';
import {
  IBaseEvent,
  EventCategory,
  isBaseEvent,
  createEventContext,
} from '@/types/events';

describe('BaseEventInterfaces', () => {
  describe('isBaseEvent', () => {
    it('should validate a well-formed event', () => {
      const event: IBaseEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        sequence: 1,
        timestamp: '2026-01-20T12:00:00.000Z',
        category: EventCategory.Game,
        type: 'movement_declared',
        payload: { unitId: 'unit-1' },
        context: { gameId: 'game-1' },
      };
      expect(isBaseEvent(event)).toBe(true);
    });

    it('should reject event without required fields', () => {
      const invalid = { id: '123', type: 'test' };
      expect(isBaseEvent(invalid)).toBe(false);
    });

    it('should reject null', () => {
      expect(isBaseEvent(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isBaseEvent(undefined)).toBe(false);
    });

    it('should reject non-object types', () => {
      expect(isBaseEvent('string')).toBe(false);
      expect(isBaseEvent(123)).toBe(false);
      expect(isBaseEvent([])).toBe(false);
    });
  });

  describe('createEventContext', () => {
    it('should create context with all scope IDs', () => {
      const context = createEventContext({
        campaignId: 'camp-1',
        missionId: 'mission-1',
        gameId: 'game-1',
        pilotId: 'pilot-1',
      });
      expect(context.campaignId).toBe('camp-1');
      expect(context.missionId).toBe('mission-1');
      expect(context.gameId).toBe('game-1');
      expect(context.pilotId).toBe('pilot-1');
    });

    it('should allow partial context', () => {
      const context = createEventContext({ pilotId: 'pilot-1' });
      expect(context.pilotId).toBe('pilot-1');
      expect(context.campaignId).toBeUndefined();
      expect(context.missionId).toBeUndefined();
      expect(context.gameId).toBeUndefined();
    });

    it('should allow empty context', () => {
      const context = createEventContext({});
      expect(Object.keys(context)).toHaveLength(0);
    });
  });

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
});
