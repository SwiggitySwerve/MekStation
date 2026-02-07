const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}
const files = findJsonFiles('public/data/units/battlemechs');
const unitMap = new Map();
for (const f of files) { try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {} }

const outside1 = r.allResults.filter(u => Math.abs(u.percentDiff) > 1);

// Check for one-shot weapons (OS or I-OS)
console.log('=== One-Shot weapon units outside 1% ===');
let osCount = 0;
for (const u of outside1) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const osWeapons = (data.equipment || []).filter(e => {
    const id = e.id.toLowerCase();
    return id.includes('-os') || id.includes('one-shot') || id.includes('oneshot');
  });
  if (osWeapons.length > 0) {
    osCount++;
    console.log('  ' + u.chassis + ' ' + u.model + ': ' + u.percentDiff.toFixed(2) + '% weapons: ' + osWeapons.map(e=>e.id).join(', '));
  }
}
console.log('Total with one-shot: ' + osCount);

// Check for Laser Insulator
console.log('\n=== Laser Insulator units ===');
let liCount = 0;
for (const u of outside1) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  if (crits.includes('laser insulator') || crits.includes('laserinsulator')) {
    liCount++;
    console.log('  ' + u.chassis + ' ' + u.model + ': ' + u.percentDiff.toFixed(2) + '% ref=' + u.indexBV + ' calc=' + u.calculatedBV);
  }
}
console.log('Total with Laser Insulator: ' + liCount);

// Check for Stealth Armor
console.log('\n=== Stealth Armor units ===');
let stCount = 0;
for (const u of outside1) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const armorType = (data.armor?.type || '').toLowerCase();
  if (armorType.includes('stealth')) {
    stCount++;
    console.log('  ' + u.chassis + ' ' + u.model + ': ' + u.percentDiff.toFixed(2) + '% ref=' + u.indexBV);
  }
}
console.log('Total with Stealth: ' + stCount);

// Check for Partial Wing
console.log('\n=== Partial Wing units ===');
let pwCount = 0;
for (const u of outside1) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  if (crits.includes('partial wing') || crits.includes('partialwing')) {
    pwCount++;
    console.log('  ' + u.chassis + ' ' + u.model + ': ' + u.percentDiff.toFixed(2) + '% ref=' + u.indexBV);
  }
}
console.log('Total with Partial Wing: ' + pwCount);

// Rocket launcher analysis
console.log('\n=== Rocket Launcher units (overcalculated) ===');
let rlCount = 0;
for (const u of outside1.filter(x => x.percentDiff > 1)) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const rl = (data.equipment || []).filter(e => e.id.toLowerCase().includes('rocket'));
  if (rl.length > 0) {
    rlCount++;
    console.log('  ' + u.chassis + ' ' + u.model + ': +' + u.percentDiff.toFixed(2) + '% rockets: ' + rl.length + ' types: ' + [...new Set(rl.map(e=>e.id))].join(', '));
  }
}
console.log('Total overcalculated with rockets: ' + rlCount);

// Check for AMS (Anti-Missile System) - should be defensive equipment
console.log('\n=== AMS units outside 1% ===');
let amsCount = 0;
for (const u of outside1) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const ams = (data.equipment || []).filter(e => e.id.toLowerCase().includes('ams') || e.id.toLowerCase().includes('anti-missile'));
  if (ams.length > 0) {
    amsCount++;
  }
}
console.log('Total with AMS: ' + amsCount);

// Check: what fraction of outside-1% are CLAN vs IS vs MIXED?
const techCounts = {};
for (const u of outside1) {
  const b = u.breakdown || {};
  const tech = b.techBase || 'UNKNOWN';
  techCounts[tech] = techCounts[tech] || { total: 0, under: 0, over: 0 };
  techCounts[tech].total++;
  if (u.percentDiff < 0) techCounts[tech].under++;
  else techCounts[tech].over++;
}
console.log('\n=== Tech base distribution (outside 1%) ===');
for (const [tech, c] of Object.entries(techCounts)) {
  const pctOfTotal = r.allResults.filter(u => (u.breakdown?.techBase || 'UNKNOWN') === tech).length;
  console.log('  ' + tech + ': ' + c.total + ' (' + c.under + ' under, ' + c.over + ' over) out of ' + pctOfTotal + ' total (' + (c.total/pctOfTotal*100).toFixed(1) + '% outside)');
}

// Check average gap by tech base
console.log('\n=== Average % diff by tech base (all units) ===');
const techAvg = {};
for (const u of r.allResults) {
  const tech = u.breakdown?.techBase || 'UNKNOWN';
  techAvg[tech] = techAvg[tech] || { sum: 0, count: 0 };
  techAvg[tech].sum += u.percentDiff;
  techAvg[tech].count++;
}
for (const [tech, d] of Object.entries(techAvg)) {
  console.log('  ' + tech + ': ' + (d.sum/d.count).toFixed(4) + '% (n=' + d.count + ')');
}
