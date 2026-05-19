/**
 * Field-map drift test (task 1.4)
 *
 * Type-level assertion that every `Map`/`Date` field of `ICampaign`
 * appears in the shared field-map constant. If `ICampaign` grows an
 * un-listed `Map` or `Date` field the `Expect`/`Equal` assignment fails
 * to compile and the build breaks — satisfying the spec scenario
 * "Field-map drift fails the build".
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 */

import {
  CAMPAIGN_DATE_FIELDS,
  CAMPAIGN_MAP_FIELDS,
  type CampaignDateField,
  type CampaignDateKeys,
  type CampaignMapField,
  type CampaignMapKeys,
} from '../campaignFieldMap';

// -----------------------------------------------------------------------------
// Type-level equality machinery
// -----------------------------------------------------------------------------

/** Resolves to `true` only when `A` and `B` are mutually assignable. */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

/** Compile-time assertion: the argument type must be exactly `true`. */
type Expect<T extends true> = T;

// -----------------------------------------------------------------------------
// The drift assertions — these fail to COMPILE on drift
// -----------------------------------------------------------------------------

// Every Map field of ICampaign must appear in CAMPAIGN_MAP_FIELDS, and the
// constant must not name a field that is not a Map.
type _MapFieldsMatch = Expect<Equal<CampaignMapField, CampaignMapKeys>>;

// Every Date field of ICampaign must appear in CAMPAIGN_DATE_FIELDS, and
// the constant must not name a field that is not a Date.
type _DateFieldsMatch = Expect<Equal<CampaignDateField, CampaignDateKeys>>;

// Reference the type aliases so the unused-type lint does not strip them;
// the real enforcement is the compile-time assignability above.
type _Used = [_MapFieldsMatch, _DateFieldsMatch];

describe('campaign field-map constants', () => {
  it('enumerates the campaign Map fields', () => {
    expect([...CAMPAIGN_MAP_FIELDS].sort()).toEqual(
      ['forces', 'missions'].sort(),
    );
  });

  it('enumerates the campaign Date fields', () => {
    expect([...CAMPAIGN_DATE_FIELDS].sort()).toEqual(
      ['campaignStartDate', 'currentDate'].sort(),
    );
  });

  it('compiles the field-map drift assertions', () => {
    // If this file compiled, `_MapFieldsMatch` / `_DateFieldsMatch`
    // resolved to `true`. A runtime touch keeps the test non-empty.
    const proof: _Used = [true, true];
    expect(proof).toEqual([true, true]);
  });
});
