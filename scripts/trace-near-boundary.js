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
for (const f of files) {
  try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); unitMap.set(d.id, d); } catch {}
}

const targets = [
  'grasshopper-ghr-7p',  // IS, energy only, -1.22%
  'quickdraw-qkd-8p',     // IS, -1.44%
  'charger-cgr-3kr',      // IS overcalc +1.39% TC
  'goshawk-ii-2',          // Clan overcalc +1.08% TC
  'malice-mal-xp',         // MIXED, -1.14%
  'osteon-d',              // CLAN, ammoBV=0, -1.01%
];

for (const id of targets) {
  const result = r.allResults.find(x => x.unitId === id);
  const data = unitMap.get(id);
  if (!result || !data) { console.log('NOT FOUND:', id); continue; }

  const b = result.breakdown || {};
  console.log(`\n=== ${result.chassis} ${result.model} (${result.percentDiff.toFixed(2)}%) ref=${result.indexBV} calc=${result.calculatedBV} gap=${result.difference} ===`);
  console.log('Equipment:');
  for (const eq of data.equipment) {
    console.log(`  ${eq.id} @ ${eq.location}`);
  }

  // Check for any Laser Insulator, PPC Capacitor, Artemis, TC in crits
  const special = [];
  for (const [loc, slots] of Object.entries(data.criticalSlots || {})) {
    for (const slot of (slots || [])) {
      if (!slot) continue;
      const lo = slot.toLowerCase();
      if (lo.includes('insulator') || lo.includes('capacitor') || lo.includes('artemis') || lo.includes('targeting') || lo.includes('targcomp') || lo.includes('apollo')) {
        special.push(slot + ' @ ' + loc);
      }
    }
  }
  if (special.length > 0) console.log('  Special:', special.join(', '));

  console.log(`Offense: wBV=${b.rawWeaponBV} halved=${b.halvedWeaponBV} aBV=${b.ammoBV} wt=${b.weightBonus} phys=${b.physicalWeaponBV} offEq=${b.offEquipBV} sf=${b.speedFactor} heatEff=${b.heatEfficiency} heatDiss=${b.heatDissipation} moveHeat=${b.moveHeat}`);
  console.log(`Defense: armor=${b.armorBV} struct=${b.structureBV} gyro=${b.gyroBV} defEq=${b.defEquipBV} expl=${b.explosivePenalty} df=${b.defensiveFactor} cockpit=${b.cockpitType}`);
  if (result.issues?.length > 0) console.log('Issues:', result.issues.join('; '));
}
