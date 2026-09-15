/**
 * Journal-private source envelope (design-campaign-authority-and-sync
 * decision D12, task 6.1 / P0b).
 *
 * The full accepted `IContract` and the remaining `ICampaignContractMarket`
 * are SOURCE-ONLY facts: their audience is the source instance's own server
 * process and its persisted `SerializedCampaign` record. They therefore ride
 * a journal-private field that is a SIBLING of `campaignEvent` on the stored
 * envelope, never a field inside it, because every wire read path narrows a
 * stored row to `campaignEvent` via `envelopeOf`. No grant scope -- not
 * `campaign`, `team:`, `player:`, nor the GM all-scopes grant -- can reach a
 * sibling of the field that narrowing returns.
 *
 * Two properties are load-bearing and are pinned by tests:
 *
 * 1. CONDITIONAL ABSENCE. The field is omitted entirely when there is no
 *    admitted private payload -- never `{}` and never an enumerable
 *    `undefined`. `canonicalizeJsonV1` rejects `undefined` and hashes exactly
 *    the enumerable own keys, so either shape would change the digest of
 *    history that has not changed.
 * 2. THE PRIVATE BYTES STAY INSIDE THE DIGEST MATERIAL. The journal's event
 *    digest covers `payload`, so the private payload keeps the hash-chain
 *    tamper-evidence D1/D3 rest on. The accepted residual is that the
 *    delivered `projectedEventIdentity` is then a one-way commitment over
 *    bytes a restricted guest may not see; only that commitment crosses the
 *    boundary, never the values.
 *
 * Money is a class, so a raw `IContract` cannot be canonicalized. The private
 * payload is stored in the same JSON-safe form `serializeCampaign` already
 * persists (Money collapses to a C-bill number via `Money.toJSON`) and is read
 * back through the existing `rehydrateCampaignMission` path.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D12)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 */

import { sha256 } from 'js-sha256';

import type { ICampaignContractMarket } from '@/types/campaign/CampaignCommandExtensions';
import type { IContract } from '@/types/campaign/Mission';

import {
  rehydrateCampaignMission,
  rehydrateContractMarket,
} from '@/lib/campaign/persistence/missionSerialization';

/** Bumped only when the private payload shape changes incompatibly. */
export const CAMPAIGN_SOURCE_PRIVATE_SCHEMA_VERSION = 1 as const;

/**
 * The source baseline captured alongside the private facts: the exact
 * persisted `SerializedCampaign` body, its row version, a digest over those
 * body bytes, and the root public journal revision the capture rode. Replay
 * starts HERE, never from the compact genesis snapshot, which carries empty
 * contracts and no market.
 */
export interface ICampaignSourceBaseline {
  /** The exact persisted source record body, as stored. */
  readonly sourceRecordBody: string;
  /** The source row `version` the body was read at. */
  readonly sourceRowVersion: number;
  /** sha256 over the UTF-8 bytes of `sourceRecordBody`. */
  readonly sourceBodyDigest: string;
  /** Root public journal revision at capture. */
  readonly rootPublicRevision: number;
}

/** The journal-private payload; a sibling of `campaignEvent`, never inside it. */
export interface ICampaignSourcePrivateEnvelope {
  readonly schemaVersion: number;
  readonly baseline: ICampaignSourceBaseline;
  /** JSON-safe form; read it back with `campaignSourcePrivateOf`. */
  readonly acceptedContract: IContract;
  /** JSON-safe form; read it back with `campaignSourcePrivateOf`. */
  readonly remainingMarket: ICampaignContractMarket;
}

/** The rehydrated private facts, as the source consumes them. */
export interface ICampaignSourcePrivateFacts {
  readonly baseline: ICampaignSourceBaseline;
  readonly acceptedContract: IContract;
  readonly remainingMarket: ICampaignContractMarket;
}

export type CampaignSourcePrivateReplayReason =
  | 'unsupported-schema'
  | 'source-identity-mismatch';

/**
 * Replay refusal. Typed rather than a silent compact fallback: a private
 * payload the source cannot trust must block or rebuild, never quietly
 * degrade to the wire projection, which does not carry these facts at all.
 */
export class CampaignSourcePrivateReplayError extends Error {
  public constructor(
    public readonly reason: CampaignSourcePrivateReplayReason,
    message: string,
  ) {
    super(message);
    this.name = 'CampaignSourcePrivateReplayError';
  }
}

/** Minimal structural view of a stored row; avoids an import cycle with the store. */
export interface ICampaignSourcePrivateCarrier {
  readonly payload: {
    readonly sourcePrivate?: ICampaignSourcePrivateEnvelope;
  };
}

/** sha256 over the UTF-8 bytes of the persisted source body. */
export function computeCampaignSourceBodyDigest(body: string): string {
  return sha256(new TextEncoder().encode(body));
}

/**
 * JSON round-trip to the canonicalizable form. `Money.toJSON` collapses to a
 * C-bill number and `undefined` optionals drop out, which is exactly what the
 * journal canonicalizer requires (it rejects `undefined` and class instances).
 */
function toJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Builds the private payload. The caller supplies the baseline body it
 * actually persisted; the digest is derived here so a caller cannot record a
 * baseline whose digest does not match its own bytes.
 */
export function buildCampaignSourcePrivateEnvelope(input: {
  readonly baseline: Omit<ICampaignSourceBaseline, 'sourceBodyDigest'>;
  readonly acceptedContract: IContract;
  readonly remainingMarket: ICampaignContractMarket;
}): ICampaignSourcePrivateEnvelope {
  return {
    schemaVersion: CAMPAIGN_SOURCE_PRIVATE_SCHEMA_VERSION,
    baseline: {
      sourceRecordBody: input.baseline.sourceRecordBody,
      sourceRowVersion: input.baseline.sourceRowVersion,
      sourceBodyDigest: computeCampaignSourceBodyDigest(
        input.baseline.sourceRecordBody,
      ),
      rootPublicRevision: input.baseline.rootPublicRevision,
    },
    acceptedContract: toJsonSafe(input.acceptedContract),
    remainingMarket: toJsonSafe(input.remainingMarket),
  };
}

/**
 * Reads the private facts off one stored row, or `null` when the row carries
 * none (every legacy row, and every event type D12 does not cover).
 */
export function campaignSourcePrivateOf(
  stored: ICampaignSourcePrivateCarrier,
): ICampaignSourcePrivateFacts | null {
  const stamped = stored.payload.sourcePrivate;
  if (stamped === undefined) return null;
  if (stamped.schemaVersion !== CAMPAIGN_SOURCE_PRIVATE_SCHEMA_VERSION) {
    throw new CampaignSourcePrivateReplayError(
      'unsupported-schema',
      `Unsupported source-private schema version ${stamped.schemaVersion}`,
    );
  }
  // Self-consistency of the captured baseline: bytes and digest must agree
  // before anything folded from them is treated as source truth.
  const actual = computeCampaignSourceBodyDigest(
    stamped.baseline.sourceRecordBody,
  );
  if (actual !== stamped.baseline.sourceBodyDigest) {
    throw new CampaignSourcePrivateReplayError(
      'source-identity-mismatch',
      'Source body digest does not match the captured source record body',
    );
  }
  return {
    baseline: stamped.baseline,
    acceptedContract: rehydrateCampaignMission(
      stamped.acceptedContract,
    ) as IContract,
    remainingMarket:
      rehydrateContractMarket(stamped.remainingMarket) ??
      stamped.remainingMarket,
  };
}
