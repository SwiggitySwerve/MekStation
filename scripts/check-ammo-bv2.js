const fs = require('fs');
const path = require('path');

// Load all ammo from subdirectory
const ammoDir = 'public/data/equipment/official/ammunition';
const ammoMap = new Map();
for (const f of fs.readdirSync(ammoDir).filter(f => f.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(path.join(ammoDir, f), 'utf8'));
  for (const item of data.items || []) {
    ammoMap.set(item.id, { ...item, file: f });
  }
}

console.log(`Total ammo items: ${ammoMap.size}`);

// Check Streak SRM ammo
console.log('\n=== STREAK SRM AMMO ===');
for (const [id, item] of ammoMap) {
  if (id.includes('streak') && id.includes('srm')) {
    console.log(`  ${id}: BV=${item.battleValue} (${item.name}) [${item.file}]`);
  }
}

console.log('\n=== STREAK LRM AMMO ===');
for (const [id, item] of ammoMap) {
  if (id.includes('streak') && id.includes('lrm')) {
    console.log(`  ${id}: BV=${item.battleValue} (${item.name}) [${item.file}]`);
  }
}

console.log('\n=== ULTRA AC AMMO ===');
for (const [id, item] of ammoMap) {
  if ((id.includes('uac') || id.includes('ultra')) && id.includes('ammo')) {
    console.log(`  ${id}: BV=${item.battleValue} (${item.name}) [${item.file}]`);
  }
}

console.log('\n=== HAG AMMO ===');
for (const [id, item] of ammoMap) {
  if (id.includes('hag')) {
    console.log(`  ${id}: BV=${item.battleValue} (${item.name}) [${item.file}]`);
  }
}

console.log('\n=== LRM AMMO (non-streak) ===');
for (const [id, item] of ammoMap) {
  if (id.includes('lrm') && !id.includes('streak') && !id.includes('elrm')) {
    console.log(`  ${id}: BV=${item.battleValue} (${item.name}) [${item.file}]`);
  }
}

// Now check: in validation report, what ammo BVs are being used?
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Find units outside 1% and check their ammo
const outside1 = r.allResults.filter(u => Math.abs(u.percentDiff) > 1);
console.log(`\n=== AMMO ANALYSIS FOR ${outside1.length} OUTSIDE-1% UNITS ===`);

let missingAmmo = 0;
let zeroAmmo = 0;
for (const u of outside1) {
  const b = u.breakdown || {};
  if (b.ammoBV === 0 || b.ammoBV === undefined) {
    // Check if unit has ammo in equipment
    const unitFile = `public/data/units/battlemechs/${u.id}.json`;
    if (fs.existsSync(unitFile)) {
      const unitData = JSON.parse(fs.readFileSync(unitFile, 'utf8'));
      const hasAmmo = (unitData.equipment || []).some(e =>
        e.id?.includes('ammo') || e.name?.toLowerCase().includes('ammo')
      );
      if (hasAmmo) {
        missingAmmo++;
        console.log(`  ${u.chassis} ${u.model} (${u.id}): ammoBV=0 but has ammo equipment! diff=${u.difference > 0 ? '+' : ''}${u.difference}`);
      }
    }
  }
}
console.log(`Units with ammo but ammoBV=0: ${missingAmmo}`);

// Check units where ammo is undercontributing
console.log('\n=== UNITS WITH LOW AMMO BV (outside 1%) ===');
for (const u of outside1.filter(u => u.difference < 0).sort((a, b) => a.difference - b.difference).slice(0, 20)) {
  const b = u.breakdown || {};
  console.log(`  ${u.chassis} ${u.model}: diff=${u.difference} ammoBV=${b.ammoBV || 0} weapBV=${b.weaponBV || 0} off=${b.offensiveBV?.toFixed(1)} def=${b.defensiveBV?.toFixed(1)}`);
}
