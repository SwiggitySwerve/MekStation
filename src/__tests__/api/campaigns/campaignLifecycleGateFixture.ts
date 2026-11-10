/**
 * Shared fixture for the S1b reader-gate route suites: a stored campaign row
 * that holds contracts at a chosen rules version, a route caller that sends
 * the reader header (or none), and the stored row's bytes for "unchanged".
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { stagedContract } from '@/lib/campaign/contracts/__tests__/contractCompletion.fixtures';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { LIFECYCLE_RULES_REQUEST_HEADER } from '@/types/campaign/ContractLifecycleRules';

import { disjointCampaign, envelopeOf } from './campaignJournalEffectsFixture';

/** A contract as it sits in a stored body (JSON round-tripped). */
export function storedContract(
  id: string,
  lifecycleRulesVersion?: unknown,
): Record<string, unknown> {
  const contract = JSON.parse(JSON.stringify(stagedContract())) as Record<
    string,
    unknown
  >;
  contract.id = id;
  if (lifecycleRulesVersion === undefined) {
    delete contract.lifecycleRulesVersion;
    delete contract.lifecycle;
  } else {
    contract.lifecycleRulesVersion = lifecycleRulesVersion;
  }
  return contract;
}

/** A valid legacy envelope for `campaignId` with `contracts` spliced into its missions. */
export function envelopeHolding(
  campaignId: string,
  contracts: readonly Record<string, unknown>[],
  version = 1,
): SerializedCampaign {
  const base = envelopeOf(disjointCampaign(campaignId), version);
  return {
    ...base,
    body: {
      ...base.body,
      missions: [
        ...base.body.missions,
        ...contracts.map((c) => [String(c.id), c] as const),
      ],
    },
  } as unknown as SerializedCampaign;
}

/** Writes `record` as the stored row, exactly as given. */
export function seedRow(record: SerializedCampaign): void {
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT OR REPLACE INTO campaigns
         (id, version, schema_version, name, faction_id, campaign_date,
          balance, origin_device_id, saved_at, payload)
       VALUES (?, ?, 2, ?, 'mercenary', '3025-01-01T00:00:00.000Z',
               0, 'device-s1b', '2026-08-23T00:00:00.000Z', ?)`,
    )
    .run(
      record.campaignId,
      record.version,
      record.campaignId,
      JSON.stringify(record),
    );
}

/** The stored row's version and payload text, or null when absent. */
export function rowBytes(
  campaignId: string,
): { readonly version: number; readonly payload: string } | null {
  return (
    (getSQLiteService()
      .getDatabase()
      .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
      .get(campaignId) as { version: number; payload: string } | undefined) ??
    null
  );
}

/** Rewrites the stored payload's missions to hold `contracts`, keeping the version. */
export function injectContractsIntoStoredRow(
  campaignId: string,
  contracts: readonly Record<string, unknown>[],
): void {
  const row = rowBytes(campaignId);
  if (row === null) throw new Error(`no row ${campaignId}`);
  const record = JSON.parse(row.payload) as SerializedCampaign;
  const next = {
    ...record,
    body: {
      ...record.body,
      missions: [
        ...record.body.missions,
        ...contracts.map((c) => [String(c.id), c]),
      ],
    },
  };
  getSQLiteService()
    .getDatabase()
    .prepare('UPDATE campaigns SET payload = ? WHERE id = ?')
    .run(JSON.stringify(next), campaignId);
}

export interface IGateAnswer {
  readonly status: number;
  readonly json: Record<string, unknown>;
  readonly headers: Record<string, string | number | string[] | undefined>;
}

/** Calls `handler`, sending the reader header only when `reader` is given. */
export async function callGated(
  handler: (req: NextApiRequest, res: NextApiResponse) => unknown,
  method: RequestMethod,
  id: string,
  options: {
    readonly body?: Body;
    readonly reader?: string | string[];
    readonly wire?: string;
  } = {},
): Promise<IGateAnswer> {
  const headers: Record<string, string | string[]> = {};
  if (options.reader !== undefined) {
    headers[LIFECYCLE_RULES_REQUEST_HEADER.toLowerCase()] = options.reader;
  }
  if (options.wire) headers.authorization = `Bearer ${options.wire}`;
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    query: { id },
    body: options.body,
    headers,
  });
  await handler(req, res);
  return {
    status: res._getStatusCode(),
    json: (res._getData() === '' ? {} : res._getJSONData()) as Record<
      string,
      unknown
    >,
    headers: res.getHeaders(),
  };
}
