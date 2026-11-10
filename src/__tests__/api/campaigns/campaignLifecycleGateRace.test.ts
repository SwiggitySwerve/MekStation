/**
 * S1b: the item route's 409 `current` is the one place it returns a stored
 * body, so the gate is checked again there (matrix row B, race). A row that
 * turned v2 between the gate's read and the write must not reach a too-old
 * reader through the conflict answer.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import idHandler from '@/pages/api/campaigns/[id]';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';

import { useTempCampaignDatabase } from './campaignJournalEffectsFixture';
import {
  callGated,
  envelopeHolding,
  rowBytes,
  seedRow,
  storedContract,
} from './campaignLifecycleGateFixture';

jest.mock('@/services/campaignPersistence/CampaignPersistenceService', () => {
  const actual = jest.requireActual(
    '@/services/campaignPersistence/CampaignPersistenceService',
  );
  return { ...actual, saveCampaign: jest.fn(actual.saveCampaign) };
});

describe('S1b reader gate: the conflict path is checked again', () => {
  useTempCampaignDatabase('s1b-gate-race-');

  it('refuses 426 when the row turned v2 between the gate and the write', async () => {
    const id = 's1b-race';
    seedRow(envelopeHolding(id, [], 3));
    const record = JSON.parse(
      rowBytes(id)?.payload ?? '{}',
    ) as SerializedCampaign;
    // The gate read a legacy row; by the time the write ran, it held v2.
    (saveCampaign as jest.Mock).mockReturnValueOnce({
      kind: 'conflict',
      current: envelopeHolding(id, [storedContract('v2', 2)], 4),
    });
    const answer = await callGated(idHandler, 'PUT', id, {
      body: {
        envelope: envelopeHolding(id, [], 4),
        baseVersion: record.version,
      },
    });
    expect(answer.status).toBe(426);
    expect(answer.json).not.toHaveProperty('current');
    expect(JSON.stringify(answer.json)).not.toContain('lifecycleRulesVersion');
  });

  it('control: a covering reader gets the conflict answer as before', async () => {
    const id = 's1b-race2';
    seedRow(envelopeHolding(id, [], 3));
    const record = JSON.parse(
      rowBytes(id)?.payload ?? '{}',
    ) as SerializedCampaign;
    (saveCampaign as jest.Mock).mockReturnValueOnce({
      kind: 'conflict',
      current: envelopeHolding(id, [storedContract('v2', 2)], 4),
    });
    const answer = await callGated(idHandler, 'PUT', id, {
      reader: '2',
      body: {
        envelope: envelopeHolding(id, [], 4),
        baseVersion: record.version,
      },
    });
    expect(answer.status).toBe(409);
    expect(answer.json).toHaveProperty('current');
  });
});
