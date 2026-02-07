const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Load all weapon catalogs
const weaponDir = 'public/data/equipment/official/weapons';
const allWeapons = new Map();
for (const wf of fs.readdirSync(weaponDir).filter(f => f.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(path.join(weaponDir, wf), 'utf8'));
  if (data.items) {
    for (const item of data.items) {
      allWeapons.set(item.id, { ...item, file: wf });
    }
  }
}

// Check specific weapons
const checkWeapons = [
  'clan-streak-lrm-5', 'clan-streak-lrm-10', 'clan-streak-lrm-15', 'clan-streak-lrm-20',
  'streak-lrm-5', 'streak-lrm-10', 'streak-lrm-15', 'streak-lrm-20',
  'tsemp-cannon', 'tsemp',
  'mech-mortar-1', 'mech-mortar-2', 'mech-mortar-4', 'mech-mortar-8',
  'bombast-laser',
  'medium-vsp-laser', 'large-vsp-laser', 'small-vsp-laser',
  'large-re-engineered-laser', 'medium-re-engineered-laser', 'small-re-engineered-laser',
  'hag-20', 'hag-30', 'hag-40',
  'clan-hag-20', 'clan-hag-30', 'clan-hag-40',
  'null-signature-system',
  'risc-advanced-point-defense-system',
];

console.log('=== WEAPON CATALOG LOOKUP ===');
for (const w of checkWeapons) {
  const entry = allWeapons.get(w);
  if (entry) {
    console.log(`  ${w}: BV=${entry.battleValue} heat=${entry.heat} [${entry.file}]`);
  } else {
    console.log(`  ${w}: NOT FOUND`);
  }
}

// Also check what similar weapons exist in catalog
console.log('\n=== STREAK LRM VARIANTS IN CATALOG ===');
for (const [id, w] of allWeapons) {
  if (id.includes('streak') && id.includes('lrm')) {
    console.log(`  ${id}: BV=${w.battleValue} heat=${w.heat} [${w.file}]`);
  }
}

console.log('\n=== MORTAR VARIANTS IN CATALOG ===');
for (const [id, w] of allWeapons) {
  if (id.includes('mortar')) {
    console.log(`  ${id}: BV=${w.battleValue} heat=${w.heat} [${w.file}]`);
  }
}

console.log('\n=== HAG VARIANTS IN CATALOG ===');
for (const [id, w] of allWeapons) {
  if (id.includes('hag')) {
    console.log(`  ${id}: BV=${w.battleValue} heat=${w.heat} [${w.file}]`);
  }
}

console.log('\n=== VSP/BOMBAST VARIANTS IN CATALOG ===');
for (const [id, w] of allWeapons) {
  if (id.includes('vsp') || id.includes('bombast') || id.includes('variable')) {
    console.log(`  ${id}: BV=${w.battleValue} heat=${w.heat} [${w.file}]`);
  }
}

console.log('\n=== RE-ENGINEERED LASER VARIANTS ===');
for (const [id, w] of allWeapons) {
  if (id.includes('re-engineered') || id.includes('reengineered')) {
    console.log(`  ${id}: BV=${w.battleValue} heat=${w.heat} [${w.file}]`);
  }
}

console.log('\n=== TSEMP VARIANTS ===');
for (const [id, w] of allWeapons) {
  if (id.includes('tsemp')) {
    console.log(`  ${id}: BV=${w.battleValue} heat=${w.heat} [${w.file}]`);
  }
}

// Now check FALLBACK_WEAPON_BV and CATALOG_BV_OVERRIDES
// Just read the validation script for the relevant sections
console.log('\n=== CHECKING VALIDATE-BV.TS FALLBACKS ===');
const vbts = fs.readFileSync('scripts/validate-bv.ts', 'utf8');
const fallbackWeapons = ['streak-lrm', 'mortar', 'hag', 'bombast', 'vsp', 're-engineered', 'tsemp', 'null-sig'];
for (const w of fallbackWeapons) {
  const lines = vbts.split('\n').filter(l => l.toLowerCase().includes(w));
  if (lines.length > 0) {
    console.log(`\n  ${w}:`);
    for (const l of lines.slice(0, 5)) {
      console.log(`    ${l.trim()}`);
    }
  } else {
    console.log(`\n  ${w}: NO ENTRIES FOUND`);
  }
}
