// Trace Jade Phoenix D weapon BV resolution
const fs = require('fs');
const path = require('path');

// Load weapon catalogs
const basePath = 'public/data/equipment/official/weapons';
const weapFiles = fs.readdirSync(basePath).filter(f => f.endsWith('.json'));
const allWeapons = [];
for (const f of weapFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(basePath, f), 'utf8'));
  allWeapons.push(...(data.items || []));
}

// Find weapons by name pattern
function findWeapon(pattern) {
  return allWeapons.filter(w => w.id.toLowerCase().includes(pattern.toLowerCase()));
}

console.log('=== Clan ER PPC ===');
for (const w of findWeapon('er-ppc')) console.log('  ' + w.id + ' bv=' + w.battleValue + ' heat=' + w.heat);

console.log('\n=== Clan Gauss Rifle ===');
for (const w of findWeapon('gauss-rifle')) console.log('  ' + w.id + ' bv=' + w.battleValue + ' heat=' + w.heat);

console.log('\n=== Clan ER Medium Laser ===');
for (const w of findWeapon('er-medium-laser')) console.log('  ' + w.id + ' bv=' + w.battleValue + ' heat=' + w.heat);

// Check Partial Wing
const miscPath = 'public/data/equipment/official';
const miscFiles = ['miscellaneous.json', 'electronics.json'];
for (const f of miscFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(miscPath, f), 'utf8'));
    const pw = (data.items || []).filter(i => i.id.toLowerCase().includes('partial-wing') || i.name.toLowerCase().includes('partial wing'));
    if (pw.length > 0) {
      console.log('\n=== Partial Wing (from ' + f + ') ===');
      for (const w of pw) console.log('  ' + w.id + ' bv=' + w.battleValue + ' heat=' + (w.heat || 0));
    }
  } catch {}
}

// Also check jump-jet files
const jjPath = 'public/data/equipment/official/miscellaneous';
try {
  const files2 = fs.readdirSync(jjPath).filter(f => f.endsWith('.json'));
  for (const f of files2) {
    const data = JSON.parse(fs.readFileSync(path.join(jjPath, f), 'utf8'));
    const pw = (data.items || []).filter(i => i.id.toLowerCase().includes('partial') || i.name.toLowerCase().includes('partial'));
    if (pw.length > 0) {
      console.log('\n=== Partial Wing (from miscellaneous/' + f + ') ===');
      for (const w of pw) console.log('  ' + JSON.stringify(w));
    }
  }
} catch {}

// Calculate expected BV
console.log('\n=== Expected Jade Phoenix D weapon BV ===');
const clanERPPC = allWeapons.find(w => w.id === 'clan-er-ppc');
const clanGauss = allWeapons.find(w => w.id === 'clan-gauss-rifle');
const clanERMed = allWeapons.find(w => w.id === 'clan-er-medium-laser');
if (clanERPPC) console.log('Clan ER PPC: bv=' + clanERPPC.battleValue);
if (clanGauss) console.log('Clan Gauss Rifle: bv=' + clanGauss.battleValue);
if (clanERMed) console.log('Clan ER Medium Laser: bv=' + clanERMed.battleValue);

if (clanERPPC && clanGauss && clanERMed) {
  const base = 2 * clanERPPC.battleValue + clanGauss.battleValue + clanERMed.battleValue;
  const withTC = 2 * clanERPPC.battleValue * 1.25 + clanGauss.battleValue * 1.25 + clanERMed.battleValue * 1.25;
  console.log('Base (no TC): ' + base);
  console.log('With TC (*1.25): ' + withTC);
  console.log('Reported: 1565');
  console.log('Difference: ' + (1565 - withTC));
}
