/**
 * Campaign field-map constants
 *
 * The single source of truth for which `ICampaign` fields are `Map`s and
 * which are `Date`s. Per design D3 the serializer and deserializer share
 * these constants so the two directions cannot drift; per the D3 risk
 * mitigation a type-level test asserts every `Map`/`Date` field of
 * `ICampaign` appears here, failing the build on drift.
 *
 * When `ICampaign` gains a new `Map` or `Date` field, add it here AND to
 * `SerializedCampaignBody` — the type-level test (campaignFieldMap.test)
 * enforces the pairing.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D3)
 */

import type { ICampaign } from '@/types/campaign/Campaign';

/**
 * Every `ICampaign` field whose value is a `Map`. The serializer flattens
 * each to an array of `[key, value]` pairs; the deserializer rebuilds the
 * `Map`.
 */
export const CAMPAIGN_MAP_FIELDS = ['forces', 'missions'] as const;

/**
 * Every `ICampaign` field whose value is a `Date`. The serializer flattens
 * each to an ISO 8601 string; the deserializer rebuilds the `Date`.
 * `campaignStartDate` is optional on `ICampaign` and handled as such.
 */
export const CAMPAIGN_DATE_FIELDS = [
  'currentDate',
  'campaignStartDate',
] as const;

export type CampaignMapField = (typeof CAMPAIGN_MAP_FIELDS)[number];
export type CampaignDateField = (typeof CAMPAIGN_DATE_FIELDS)[number];

/**
 * Type-level guard used by the field-map drift test. `KeysOfType<T, V>`
 * resolves to the union of `T`'s keys whose value type extends `V`. The
 * test asserts this union is exactly the union of the field-map constant
 * — if `ICampaign` grows an un-listed `Map`/`Date` field, the assignment
 * fails to compile and the build breaks.
 */
export type KeysOfType<T, V> = {
  [K in keyof T]-?: NonNullable<T[K]> extends V ? K : never;
}[keyof T];

/** Union of every `ICampaign` key whose (non-nullable) value is a `Map`. */
export type CampaignMapKeys = KeysOfType<ICampaign, Map<unknown, unknown>>;

/** Union of every `ICampaign` key whose (non-nullable) value is a `Date`. */
export type CampaignDateKeys = KeysOfType<ICampaign, Date>;
