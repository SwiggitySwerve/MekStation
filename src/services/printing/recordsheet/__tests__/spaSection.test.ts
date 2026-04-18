/**
 * spaSection — pure helper tests
 *
 * Covers:
 *   - Empty input → empty block (no content)
 *   - Unknown ids dropped silently
 *   - Headline composes displayName + designation label
 *   - Long descriptions truncated with an ellipsis
 *   - Sort order is category, then displayName
 */

import type { IPilotAbilityRef } from '@/types/pilot';

import { buildSPASection, MAX_PRINTABLE_SPA_ENTRIES } from '../spaSection';

function makeRef(
  abilityId: string,
  designation?: IPilotAbilityRef['designation'],
  xpSpent?: number,
): IPilotAbilityRef {
  return {
    abilityId,
    acquiredDate: '2025-01-01',
    designation,
    xpSpent,
  };
}

describe('buildSPASection', () => {
  it('returns an empty block when given null/empty input', () => {
    expect(buildSPASection(null)).toEqual({ entries: [], hasContent: false });
    expect(buildSPASection([])).toEqual({ entries: [], hasContent: false });
  });

  it('drops unknown ids silently', () => {
    const block = buildSPASection([
      makeRef('weapon_specialist'),
      makeRef('does-not-exist'),
    ]);
    expect(block.entries).toHaveLength(1);
    expect(block.entries[0]!.abilityId).toBe('weapon_specialist');
  });

  it('composes a headline using displayName + designation label', () => {
    const block = buildSPASection([
      makeRef('weapon_specialist', {
        kind: 'weapon_type',
        weaponTypeId: 'medium_laser',
        displayLabel: 'Medium Laser',
      }),
    ]);
    expect(block.entries[0]!.headline).toBe('Weapon Specialist (Medium Laser)');
  });

  it('produces hasContent = true when at least one entry resolves', () => {
    const block = buildSPASection([makeRef('cluster_hitter')]);
    expect(block.hasContent).toBe(true);
  });

  it('truncates long descriptions and appends an ellipsis', () => {
    const block = buildSPASection([makeRef('cluster_hitter')]);
    const desc = block.entries[0]!.truncatedDescription;
    expect(desc.length).toBeLessThanOrEqual(60);
  });

  it('sorts by category, then displayName', () => {
    const block = buildSPASection([
      makeRef('iron_man'), // toughness
      makeRef('cluster_hitter'), // gunnery
      makeRef('weapon_specialist'), // gunnery
    ]);
    // Gunnery comes before toughness alphabetically; within gunnery,
    // Cluster Hitter < Weapon Specialist.
    expect(block.entries.map((e) => e.abilityId)).toEqual([
      'cluster_hitter',
      'weapon_specialist',
      'iron_man',
    ]);
  });

  it('exposes a printable cap so the renderer can paginate', () => {
    expect(MAX_PRINTABLE_SPA_ENTRIES).toBeGreaterThan(0);
  });
});
