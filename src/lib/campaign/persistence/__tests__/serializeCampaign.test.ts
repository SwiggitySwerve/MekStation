/**
 * Campaign serialization round-trip tests (tasks 1.5)
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 *   - Requirement: Campaign Serialization Round-Trip
 *   - Requirement: Serialized Campaign Envelope (Body is JSON-safe)
 */

import { Money } from '@/types/campaign/Money';

import {
  deserializeCampaignBody,
  serializeCampaign,
} from '../serializeCampaign';
import { buildPopulatedCampaign } from './campaignFixture';

describe('serializeCampaign / deserializeCampaignBody', () => {
  it('round-trips a fully-populated campaign to a deep-equal result', () => {
    const original = buildPopulatedCampaign();
    const restored = deserializeCampaignBody(serializeCampaign(original));
    expect(restored).toEqual(original);
  });

  it('restores Map fields as Map instances', () => {
    const original = buildPopulatedCampaign();
    const restored = deserializeCampaignBody(serializeCampaign(original));
    expect(restored.forces).toBeInstanceOf(Map);
    expect(restored.missions).toBeInstanceOf(Map);
    expect(restored.forces.size).toBe(2);
    expect(restored.missions.size).toBe(2);
  });

  it('restores Date fields as Date instances', () => {
    const original = buildPopulatedCampaign();
    const restored = deserializeCampaignBody(serializeCampaign(original));
    expect(restored.currentDate).toBeInstanceOf(Date);
    expect(restored.campaignStartDate).toBeInstanceOf(Date);
    expect(restored.currentDate.getTime()).toBe(original.currentDate.getTime());
  });

  it('represents Map fields as arrays of [key, value] pairs', () => {
    const body = serializeCampaign(buildPopulatedCampaign());
    expect(Array.isArray(body.forces)).toBe(true);
    expect(Array.isArray(body.missions)).toBe(true);
    expect(body.forces[0]).toHaveLength(2);
    expect(typeof body.forces[0][0]).toBe('string');
  });

  it('represents Date fields as ISO 8601 strings', () => {
    const body = serializeCampaign(buildPopulatedCampaign());
    expect(typeof body.currentDate).toBe('string');
    expect(body.currentDate).toBe('3025-07-04T00:00:00.000Z');
    expect(body.campaignStartDate).toBe('3025-01-01T00:00:00.000Z');
  });

  it('produces a body that survives JSON.stringify / JSON.parse', () => {
    const body = serializeCampaign(buildPopulatedCampaign());
    const roundTripped = JSON.parse(JSON.stringify(body));
    expect(roundTripped).toEqual(body);
  });

  it('restores finances Money instances and transaction dates', () => {
    const original = buildPopulatedCampaign();
    const restored = deserializeCampaignBody(serializeCampaign(original));
    expect(restored.finances.balance).toBeInstanceOf(Money);
    expect(restored.finances.balance.amount).toBe(380000);
    expect(restored.finances.transactions[0].amount).toBeInstanceOf(Money);
    expect(restored.finances.transactions[0].date).toBeInstanceOf(Date);
    expect(restored.finances.transactions[0].amount.amount).toBe(500000);
  });

  it('handles a campaign without an optional campaignStartDate', () => {
    const original = buildPopulatedCampaign();
    const noStart = { ...original, campaignStartDate: undefined };
    const restored = deserializeCampaignBody(serializeCampaign(noStart));
    expect(restored.campaignStartDate).toBeUndefined();
  });

  it('is a pure function — does not mutate the input campaign', () => {
    const original = buildPopulatedCampaign();
    const beforeForces = original.forces.size;
    serializeCampaign(original);
    expect(original.forces.size).toBe(beforeForces);
    expect(original.currentDate).toBeInstanceOf(Date);
  });
});
