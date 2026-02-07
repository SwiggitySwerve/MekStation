// Analyze weapon patterns in overcalculated and undercalculated units
const fs = require('fs');
const path = require('path');
const report = require('../validation-output/bv-validation-report.json');
const idx = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/units/battlemechs/index.json'), 'utf8'));

const outliers = report.allResults.filter(x => x.status !== 'exact' && x.status !== 'within1');
const over = outliers.filter(x => x.difference > 0).sort((a,b) => a.percentDiff - b.percentDiff);
const under = outliers.filter(x => x.difference < 0).sort((a,b) => a.percentDiff - b.percentDiff);

console.log(`Outliers: ${outliers.length} (over=${over.length}, under=${under.length})`);

// For each unit, load and analyze equipment
function analyzeUnit(u) {
  const entry = idx.units.find(x => x.id === u.unitId);
  if (!entry) return null;
  const unitPath = path.join(__dirname, '../public/data/units/battlemechs', entry.path);
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    return {
      ...u,
      tech: unit.techBase,
      config: unit.configuration,
      engineType: unit.engine?.type,
      armor: unit.armorType,
      structure: unit.structureType,
      cockpit: unit.cockpit,
      equipment: unit.equipment || [],
      heatSinks: unit.heatSinks,
      movement: unit.movement,
      critSlots: unit.criticalSlots
    };
  } catch(e) { return null; }
}

// Count weapon appearances in each group
function countWeapons(units) {
  const counts = {};
  for (const u of units) {
    const data = analyzeUnit(u);
    if (!data) continue;
    for (const eq of data.equipment) {
      const id = eq.id || eq.name || 'unknown';
      if (!counts[id]) counts[id] = { count: 0, totalGap: 0, units: [] };
      counts[id].count++;
      counts[id].totalGap += u.difference;
      counts[id].units.push(u.unitId);
    }
  }
  return counts;
}

// Feature analysis
function analyzeFeatures(units, label) {
  const features = {};
  for (const u of units) {
    const data = analyzeUnit(u);
    if (!data) continue;
    // MASC detection
    const crits = data.critSlots ? Object.values(data.critSlots).flat() : [];
    const hasMASC = crits.some(s => s && typeof s === 'string' && /masc/i.test(s));
    const hasSC = crits.some(s => s && typeof s === 'string' && /supercharger/i.test(s));
    const hasTC = crits.some(s => s && typeof s === 'string' && /targeting/i.test(s));
    const hasC3 = crits.some(s => s && typeof s === 'string' && /c3/i.test(s));
    const hasTSM = crits.some(s => s && typeof s === 'string' && /triple.*strength|tsm/i.test(s));
    const hasStealth = crits.some(s => s && typeof s === 'string' && /stealth/i.test(s));
    const hasECM = crits.some(s => s && typeof s === 'string' && /ecm/i.test(s));

    const flags = [];
    if (hasMASC) flags.push('MASC');
    if (hasSC) flags.push('SC');
    if (hasTC) flags.push('TC');
    if (hasC3) flags.push('C3');
    if (hasTSM) flags.push('TSM');
    if (hasStealth) flags.push('stealth');
    if (hasECM) flags.push('ECM');

    for (const f of flags) {
      if (!features[f]) features[f] = { count: 0, totalGap: 0, avgPct: 0 };
      features[f].count++;
      features[f].totalGap += u.difference;
    }

    // Tech base
    const tech = data.tech || 'unknown';
    const techKey = 'tech:' + tech;
    if (!features[techKey]) features[techKey] = { count: 0, totalGap: 0 };
    features[techKey].count++;
    features[techKey].totalGap += u.difference;
  }

  console.log(`\n=== ${label} Feature Distribution ===`);
  for (const [f, data] of Object.entries(features).sort((a,b) => b[1].count - a[1].count)) {
    console.log(`  ${f.padEnd(25)} n=${String(data.count).padStart(3)} avgGap=${(data.totalGap/data.count).toFixed(1).padStart(7)}`);
  }
}

analyzeFeatures(over, 'OVERCALCULATED');
analyzeFeatures(under, 'UNDERCALCULATED');

// Show the closest 15 overcalculated with their key features
console.log('\n=== 15 Closest Overcalculated ===');
for (const u of over.slice(0, 15)) {
  const data = analyzeUnit(u);
  if (!data) continue;
  const crits = data.critSlots ? Object.values(data.critSlots).flat() : [];
  const hasMASC = crits.some(s => s && typeof s === 'string' && /masc/i.test(s));
  const hasSC = crits.some(s => s && typeof s === 'string' && /supercharger/i.test(s));
  const hasTC = crits.some(s => s && typeof s === 'string' && /targeting/i.test(s));
  const flags = [hasMASC && 'MASC', hasSC && 'SC', hasTC && 'TC'].filter(Boolean).join(',') || '-';
  console.log(`  ${(u.chassis+' '+u.model).padEnd(40)} diff=+${String(u.difference).padStart(4)} (${u.percentDiff.toFixed(2)}%) ${data.tech} ${flags}`);
}

// Show the closest 15 undercalculated
console.log('\n=== 15 Closest Undercalculated ===');
for (const u of under.slice(-15)) {
  const data = analyzeUnit(u);
  if (!data) continue;
  const crits = data.critSlots ? Object.values(data.critSlots).flat() : [];
  const hasMASC = crits.some(s => s && typeof s === 'string' && /masc/i.test(s));
  const hasSC = crits.some(s => s && typeof s === 'string' && /supercharger/i.test(s));
  const hasTC = crits.some(s => s && typeof s === 'string' && /targeting/i.test(s));
  const hasC3 = crits.some(s => s && typeof s === 'string' && /c3/i.test(s));
  const flags = [hasMASC && 'MASC', hasSC && 'SC', hasTC && 'TC', hasC3 && 'C3'].filter(Boolean).join(',') || '-';
  console.log(`  ${(u.chassis+' '+u.model).padEnd(40)} diff=${String(u.difference).padStart(5)} (${u.percentDiff.toFixed(2)}%) ${data.tech} ${flags}`);
}
