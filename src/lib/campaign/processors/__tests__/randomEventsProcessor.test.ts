import { describe, it, expect } from '@jest/globals';
import { randomEventsProcessor } from '../randomEventsProcessor';
import { DayPhase } from '../../dayPipeline';
import { createCampaign } from '@/types/campaign/Campaign';

describe('randomEventsProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(randomEventsProcessor.id).toBe('random-events');
    expect(randomEventsProcessor.phase).toBe(DayPhase.EVENTS);
    expect(randomEventsProcessor.displayName).toBe('Random Events');
  });

  it('should return no events when useRandomEvents is false', () => {
    const campaign = createCampaign('Test', 'merc', { useRandomEvents: false });
    const result = randomEventsProcessor.process(campaign, new Date('3025-01-01'));
    expect(result.events).toHaveLength(0);
    expect(result.campaign).toBe(campaign);
  });

  it('should produce life events on celebration dates', () => {
    const campaign = createCampaign('Test', 'merc', { useRandomEvents: true, useLifeEvents: true });
    const result = randomEventsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));
    const lifeEvents = result.events.filter(e => e.type === 'random_event_life');
    expect(lifeEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should not produce life events when useLifeEvents is false', () => {
    const campaign = createCampaign('Test', 'merc', { useRandomEvents: true, useLifeEvents: false });
    const result = randomEventsProcessor.process(campaign, new Date('3025-01-01T00:00:00Z'));
    const lifeEvents = result.events.filter(e => e.type === 'random_event_life');
    expect(lifeEvents).toHaveLength(0);
  });

  it('should not produce prisoner events when usePrisonerEvents is false', () => {
    const campaign = createCampaign('Test', 'merc', { useRandomEvents: true, usePrisonerEvents: false });
    const result = randomEventsProcessor.process(campaign, new Date('3025-01-06T00:00:00Z'));
    const prisonerEvents = result.events.filter(e => e.type === 'random_event_prisoner');
    expect(prisonerEvents).toHaveLength(0);
  });

  it('should return campaign unchanged (no side effects)', () => {
    const campaign = createCampaign('Test', 'merc', { useRandomEvents: true });
    const result = randomEventsProcessor.process(campaign, new Date('3025-06-15T00:00:00Z'));
    expect(result.campaign).toBe(campaign);
  });

  it('should produce Gray Monday events on correct dates when enabled', () => {
    const campaign = createCampaign('Test', 'merc', { useRandomEvents: true, simulateGrayMonday: true });
    const result = randomEventsProcessor.process(campaign, new Date('3132-08-03T00:00:00Z'));
    const historicalEvents = result.events.filter(e => e.type === 'random_event_historical');
    expect(historicalEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should not produce Gray Monday events when simulateGrayMonday is false', () => {
    const campaign = createCampaign('Test', 'merc', { useRandomEvents: true, simulateGrayMonday: false });
    const result = randomEventsProcessor.process(campaign, new Date('3132-08-03T00:00:00Z'));
    const historicalEvents = result.events.filter(e => e.type === 'random_event_historical');
    expect(historicalEvents).toHaveLength(0);
  });

  it('should map event severity correctly', () => {
    const campaign = createCampaign('Test', 'merc', { useRandomEvents: true, simulateGrayMonday: true });
    const result = randomEventsProcessor.process(campaign, new Date('3132-08-09T00:00:00Z'));
    const critical = result.events.filter(e => e.severity === 'critical');
    expect(critical.length).toBeGreaterThanOrEqual(1);
  });
});
