/**
 * The field vocabulary a campaign conflict decision is made in
 * (umbrella task 8.4).
 *
 * `Campaign Conflict Resolution Is Command-Based` turns on whether a
 * stale command's "declared affected fields" collide with the facts that
 * committed in the meantime. That question is only as trustworthy as the
 * paths it is asked in, so the vocabulary is CLOSED and pinned: the
 * classification below `satisfies Record<keyof ICampaignAuthoritativeState,
 * ...>`, which makes a ninth ledger field a compile error here rather than
 * a field that silently never conflicts with anything.
 *
 * THE VOCABULARY IS THE LEDGER PROJECTION, not the serialized campaign
 * envelope, and that is forced rather than chosen. Disjointness needs the
 * base state the command was written against; the only thing that can
 * reconstruct a base is a journal replay, and a journal replay produces
 * `ICampaignAuthoritativeState`. A vocabulary over `SerializedCampaignBody`
 * would name fields no replay can ever populate.
 *
 * KEYED COLLECTIONS DIFF BY MEMBER. Two players changing different roster
 * units are genuinely disjoint, and a vocabulary that reported
 * `rosterUnits` for both would manufacture a conflict out of the shape of
 * the state rather than out of anything either of them did.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/coop-campaign-sync/spec.md
 */

import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';

/**
 * How one key of the authoritative state participates in a field diff.
 *
 * `identity` is the campaign id: not a field that can move, and a
 * difference in it means two unrelated states are being compared.
 */
export type CampaignStateFieldKind = 'identity' | 'scalar' | 'keyed';

/** Every key of the ledger projection, classified. Compile-pinned. */
export const CAMPAIGN_STATE_FIELD_KINDS = {
  campaignId: 'identity',
  day: 'scalar',
  balance: 'scalar',
  salvagePool: 'scalar',
  rosterUnits: 'keyed',
  forceUnits: 'keyed',
  pilots: 'keyed',
  contracts: 'keyed',
  factionStanding: 'keyed',
} as const satisfies Record<
  keyof ICampaignAuthoritativeState,
  CampaignStateFieldKind
>;

/** One keyed collection, read structurally so every `keyed` key shares a path. */
type KeyedCollection = Readonly<Record<string, unknown>>;

/**
 * Canonical bytes for one collection member.
 *
 * Through the journal's canonicalizer rather than `JSON.stringify`, so a
 * member that was re-serialized with its keys in another order is not
 * reported as a change. A phantom change is not harmless here: it would
 * turn a disjoint command into a same-field refusal.
 *
 * A missing member is the bare word `absent`, which no canonical form can
 * collide with: every canonicalization is valid JSON, so even the string
 * "absent" comes back quoted. An added and a removed member therefore
 * both read as changes without a sentinel that could be mistaken for one.
 */
function memberBytes(value: unknown): string {
  return value === undefined ? 'absent' : canonicalizeJsonV1(value);
}

/**
 * Field paths where two states of the SAME campaign differ, sorted.
 *
 * Sorted because two callers comparing sets must not be able to disagree
 * on order - the overlap check and the declared-set comparison are both
 * equality over these arrays.
 *
 * Throws on a campaign-id mismatch. Reporting `campaignId` as a differing
 * field would let a caller compare two unrelated campaigns and receive a
 * verdict, and every verdict downstream would be meaningless.
 */
export function diffCampaignFields(
  before: ICampaignAuthoritativeState,
  after: ICampaignAuthoritativeState,
): readonly string[] {
  if (before.campaignId !== after.campaignId) {
    throw new Error(
      `Cannot diff fields across different campaigns: ${before.campaignId} vs ${after.campaignId}`,
    );
  }
  const paths: string[] = [];
  for (const [key, kind] of Object.entries(CAMPAIGN_STATE_FIELD_KINDS)) {
    if (kind === 'identity') continue;
    const beforeValue = Reflect.get(before, key) as unknown;
    const afterValue = Reflect.get(after, key) as unknown;
    if (kind === 'scalar') {
      if (beforeValue !== afterValue) paths.push(key);
      continue;
    }
    const beforeMembers = (beforeValue ?? {}) as KeyedCollection;
    const afterMembers = (afterValue ?? {}) as KeyedCollection;
    const ids = Array.from(
      new Set([...Object.keys(beforeMembers), ...Object.keys(afterMembers)]),
    );
    for (const id of ids) {
      if (memberBytes(beforeMembers[id]) !== memberBytes(afterMembers[id])) {
        paths.push(`${key}[${id}]`);
      }
    }
  }
  return Object.freeze(paths.sort());
}

/**
 * The paths two field sets share, sorted and deduplicated.
 *
 * An empty result is the whole definition of "disjoint" used by the
 * conflict decision, so it lives here beside the diff that produces its
 * inputs rather than being re-expressed at the decision site.
 */
export function campaignFieldOverlap(
  left: readonly string[],
  right: readonly string[],
): readonly string[] {
  const rightSet = new Set(right);
  const shared = new Set(left.filter((path) => rightSet.has(path)));
  return Object.freeze(Array.from(shared).sort());
}
