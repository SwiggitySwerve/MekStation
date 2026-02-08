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

// Trace the top overcalculated and undercalculated units
const outside = r.allResults.filter(u => Math.abs(u.percentDiff) > 1)
  .sort((a, b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));

for (const u of outside.slice(0, 30)) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const b = u.breakdown || {};
  const crits = Object.values(data.criticalSlots || {}).flat().filter(Boolean);
  const uniqueCrits = [...new Set(crits.map(s => s.replace(/\s*\(omnipod\)/gi, '')))];

  const dir = u.difference > 0 ? 'OVER' : 'UNDER';
  console.log(`\n=== ${u.chassis} ${u.model} [${dir} ${u.percentDiff.toFixed(1)}%] ===`);
  console.log(`  calc=${u.calculatedBV} mul=${u.indexBV} diff=${u.difference}`);
  console.log(`  tech=${data.techBase} tonnage=${data.tonnage} engine=${data.engine?.type}/${data.engine?.rating}`);
  console.log(`  gyro=${data.gyro?.type || 'STANDARD'} cockpit=${data.cockpit || 'STANDARD'}`);
  console.log(`  walk=${b.walkMP} run=${b.runMP} jump=${b.jumpMP}`);
  console.log(`  defBV=${b.defensiveBV?.toFixed(1)} offBV=${b.offensiveBV?.toFixed(1)} cockMod=${b.cockpitModifier}`);
  console.log(`  armorBV=${b.armorBV} structBV=${b.structureBV} gyroBV=${b.gyroBV}`);
  console.log(`  defFactor=${b.defensiveFactor} defEquip=${b.defEquipBV} explosive=${b.explosivePenalty}`);
  console.log(`  weapBV=${b.weaponBV} rawWpn=${b.rawWeaponBV} halved=${b.halvedWeaponBV}`);
  console.log(`  ammoBV=${b.ammoBV} wgtBonus=${b.weightBonus} offEquip=${b.offEquipBV}`);
  console.log(`  heatEff=${b.heatEfficiency} heatDiss=${b.heatDissipation} moveHeat=${b.moveHeat}`);
  console.log(`  speedFactor=${b.speedFactor}`);
  console.log(`  equip: ${(data.equipment || []).map(e => e.id).join(', ')}`);
  if (u.issues && u.issues.length) console.log(`  issues: ${u.issues.join('; ')}`);

  // Notable crit features
  const notable = uniqueCrits.filter(c => {
    const lo = c.toLowerCase();
    return lo.includes('capacitor') || lo.includes('artemis') || lo.includes('supercharger') ||
      lo.includes('coolant') || lo.includes('targeting computer') || lo.includes('radical') ||
      lo.includes('masc') || lo.includes('tsm') || lo.includes('c3') || lo.includes('ecm') ||
      lo.includes('case') || lo.includes('stealth') || lo.includes('prototype') ||
      lo.includes('laser insulator') || lo.includes('streak') || lo.includes('ultra') ||
      lo.includes('rotary') || lo.includes('lb') || lo.includes('narc') || lo.includes('thunderbolt') ||
      lo.includes('rocket') || lo.includes('mml') || lo.includes('torpedo') || lo.includes('lrt') || lo.includes('srt') ||
      lo.includes('partial wing') || lo.includes('null sig') || lo.includes('void sig') ||
      lo.includes('blue shield') || lo.includes('improved jump');
  });
  if (notable.length) console.log(`  notable crits: ${notable.join(', ')}`);
}
