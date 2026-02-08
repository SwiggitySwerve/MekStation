const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...findJsonFiles(f));
    else if (e.name.endsWith('.json') && e.name !== 'index.json') results.push(f);
  }
  return results;
}
const files = findJsonFiles('public/data/units/battlemechs');
const unitMap = new Map();
for (const f of files) { try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {} }

// Look at all units with Streak weapons and check whether they're overcalculated or undercalculated
const streakUnits = [];
for (const u of r.allResults) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const hasStreak = (data.equipment || []).some(e => e.id.toLowerCase().includes('streak'));
  if (!hasStreak) continue;
  streakUnits.push({ u, data });
}

console.log(`Total units with Streak weapons: ${streakUnits.length}`);

// Focus on outside-1%
const outsideStreak = streakUnits.filter(s => Math.abs(s.u.percentDiff) > 1);
console.log(`Outside 1%: ${outsideStreak.length}`);
console.log();

for (const { u, data } of outsideStreak.sort((a, b) => b.u.percentDiff - a.u.percentDiff)) {
  const dir = u.difference > 0 ? '+' : '';
  const streakEquip = (data.equipment || []).filter(e => e.id.toLowerCase().includes('streak'));
  const b = u.breakdown || {};

  const crits = Object.values(data.criticalSlots || {}).flat().filter(Boolean);
  const streakCrits = [...new Set(crits.filter(c => c.toLowerCase().includes('streak')).map(c => c.replace(/\s*\(omnipod\)/gi, '')))];

  console.log(`${dir}${u.percentDiff.toFixed(1)}% ${u.chassis} ${u.model} (diff=${dir}${u.difference}) tech=${data.techBase}`);
  console.log(`  weapons: ${(data.equipment || []).map(e => e.id).join(', ')}`);
  console.log(`  streak equip: ${streakEquip.map(e => e.id).join(', ')}`);
  console.log(`  streak crits: ${streakCrits.join(', ')}`);
  console.log(`  weapBV=${b.weaponBV} raw=${b.rawWeaponBV} halved=${b.halvedWeaponBV}`);
  console.log(`  ammoBV=${b.ammoBV} speedF=${b.speedFactor} heatEff=${b.heatEfficiency}`);
  console.log();
}

// Now check: do Streak weapons on Clan/Mixed mechs correctly resolve to Clan BV?
// Look at crit slot names to see if they're Clan (CL prefix) or IS
console.log('\n=== STREAK WEAPON TYPE DETECTION ===');
for (const { u, data } of outsideStreak) {
  const crits = Object.values(data.criticalSlots || {}).flat().filter(Boolean);
  const streakCrits = crits.filter(c => c.toLowerCase().includes('streak'));
  for (const c of new Set(streakCrits)) {
    const isClan = c.startsWith('CL') || c.startsWith('Clan');
    const isIS = c.startsWith('IS') || c.startsWith('Is');
    console.log(`  ${u.chassis} ${u.model}: "${c.replace(/\s*\(omnipod\)/gi, '')}" → ${isClan ? 'CLAN' : isIS ? 'IS' : 'UNKNOWN'} (techBase=${data.techBase})`);
  }
}
