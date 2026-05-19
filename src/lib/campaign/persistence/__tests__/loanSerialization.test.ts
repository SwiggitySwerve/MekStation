/**
 * Loan Serialization Round-Trip — unit test
 *
 * Verifies the loan ledger (CP2b — `add-campaign-command-ui`, design D4)
 * survives a `serializeCampaign` / `deserializeCampaignBody` round trip,
 * and that a pre-CP2b campaign with no `loans` field deserializes cleanly
 * (the migration plan: `loans` is a new optional field, absent on
 * existing campaigns).
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import { createCampaign } from '@/types/campaign/Campaign';
import { createCampaignLoan } from '@/types/campaign/CampaignLoan';

import {
  deserializeCampaignBody,
  serializeCampaign,
} from '../serializeCampaign';

describe('loan serialization round-trip', () => {
  it('preserves the loan ledger through a serialize/deserialize cycle', () => {
    const base = createCampaign('Loan RT', 'mercenary');
    const loan = createCampaignLoan({
      id: 'loan-1',
      principal: 1_000_000,
      interestRate: 0.1,
      termDays: 365,
      takenOnDate: '3025-01-01T00:00:00.000Z',
    });
    const withLoan: ICampaign = { ...base, loans: [loan] } as ICampaign;

    const restored = deserializeCampaignBody(
      serializeCampaign(withLoan),
    ) as ICampaignWithCommand;

    expect(restored.loans).toHaveLength(1);
    expect(restored.loans?.[0]).toEqual(loan);
  });

  it('deserializes a campaign with no loans field without error', () => {
    const base = createCampaign('No Loans', 'mercenary');
    const restored = deserializeCampaignBody(
      serializeCampaign(base),
    ) as ICampaignWithCommand;
    // A pre-CP2b campaign carries no `loans` field — undefined, not [].
    expect(restored.loans).toBeUndefined();
  });
});
