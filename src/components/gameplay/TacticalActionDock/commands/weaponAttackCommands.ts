/**
 * Weapon attack command family — declare attack, fire volley, clear targets.
 *
 * Weapon commands are target-aware — the enemy token context menu
 * preselects the right-clicked enemy as `targetUnitId`, then the dock
 * surfaces the same fire-volley command bound to that target. Both
 * surfaces dispatch through the SAME command (spec: "Context Menus
 * Mirror Command Registry").
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.2
 */

import { GamePhase, type ITacticalCommand } from "@/types/gameplay";

export function buildWeaponAttackCommands(): readonly ITacticalCommand[] {
  return [
    WeaponDeclareAttackCommand,
    WeaponFireVolleyCommand,
    WeaponClearAttacksCommand,
  ];
}

const WeaponDeclareAttackCommand: ITacticalCommand = {
  id: "weapon.declare-attack",
  category: "weapon",
  label: "Declare Attack",
  hotkey: "F",
  phaseConstraints: [GamePhase.WeaponAttack],
  requiresConfirmation: false,
  undoable: true,
  targetsEnemy: true,
  availability(ctx) {
    if (!ctx.activeUnitId)
      return { available: false, reason: "No unit is active." };
    if (!ctx.canAct) return { available: false, reason: "Not your turn." };
    if (!ctx.targetUnitId) {
      // Disabled-with-reason — the command stays visible so the player
      // learns the gating fact. Spec: `Disabled command explains
      // invalidity` scenario.
      return { available: false, reason: "Select an enemy target first." };
    }
    return { available: true };
  },
  commit() {
    return { actionId: "declare-attack", payload: {} };
  },
};

const WeaponFireVolleyCommand: ITacticalCommand = {
  id: "weapon.fire-volley",
  category: "weapon",
  label: "Fire Volley",
  hotkey: "Enter",
  phaseConstraints: [GamePhase.WeaponAttack],
  requiresConfirmation: true, // Irreversible commit; spec requires confirm.
  undoable: false,
  targetsEnemy: true,
  availability(ctx) {
    if (!ctx.activeUnitId)
      return { available: false, reason: "No unit is active." };
    if (!ctx.canAct) return { available: false, reason: "Not your turn." };
    if (!ctx.targetUnitId) {
      return { available: false, reason: "No target selected." };
    }
    // Per-weapon range/heat/ammo/arc gating happens in the engine.
    // Wave 7.3+ will inject the projected gate into context so this
    // predicate returns reason: "Target out of range" before commit.
    return { available: true };
  },
  commit() {
    return { actionId: "lock", payload: { volley: true } };
  },
};

const WeaponClearAttacksCommand: ITacticalCommand = {
  id: "weapon.clear-attacks",
  category: "weapon",
  label: "Clear Attacks",
  phaseConstraints: [GamePhase.WeaponAttack],
  requiresConfirmation: false,
  undoable: false,
  availability(ctx) {
    if (!ctx.activeUnitId)
      return { available: false, reason: "No unit is active." };
    if (!ctx.canAct) return { available: false, reason: "Not your turn." };
    return { available: true };
  },
  commit() {
    return { actionId: "clear", payload: {} };
  },
};
