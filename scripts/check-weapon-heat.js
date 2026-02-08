const r = require('../validation-output/bv-validation-report.json');
// Just look at what fields the breakdown has
const sample = r.allResults.find(x => x.breakdown);
if (sample) {
  console.log('Breakdown fields:', Object.keys(sample.breakdown));
}

// Check what weapon heat values are in the catalog
const weapons = {};
const dirs = ['energy.json', 'ballistic.json', 'missile.json'];
for (const d of dirs) {
  try {
    const data = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../public/data/equipment/official/weapons', d), 'utf8'));
    for (const w of data.items || []) {
      weapons[w.id] = { bv: w.battleValue, heat: w.heat, name: w.name };
    }
  } catch(e) {}
}

// Show heat values for key weapon types
console.log('\n=== ULTRA AC HEAT VALUES FROM CATALOG ===');
for (const [id, w] of Object.entries(weapons)) {
  if (id.includes('ultra') || id.includes('uac')) {
    console.log('  ' + id.padEnd(35) + ' heat=' + w.heat + ' bv=' + w.bv);
  }
}

console.log('\n=== ROTARY AC HEAT VALUES FROM CATALOG ===');
for (const [id, w] of Object.entries(weapons)) {
  if (id.includes('rotary') || id.includes('rac')) {
    console.log('  ' + id.padEnd(35) + ' heat=' + w.heat + ' bv=' + w.bv);
  }
}

console.log('\n=== STREAK HEAT VALUES FROM CATALOG ===');
for (const [id, w] of Object.entries(weapons)) {
  if (id.includes('streak')) {
    console.log('  ' + id.padEnd(35) + ' heat=' + w.heat + ' bv=' + w.bv);
  }
}

console.log('\n=== PPC HEAT VALUES FROM CATALOG ===');
for (const [id, w] of Object.entries(weapons)) {
  if (id.includes('ppc') && !id.includes('ammo')) {
    console.log('  ' + id.padEnd(35) + ' heat=' + w.heat + ' bv=' + w.bv);
  }
}

console.log('\n=== ONE-SHOT HEAT VALUES FROM CATALOG ===');
for (const [id, w] of Object.entries(weapons)) {
  if (id.includes('-os')) {
    console.log('  ' + id.padEnd(35) + ' heat=' + w.heat + ' bv=' + w.bv);
  }
}
