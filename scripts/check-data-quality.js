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

const resultMap = new Map();
for (const u of r.allResults) resultMap.set(u.unitId, u);

console.log('=== DATA QUALITY CHECKS ===\n');

// Check 1: Walk MP vs engine rating
console.log('--- Walk MP inconsistencies ---');
let walkIssues = 0;
for (const [id, data] of unitMap) {
  if (!data.engine || !data.tonnage || !data.movement) continue;
  const expected = Math.floor(data.engine.rating / data.tonnage);
  if (expected !== data.movement.walk && expected > 0) {
    const u = resultMap.get(id);
    if (u && Math.abs(u.percentDiff) > 1) {
      console.log(`  ${data.chassis} ${data.model}: walk=${data.movement.walk} expected=${expected} (rating=${data.engine.rating} ton=${data.tonnage}) [${u.percentDiff.toFixed(2)}%]`);
      walkIssues++;
    }
  }
}
console.log(`Total walk issues in outside-1%: ${walkIssues}\n`);

// Check 2: Jump MP vs JJ count in crits (for units outside 1%)
console.log('--- Jump MP vs JJ crit slots ---');
let jumpIssues = 0;
for (const [id, data] of unitMap) {
  if (!data.criticalSlots || !data.movement) continue;
  const allCrits = Object.values(data.criticalSlots).flat().filter(Boolean);
  const jjCount = allCrits.filter(s => {
    const lo = s.toLowerCase();
    return lo === 'jump jet' || lo === 'improved jump jet' || lo.includes('jumpjet') ||
      lo.includes('prototypejumpjet') || lo.includes('prototype jump jet');
  }).length;
  // Improved JJ take 2 slots each
  const hasImproved = allCrits.some(s => s.toLowerCase().includes('improved jump jet') || s.toLowerCase().includes('improvedjumpjet'));
  const effectiveJJ = hasImproved ? Math.floor(jjCount / 2) : jjCount;
  const hasPartialWing = allCrits.some(s => s.toLowerCase().includes('partial') && s.toLowerCase().includes('wing') || s.toLowerCase().includes('partialwing'));
  const pwBonus = hasPartialWing && effectiveJJ > 0 ? (data.tonnage <= 55 ? 2 : 1) : 0;

  if (effectiveJJ > 0 && data.movement.jump !== effectiveJJ) {
    // Check if jump = effectiveJJ + pwBonus (double-counted PW)
    if (data.movement.jump === effectiveJJ + pwBonus && pwBonus > 0) {
      const u = resultMap.get(id);
      if (u && u.percentDiff > 1) {
        console.log(`  PW DOUBLE-COUNT: ${data.chassis} ${data.model}: jump=${data.movement.jump} JJ=${effectiveJJ} pwBonus=${pwBonus} [${u.percentDiff.toFixed(2)}%]`);
        jumpIssues++;
      }
    } else if (Math.abs(data.movement.jump - effectiveJJ) > 1) {
      const u = resultMap.get(id);
      if (u && Math.abs(u.percentDiff) > 0.5) {
        console.log(`  MISMATCH: ${data.chassis} ${data.model}: jump=${data.movement.jump} JJ=${effectiveJJ} [${u ? u.percentDiff.toFixed(2) + '%' : 'N/A'}]`);
        jumpIssues++;
      }
    }
  }
}
console.log(`Total jump issues: ${jumpIssues}\n`);

// Check 3: Missing ammo for ammo-using weapons
console.log('--- Missing ammo weapons ---');
const ammoWeapons = ['lrm', 'srm', 'ac-', 'ultra-ac', 'lb-', 'gauss', 'mrm', 'atm', 'iatm', 'hag-', 'streak-lrm', 'streak-srm', 'narc', 'arrow-iv'];
let ammoIssues = 0;
for (const [id, data] of unitMap) {
  if (!data.equipment || !data.criticalSlots) continue;
  const allCrits = Object.values(data.criticalSlots).flat().filter(Boolean);
  const hasAmmo = allCrits.some(s => s.toLowerCase().includes('ammo'));

  const hasAmmoWeapon = data.equipment.some(e => {
    const lo = e.id.toLowerCase();
    return ammoWeapons.some(aw => lo.includes(aw));
  });

  if (hasAmmoWeapon && !hasAmmo) {
    const u = resultMap.get(id);
    if (u && Math.abs(u.percentDiff) > 1) {
      console.log(`  ${data.chassis} ${data.model}: has ammo weapon but no ammo in crits [${u.percentDiff.toFixed(2)}%]`);
      ammoIssues++;
    }
  }
}
console.log(`Total ammo issues in outside-1%: ${ammoIssues}\n`);

// Check 4: Heat sink count vs crits
console.log('--- Heat sink count anomalies ---');
let hsIssues = 0;
for (const [id, data] of unitMap) {
  if (!data.heatSinks || !data.engine || !data.criticalSlots) continue;
  const u = resultMap.get(id);
  if (!u || Math.abs(u.percentDiff) <= 1) continue;

  const allCrits = Object.values(data.criticalSlots).flat().filter(Boolean);
  const isDHS = data.heatSinks.type.toUpperCase().includes('DOUBLE');
  const engineHS = Math.min(10, Math.floor(data.engine.rating / 25));
  const critHS = allCrits.filter(s => {
    const lo = s.toLowerCase().replace(/\s*\(omnipod\)/g, '');
    return (lo.includes('double heat sink') || lo.includes('doubleheatsin') || lo.includes('isdoubleheatsin') || lo.includes('cldoubleheatsin')) && !lo.includes('ammo');
  }).length;
  const critHSCount = isDHS ? Math.floor(critHS / 3) : critHS; // IS DHS = 3 slots each
  const expectedTotal = engineHS + critHSCount;

  if (isDHS && Math.abs(data.heatSinks.count - expectedTotal) > 2) {
    console.log(`  ${data.chassis} ${data.model}: declared=${data.heatSinks.count} expected~${expectedTotal} (engine=${engineHS} crits=${critHSCount}) [${u.percentDiff.toFixed(2)}%]`);
    hsIssues++;
  }
}
console.log(`Total HS issues in outside-1%: ${hsIssues}\n`);

// Check 5: Armor types that might not be mapped correctly
console.log('--- Unusual armor types in outside-1% ---');
const armorTypes = {};
for (const u of r.allResults.filter(x => Math.abs(x.percentDiff) > 1)) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const at = data.armor?.type || 'UNKNOWN';
  if (!armorTypes[at]) armorTypes[at] = { over: 0, under: 0 };
  if (u.percentDiff > 0) armorTypes[at].over++;
  else armorTypes[at].under++;
}
for (const [at, counts] of Object.entries(armorTypes).sort((a,b) => (b[1].over+b[1].under) - (a[1].over+a[1].under))) {
  console.log(`  ${at}: over=${counts.over} under=${counts.under}`);
}
