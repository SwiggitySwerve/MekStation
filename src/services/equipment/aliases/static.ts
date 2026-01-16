/**
 * Static Alias Mappings
 *
 * Provides hardcoded alias mappings for known equipment variants.
 * These map alternative IDs directly to canonical equipment IDs.
 *
 * @module services/equipment/aliases/static
 */

/**
 * Add static alias mappings for common equipment variants
 * These map alternative IDs directly to canonical equipment IDs
 */
export function addStaticAliasMappings(nameToIdMap: Map<string, string>): void {
  // C3 system variants
  nameToIdMap.set('c3-master-with-tag', 'c3-master');
  nameToIdMap.set('c3-computer-master', 'c3-master');
  nameToIdMap.set('c3-master-boosted-with-tag', 'boosted-c3-master');
  nameToIdMap.set('c3-boosted-system-master', 'boosted-c3-master');
  nameToIdMap.set('improved-c3-computer', 'improved-c3');

  // Light autocannons (alternate naming)
  nameToIdMap.set('light-auto-cannon-2', 'lac-2');
  nameToIdMap.set('light-auto-cannon-5', 'lac-5');
  nameToIdMap.set('light-autocannon-2', 'lac-2');
  nameToIdMap.set('light-autocannon-5', 'lac-5');

  // VSP lasers (short form)
  nameToIdMap.set('medium-vsp', 'medium-vsp-laser');
  nameToIdMap.set('large-vsp', 'large-vsp-laser');
  nameToIdMap.set('small-vsp', 'small-vsp-laser');

  // Blazer cannon
  nameToIdMap.set('blazer-cannon', 'binary-laser-blazer-cannon');
  nameToIdMap.set('blazer', 'binary-laser-blazer-cannon');

  // Particle cannon (alternate name for PPC)
  nameToIdMap.set('particle-cannon', 'ppc');

  // Arrow IV
  nameToIdMap.set('arrow-iv', 'arrow-iv-launcher');
  nameToIdMap.set('arrow-iv-system', 'arrow-iv-launcher');

  // Long Tom
  nameToIdMap.set('long-tom-cannon', 'long-tom');

  // Mech Mortars
  nameToIdMap.set('mech-mortar-1', 'mech-mortar-1');
  nameToIdMap.set('mech-mortar-2', 'mech-mortar-2');
  nameToIdMap.set('mech-mortar-4', 'mech-mortar-4');
  nameToIdMap.set('mech-mortar-8', 'mech-mortar-8');

  // TSEMP
  nameToIdMap.set('tsemp-cannon', 'tsemp');
  nameToIdMap.set('tsemp', 'tsemp');

  // Pods
  nameToIdMap.set('m-pod', 'm-pod');
  nameToIdMap.set('b-pod', 'b-pod');
  nameToIdMap.set('anti-battlearmor-pods-b-pods', 'b-pod');

  // iATM
  nameToIdMap.set('iatm-3', 'iatm-3');
  nameToIdMap.set('iatm-6', 'iatm-6');
  nameToIdMap.set('iatm-9', 'iatm-9');
  nameToIdMap.set('iatm-12', 'iatm-12');

  // Fluid Gun
  nameToIdMap.set('fluid-gun', 'fluid-gun');

  // Taser
  nameToIdMap.set('battlemech-taser', 'mech-taser');
  nameToIdMap.set('mech-taser', 'mech-taser');

  // Coolant Pod
  nameToIdMap.set('coolant-pod', 'coolant-pod');

  // Rocket launchers with -pp suffix (prototype/primitive)
  nameToIdMap.set('rocket-launcher-10-pp', 'rl10');
  nameToIdMap.set('rocket-launcher-15-pp', 'rl15');
  nameToIdMap.set('rocket-launcher-20-pp', 'rl20');
  nameToIdMap.set('rocket-launcher-10', 'rl10');
  nameToIdMap.set('rocket-launcher-15', 'rl15');
  nameToIdMap.set('rocket-launcher-20', 'rl20');

  // Vehicular weapons
  nameToIdMap.set('vehicular-grenade-launcher', 'vehicular-grenade-launcher');

  // Cargo/Industrial (with quantity prefix)
  nameToIdMap.set('cargo-1-ton', 'cargo');
  nameToIdMap.set('1-cargo-1-ton', 'cargo');
  nameToIdMap.set('2-cargo-1-ton', 'cargo');
  nameToIdMap.set('lift-hoist', 'lift-hoist');
  nameToIdMap.set('1-lift-hoist', 'lift-hoist');
  nameToIdMap.set('2-lift-hoist', 'lift-hoist');

  // Chemical lasers (map to regular lasers if chemical not available)
  nameToIdMap.set('medium-chem-laser', 'medium-laser');
  nameToIdMap.set('large-chem-laser', 'large-laser');
  nameToIdMap.set('small-chem-laser', 'small-laser');

  // Prototype weapons
  nameToIdMap.set('prototype-er-medium-laser', 'er-medium-laser');
  nameToIdMap.set('prototype-rocket-launcher-10', 'rl10');
  nameToIdMap.set('prototype-rocket-launcher-15', 'rl15');
  nameToIdMap.set('prototype-rocket-launcher-20', 'rl20');
  nameToIdMap.set('er-large-laser-prototype', 'er-large-laser');
  nameToIdMap.set('prototype-er-large-laser', 'er-large-laser');

  // RISC equipment
  nameToIdMap.set('risc-advanced-point-defense-system', 'risc-apds');

  // Additional aliases for missing patterns
  // Heavy lasers with clan prefix
  nameToIdMap.set('clan-heavy-medium-laser', 'medium-heavy-laser');
  nameToIdMap.set('clan-heavy-large-laser', 'large-heavy-laser');
  nameToIdMap.set('clan-heavy-small-laser', 'small-heavy-laser');

  // ER flamer (doesn't exist - map to regular flamer or clan flamer)
  nameToIdMap.set('er-flamer', 'flamer');
  nameToIdMap.set('clan-er-flamer', 'clan-flamer');

  // Improved C3 (no separate improved-c3, use c3i which is improved C3)
  nameToIdMap.set('improved-c3', 'c3i');

  // Plasma weapons
  nameToIdMap.set('plasma-rifle', 'plasmarifle');
  nameToIdMap.set('clan-plasma-cannon', 'plasmacannon');

  // Arrow IV variants
  nameToIdMap.set('clan-arrow-iv', 'clan-arrow-iv-launcher');
  nameToIdMap.set('arrow-iv', 'arrow-iv-launcher');
  nameToIdMap.set('arrow-iv-system', 'arrow-iv-launcher');
  nameToIdMap.set('arrowivsystem', 'arrow-iv-launcher');

  // ECM suite
  nameToIdMap.set('clan-ecm-suite', 'clan-ecm');
  nameToIdMap.set('ecm-suite', 'guardian-ecm');
  nameToIdMap.set('guardian-ecm-suite', 'guardian-ecm');

  // Sniper cannon (artillery)
  nameToIdMap.set('sniper', 'sniper-cannon');

  // VSP laser aliases (map to existing IDs)
  nameToIdMap.set('medium-vsp-laser', 'bamediumvsplaser');
  nameToIdMap.set('large-vsp-laser', 'largevsplaser');
  nameToIdMap.set('small-vsp-laser', 'basmallvsplaser');

  // Rotary AC with clan prefix
  nameToIdMap.set('clan-rac-2', 'clan-rac-2');
  nameToIdMap.set('clan-rac-5', 'clan-rac-5');

  // C3 boosted with TAG (map to boosted master, ignore TAG)
  nameToIdMap.set('c3-master-boosted-with-tag', 'c3-boosted-master');

  // VSP short aliases
  nameToIdMap.set('medium-vsp', 'bamediumvsplaser');
  nameToIdMap.set('large-vsp', 'largevsplaser');
  nameToIdMap.set('small-vsp', 'basmallvsplaser');

  // Coolant pod variant
  nameToIdMap.set('is-coolant-pod', 'coolant-pod');

  // Physical weapons (with quantity prefix)
  nameToIdMap.set('1-sword', 'sword');
  nameToIdMap.set('2-sword', 'sword');
  nameToIdMap.set('1-hatchet', 'hatchet');
  nameToIdMap.set('1-mace', 'mace');
  nameToIdMap.set('1-claws', 'claws');
  nameToIdMap.set('1-lance', 'lance');
  nameToIdMap.set('1-talons', 'talons');

  // ATM aliases
  nameToIdMap.set('clan-atm-3', 'atm-3');
  nameToIdMap.set('clan-atm-6', 'atm-6');
  nameToIdMap.set('clan-atm-9', 'atm-9');
  nameToIdMap.set('clan-atm-12', 'atm-12');
}
