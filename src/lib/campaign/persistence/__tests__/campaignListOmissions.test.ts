/**
 * List-omission header codec tests.
 *
 * The header is the non-breaking channel for skipped rows. These tests
 * pin that encode never writes extra fields and decode drops anything
 * that is not `{ id, reason }`, including a smuggled payload.
 */

import {
  CAMPAIGN_LIST_OMISSIONS_HEADER,
  decodeCampaignListOmissions,
  encodeCampaignListOmissions,
  readCampaignListOmissionsFromResponse,
} from '@/lib/campaign/persistence';

describe('campaign list omissions codec', () => {
  it('encodes only id and reason', () => {
    const encoded = encodeCampaignListOmissions([
      { id: 'camp-a', reason: 'corrupt' },
      { id: 'camp-b', reason: 'invalid_authority' },
    ]);
    expect(JSON.parse(encoded)).toEqual([
      { id: 'camp-a', reason: 'corrupt' },
      { id: 'camp-b', reason: 'invalid_authority' },
    ]);
    expect(encoded).not.toContain('payload');
  });

  it('drops extra fields and malformed entries on decode', () => {
    const hostile = JSON.stringify([
      {
        id: 'camp-rot',
        reason: 'corrupt',
        payload: 'LEAK-OMISSION-PAYLOAD',
      },
      { id: 'skip-me', reason: 'not-a-reason' },
      { reason: 'corrupt' },
      'not-an-object',
      { id: 'camp-typo', reason: 'invalid_authority' },
    ]);
    expect(decodeCampaignListOmissions(hostile)).toEqual([
      { id: 'camp-rot', reason: 'corrupt' },
      { id: 'camp-typo', reason: 'invalid_authority' },
    ]);
    expect(JSON.stringify(decodeCampaignListOmissions(hostile))).not.toContain(
      'LEAK-OMISSION-PAYLOAD',
    );
  });

  it('treats missing or invalid header values as no omissions', () => {
    expect(decodeCampaignListOmissions(undefined)).toEqual([]);
    expect(decodeCampaignListOmissions('')).toEqual([]);
    expect(decodeCampaignListOmissions('not-json')).toEqual([]);
    expect(decodeCampaignListOmissions('{ "id": "x" }')).toEqual([]);
    expect(readCampaignListOmissionsFromResponse({})).toEqual([]);
  });

  it('reads the canonical header name from a fetch-like response', () => {
    const encoded = encodeCampaignListOmissions([
      { id: 'camp-x', reason: 'corrupt' },
    ]);
    const omitted = readCampaignListOmissionsFromResponse({
      headers: {
        get: (name: string) =>
          name === CAMPAIGN_LIST_OMISSIONS_HEADER ? encoded : null,
      },
    });
    expect(omitted).toEqual([{ id: 'camp-x', reason: 'corrupt' }]);
  });
});
