/**
 * Battle Armor Combat Module — Public Barrel
 *
 * Collects the BA combat primitives (state, damage, squad fire, anti-mech
 * leg/swarm attacks, vibro-claw, stealth/mimetic modifiers) behind one
 * import path. The damage-dispatch integration lives in `damageDispatch.ts`
 * one directory up and imports directly from these submodules.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/battle-armor-unit-system/spec.md
 */

export * from './state';
export * from './damage';
export * from './squadFire';
export * from './legAttack';
export * from './swarm';
export * from './vibroClaw';
export * from './stealth';
