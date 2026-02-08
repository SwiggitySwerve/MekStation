const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Load ammo catalog
const ammoData = JSON.parse(fs.readFileSync('public/data/equipment/official/ammunition.json', 'utf8'));
const ammoMap = new Map();
for (const item of ammoData.items || []) {
  ammoMap.set(item.id, item);
}

// Also check ammunition subdirectories
const ammoDir = 'public/data/equipment/official/ammunition';
if (fs.existsSync(ammoDir) && fs.statSync(ammoDir).isDirectory()) {
  for (const f of fs.readdirSync(ammoDir).filter(f => f.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(ammoDir, f), 'utf8'));
    for (const item of data.items || []) {
      ammoMap.set(item.id, { ...item, file: f });
    }
  }
}

// Check Streak SRM/LRM ammo
console.log('=== STREAK SRM AMMO ===');
for (const [id, item] of ammoMap) {
  if (id.includes('streak') && id.includes('srm')) {
    console.log(`  ${id}: BV=${item.battleValue} (${item.name})`);
  }
}

console.log('\n=== STREAK LRM AMMO ===');
for (const [id, item] of ammoMap) {
  if (id.includes('streak') && id.includes('lrm')) {
    console.log(`  ${id}: BV=${item.battleValue} (${item.name})`);
  }
}

console.log('\n=== ULTRA AC AMMO ===');
for (const [id, item] of ammoMap) {
  if ((id.includes('uac') || id.includes('ultra')) && id.includes('ammo')) {
    console.log(`  ${id}: BV=${item.battleValue} (${item.name})`);
  }
}

// Check hardcoded ammo BVs in validate-bv.ts for specific patterns
const vbts = fs.readFileSync('scripts/validate-bv.ts', 'utf8');

// Find ammo resolution patterns
console.log('\n=== HARDCODED STREAK AMMO IN VALIDATE-BV.TS ===');
const lines = vbts.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('streak') && (line.includes('ammo') || line.includes('Ammo'))) {
    if (line.includes('//')) continue; // skip comments
    if (line.trim().startsWith('//')) continue;
    console.log(`  L${i+1}: ${line.trim().substring(0, 120)}`);
  }
}

// Check HAG ammo
console.log('\n=== HAG AMMO ===');
for (const [id, item] of ammoMap) {
  if (id.includes('hag')) {
    console.log(`  ${id}: BV=${item.battleValue} (${item.name})`);
  }
}
