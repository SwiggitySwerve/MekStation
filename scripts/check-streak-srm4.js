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

// Find all units with IS Streak SRM-4 (not clan)
console.log('=== Units with IS Streak SRM-4 ===\n');
let streakCount = 0;
let affectedOutside = 0;
let wouldFix = 0;
const affected = [];

for (const u of r.allResults) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;

  // Count IS streak-srm-4 weapons
  const isStreak4 = data.equipment.filter(e => {
    const id = e.id.toLowerCase();
    return id === 'streak-srm-4' || id === 'isstreaksrm4' || id === '1-isstreaksrm4';
  });
  // Also check crits for SSRM4 that might not be in equipment list
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  const critMatch = (crits.match(/streak.*srm.*4|streaksrm4/g) || []).length;

  if (isStreak4.length === 0 && critMatch === 0) continue;

  const numWeapons = isStreak4.length || Math.ceil(critMatch / 1);
  const bvDelta = numWeapons * 20; // 79 - 59 = 20 per weapon

  // Estimate new BV (simple: add delta * speedFactor to total)
  const b = u.breakdown || {};
  const sf = b.speedFactor || 1;
  const cockpitMod = b.cockpitModifier || 1;
  const techBase = b.techBase || data.techBase;

  // Skip Clan units (Clan Streak SRM-4 is already correct at BV=79)
  if (techBase === 'CLAN') continue;

  streakCount++;
  const estNewBV = u.calculatedBV + Math.round(bvDelta * sf * cockpitMod);
  const newDiff = ((estNewBV - u.indexBV) / u.indexBV * 100);
  const wasOutside = Math.abs(u.percentDiff) > 1;
  const nowInside = Math.abs(newDiff) <= 1;

  if (wasOutside) affectedOutside++;
  if (wasOutside && nowInside) wouldFix++;

  const label = wasOutside ? (nowInside ? '[FIX]' : '[STILL OUT]') : (Math.abs(newDiff) > 1 ? '[REGRESS]' : '[OK]');
  affected.push({ ...u, numWeapons, bvDelta, estNewBV, newDiff, label });
}

// Sort by impact
affected.sort((a, b) => a.percentDiff - b.percentDiff);
for (const u of affected) {
  console.log(`${u.label} ${u.chassis} ${u.model}: ${u.numWeapons}x SSRM4 | cur=${u.percentDiff.toFixed(2)}% new=${u.newDiff.toFixed(2)}% | ref=${u.indexBV} cur=${u.calculatedBV} est=${u.estNewBV}`);
}

console.log(`\nTotal IS units with Streak SRM-4: ${streakCount}`);
console.log(`Currently outside 1%: ${affectedOutside}`);
console.log(`Would fix (bring within 1%): ${wouldFix}`);
console.log(`Would regress: ${affected.filter(u => u.label === '[REGRESS]').length}`);
