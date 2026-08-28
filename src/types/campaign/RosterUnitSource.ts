/**
 * Fail-closed persisted roster unit source.
 *
 * @spec openspec/changes/add-campaign-roster-source-readiness/specs/mission-contracts/spec.md
 */

export type RosterUnitSource = 'canonical' | 'custom';

export type ParsedRosterUnitSource =
  | { readonly kind: 'legacy'; readonly source: 'canonical' }
  | { readonly kind: 'valid'; readonly source: RosterUnitSource }
  | { readonly kind: 'invalid'; readonly raw: unknown };

export function parseRosterUnitSource(value: unknown): ParsedRosterUnitSource {
  if (value === undefined) {
    return { kind: 'legacy', source: 'canonical' };
  }
  if (value === 'canonical' || value === 'custom') {
    return { kind: 'valid', source: value };
  }
  return { kind: 'invalid', raw: value };
}
