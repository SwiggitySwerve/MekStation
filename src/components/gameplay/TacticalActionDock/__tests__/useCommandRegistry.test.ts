/**
 * useCommandRegistry — phase-filter + mode-filter + category-grouping
 * tests.
 *
 * The registry is the single source of truth for the dock + both
 * context menus. This test pins:
 *   - Movement-phase context surfaces movement + facing + utility +
 *     end-phase commands; weapon and physical commands are absent.
 *   - WeaponAttack-phase context surfaces weapon + utility + torso-twist
 *     + end-phase; movement / facing-rotate / physical absent.
 *   - GM family is filtered out unless shellMode === 'gm'.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { GM_TACTICAL_COMMAND_IDS } from '@/lib/interventions';
import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

import {
  buildCommandRegistry,
  filterCommandsForEnemyToken,
  filterCommandsForFriendlyToken,
  filterCommandsForHex,
  groupCommandsByCategory,
} from '../useCommandRegistry';

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

describe('buildCommandRegistry', () => {
  it('Initiative phase surfaces the begin-round phase command', () => {
    const commands = buildCommandRegistry(
      makeCtx({ phase: GamePhase.Initiative }),
      'combat',
    );
    const ids = commands.map((c) => c.id);
    expect(ids).toContain('heat-end.begin-round');
    expect(ids).not.toContain('heat-end.end-phase');
  });

  it('Movement phase surfaces movement / facing-rotate / utility / end-phase commands', () => {
    const commands = buildCommandRegistry(makeCtx(), 'combat');
    const ids = commands.map((c) => c.id);
    // tactical-movement-intent-composer: Walk / Run / Sprint / Jump verbs are
    // removed (composer owns mode selection); Evade remains as a Posture Action.
    expect(ids).toContain('movement.evade');
    expect(ids).toContain('movement.stand');
    expect(ids).not.toContain('movement.walk');
    expect(ids).not.toContain('movement.jump');
    expect(ids).toContain('facing.rotate-left');
    expect(ids).toContain('utility.concede');
    expect(ids).toContain('heat-end.end-phase');
    // Phase-mismatch commands absent.
    expect(ids).not.toContain('weapon.fire-volley');
    expect(ids).not.toContain('physical.punch');
    expect(ids).not.toContain('heat-end.next-turn');
  });

  it('WeaponAttack phase surfaces weapon + torso-twist + end-phase', () => {
    const commands = buildCommandRegistry(
      makeCtx({ phase: GamePhase.WeaponAttack }),
      'combat',
    );
    const ids = commands.map((c) => c.id);
    expect(ids).toContain('weapon.declare-attack');
    expect(ids).toContain('weapon.fire-volley');
    expect(ids).toContain('facing.torso-twist');
    expect(ids).toContain('heat-end.end-phase');
    expect(ids).not.toContain('movement.walk');
    expect(ids).not.toContain('facing.rotate-left');
    expect(ids).not.toContain('physical.punch');
  });

  it('PhysicalAttack phase surfaces physical attacks + end-phase', () => {
    const commands = buildCommandRegistry(
      makeCtx({ phase: GamePhase.PhysicalAttack }),
      'combat',
    );
    const ids = commands.map((c) => c.id);
    expect(ids).toContain('physical.punch');
    expect(ids).toContain('physical.dfa');
    expect(ids).toContain('heat-end.end-phase');
    expect(ids).not.toContain('weapon.fire-volley');
    expect(ids).not.toContain('movement.walk');
  });

  it('End phase surfaces next-turn + utility', () => {
    const commands = buildCommandRegistry(
      makeCtx({ phase: GamePhase.End }),
      'combat',
    );
    const ids = commands.map((c) => c.id);
    expect(ids).toContain('heat-end.next-turn');
    expect(ids).toContain('utility.concede');
    expect(ids).not.toContain('heat-end.end-phase');
  });

  it('GM family is excluded when shellMode !== "gm"', () => {
    for (const mode of ['combat', 'replay', 'spectator'] as const) {
      const commands = buildCommandRegistry(makeCtx(), mode);
      const ids = commands.map((c) => c.id);
      expect(ids.some((id) => id.startsWith('gm.'))).toBe(false);
    }
  });

  it('GM family is included when shellMode === "gm"', () => {
    const commands = buildCommandRegistry(makeCtx(), 'gm');
    const ids = commands.map((c) => c.id);
    for (const commandId of GM_TACTICAL_COMMAND_IDS) {
      expect(ids).toContain(commandId);
    }
  });
});

describe('groupCommandsByCategory', () => {
  it('groups Movement-phase commands by category in stable order', () => {
    const commands = buildCommandRegistry(makeCtx(), 'combat');
    const groups = groupCommandsByCategory(commands);
    const categories = groups.map((g) => g.category);
    // Stable order: movement -> facing -> weapon -> physical -> heat-end -> utility -> gm
    // Movement phase: movement, facing, heat-end, utility (no weapon/physical/gm).
    expect(categories).toEqual(['movement', 'facing', 'heat-end', 'utility']);
  });
});

describe('command filters for context menus', () => {
  it('friendly token filter excludes targetsEnemy commands', () => {
    const commands = buildCommandRegistry(
      makeCtx({ phase: GamePhase.WeaponAttack }),
      'combat',
    );
    const friendlyVisible = filterCommandsForFriendlyToken(commands);
    expect(
      friendlyVisible.find((c) => c.id === 'weapon.fire-volley'),
    ).toBeUndefined();
    expect(
      friendlyVisible.find((c) => c.id === 'utility.concede'),
    ).toBeDefined();
  });

  it('enemy token filter includes only targetsEnemy commands', () => {
    const commands = buildCommandRegistry(
      makeCtx({ phase: GamePhase.WeaponAttack }),
      'combat',
    );
    const enemyVisible = filterCommandsForEnemyToken(commands);
    expect(enemyVisible.every((c) => c.targetsEnemy === true)).toBe(true);
    expect(
      enemyVisible.find((c) => c.id === 'weapon.fire-volley'),
    ).toBeDefined();
  });

  it('hex filter includes only targetsHex commands', () => {
    const commands = buildCommandRegistry(makeCtx(), 'combat');
    const hexVisible = filterCommandsForHex(commands);
    expect(hexVisible.every((c) => c.targetsHex === true)).toBe(true);
    // tactical-movement-intent-composer: the movement-verb commands were the
    // only `targetsHex` commands and are removed (the composer's waypoint
    // interaction is the sole hex-driven movement surface), so no movement
    // command surfaces through the hex filter anymore.
    expect(hexVisible.find((c) => c.id === 'movement.walk')).toBeUndefined();
    expect(hexVisible.some((c) => c.category === 'movement')).toBe(false);
  });

  it('dock command set === context menu command set for same context (parity)', () => {
    // Spec: "Context Menus Mirror Command Registry" — both surfaces
    // pull from the same registry. The union of friendly + enemy +
    // hex filters is a subset of the dock's registry; the registry
    // is the ground truth.
    const ctx = makeCtx({
      phase: GamePhase.WeaponAttack,
      targetUnitId: 'enemy-x',
    });
    const dockCommands = buildCommandRegistry(ctx, 'combat');
    const friendly = filterCommandsForFriendlyToken(dockCommands);
    const enemy = filterCommandsForEnemyToken(dockCommands);
    for (const cmd of [...friendly, ...enemy]) {
      expect(dockCommands).toContain(cmd);
    }
  });
});
