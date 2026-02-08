import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';
import { normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Check specific equipment/weapon resolution
const tests = [
  // Enhanced PPC (Stag II)
  'enhanced-ppc', 'EnhancedPPC', 'ISEnhancedPPC', 'enhanced-er-ppc', 'enhancedppc',
  // Vehicular Mine Dispenser (Venom)
  'vehicular-mine-dispenser', 'ISVehicularMineDispenser', 'VehicularMineDispenser', 'mine-dispenser',
  // Bloodhound Active Probe (Venom)
  'bloodhound', 'ISBloodhoundActiveProbe', 'BloodhoundActiveProbe', 'bloodhound-active-probe',
  // Chain Whip (Trebuchet)
  'chain-whip', 'ISChainWhip', 'ChainWhip',
  // LRT 15 (Osteon)
  'lrt-15', 'CLLRT15', 'CLLRTorpedo15', 'lrt-15', 'clan-lrt-15',
  // Heavy Gauss Ammo (Barghest)
  'heavy-gauss-rifle-ammo', 'ISHeavyGaussAmmo', 'Heavy Gauss Ammo',
  // Nova CEWS (Osteon)
  'nova-cews', 'NovaCEWS', 'CLNovaCEWS',
];

console.log('=== Equipment Resolution Test ===');
for (const t of tests) {
  const r = resolveEquipmentBV(t);
  const norm = normalizeEquipmentId(t);
  console.log(`  ${t.padEnd(35)} → norm=${norm.padEnd(30)} resolved=${r.resolved} bv=${r.battleValue} heat=${r.heat}`);
}
