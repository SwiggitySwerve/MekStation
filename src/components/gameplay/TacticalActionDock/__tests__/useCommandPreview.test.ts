/**
 * useCommandPreview / buildCommandPreview — pure projection tests.
 *
 * Verifies the spec's `Command Preview Lifecycle` requirement:
 *   - Movement preview reads from the existing path/MP projection.
 *   - Attack preview surfaces the targetUnitId + to-hit when a target
 *     is selected.
 *   - Cancel (passing null command) clears the preview.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

import { buildMovementCommands } from '../commands/movementCommands';
import { buildWeaponAttackCommands } from '../commands/weaponAttackCommands';
import { buildCommandPreview } from '../useCommandPreview';

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.Movement,
    canAct: true,
    ...overrides,
  };
}

describe('buildCommandPreview', () => {
  const walk = buildMovementCommands().find((c) => c.id === 'movement.walk')!;
  const fire = buildWeaponAttackCommands().find(
    (c) => c.id === 'weapon.fire-volley',
  )!;

  it('returns null when no command is selected (cancel state)', () => {
    expect(buildCommandPreview(null, makeCtx(), {})).toBeNull();
  });

  it('returns null when movement command has no path yet', () => {
    expect(buildCommandPreview(walk, makeCtx(), {})).toBeNull();
  });

  it('movement preview reads path / mpCost / unreachable / finalFacing from inputs', () => {
    const preview = buildCommandPreview(walk, makeCtx(), {
      highlightPath: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
      ],
      hoverMpCost: 3,
      hoverUnreachable: false,
      movementMode: 'walk',
      previewFacing: 2,
    });
    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'movement') {
      expect(preview.path).toHaveLength(3);
      expect(preview.mpCost).toBe(3);
      expect(preview.unreachable).toBe(false);
      expect(preview.finalFacing).toBe(2);
      expect(preview.mode).toBe('walk');
    } else {
      throw new Error('expected movement preview');
    }
  });

  it('movement preview flags unreachable correctly', () => {
    const preview = buildCommandPreview(walk, makeCtx(), {
      highlightPath: [{ q: 0, r: 0 }],
      hoverMpCost: 99,
      hoverUnreachable: true,
    });
    if (preview && preview.kind === 'movement') {
      expect(preview.unreachable).toBe(true);
    } else {
      throw new Error('expected movement preview');
    }
  });

  it('weapon preview returns null without a target', () => {
    expect(
      buildCommandPreview(
        fire,
        makeCtx({ phase: GamePhase.WeaponAttack, targetUnitId: null }),
        { hitChance: 8 },
      ),
    ).toBeNull();
  });

  it('weapon preview includes target + to-hit when target is selected', () => {
    const preview = buildCommandPreview(
      fire,
      makeCtx({ phase: GamePhase.WeaponAttack, targetUnitId: 'enemy-x' }),
      { hitChance: 8, weaponRangeBand: 'medium' },
    );
    expect(preview).not.toBeNull();
    if (preview && preview.kind === 'weapon-attack') {
      expect(preview.targetUnitId).toBe('enemy-x');
      expect(preview.toHit).toBe(8);
      expect(preview.rangeBand).toBe('medium');
      // Wave 7.2 stubs heat/ammo/damage zero; wave-7.3 wires the real
      // engine envelope. Keep these assertions tight so the contract
      // change is visible in the diff.
      expect(preview.heatCost).toBe(0);
      expect(preview.ammoUsage).toEqual({});
      expect(preview.expectedDamage).toBe(0);
    } else {
      throw new Error('expected weapon-attack preview');
    }
  });
});
