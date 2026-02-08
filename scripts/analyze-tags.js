const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json','utf8'));

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

const out = r.allResults.filter(u => Math.abs(u.percentDiff) > 1);
const tags = {};

for (const u of out) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  const dir = u.percentDiff > 0 ? 'over' : 'under';

  const addTag = (tag) => {
    if (!tags[tag]) tags[tag] = { over: [], under: [] };
    tags[tag][dir].push({ name: u.chassis + ' ' + u.model, pct: u.percentDiff, gap: u.difference });
  };

  if (data.configuration === 'Quad') addTag('QUAD');
  if (data.techBase === 'MIXED') addTag('MIXED');
  if (data.cockpit === 'SMALL') addTag('SMALL_COCKPIT');
  if (crits.includes('artemis')) addTag('ARTEMIS');
  if (crits.includes('c3') || crits.includes('c3i')) addTag('C3');
  if (crits.includes('targeting computer') || crits.includes('targetingcomputer')) addTag('TC');
  if (crits.includes('radical')) addTag('RADICAL_HS');
  if (crits.includes('ppc capacitor') || crits.includes('ppccapacitor')) addTag('PPC_CAP');
  if (crits.includes('one-shot') || crits.includes('oneshot')) addTag('ONE_SHOT');
  if (data.armor?.type?.includes('STEALTH')) addTag('STEALTH_ARMOR');
  if (crits.includes('laser insulator')) addTag('LASER_INSULATOR');
  if (crits.includes('rocket launcher')) addTag('ROCKET_LAUNCHER');
  if (data.structure?.type?.includes('COMPOSITE')) addTag('COMPOSITE_STRUCT');
  if (data.structure?.type?.includes('REINFORCED')) addTag('REINFORCED_STRUCT');
  if (data.engine?.type?.includes('XXL')) addTag('XXL_ENGINE');
  if (crits.includes('prototype') || crits.includes('re-engineered') || crits.includes('reengineered')) addTag('PROTOTYPE_EQUIP');
  if (crits.includes('case ii') || crits.includes('caseii') || crits.includes('clcase')) addTag('CASE_II');
  if (crits.includes('supercharger') || crits.includes('super charger')) addTag('SUPERCHARGER');
  if (crits.includes('partial wing') || crits.includes('partialwing')) addTag('PARTIAL_WING');
  if (data.gyro?.type === 'NONE') addTag('NONE_GYRO');
  if (crits.includes('improved jump jet') || crits.includes('improvedjumpjet')) addTag('IMPROVED_JJ');
  if (crits.includes('heavy ppc') || crits.includes('heavyppc')) addTag('HEAVY_PPC');
  if (crits.includes('bombast')) addTag('BOMBAST_LASER');
  if (crits.includes('vsp') || crits.includes('variable speed')) addTag('VSP_LASER');
  if (crits.includes('thunderbolt')) addTag('THUNDERBOLT');
}

console.log('Tag analysis for outside-1% units (' + out.length + ' total):');
console.log('Tag'.padEnd(20), 'Over'.padEnd(6), 'Under'.padEnd(6), 'Total', '  Avg%Over', '  Avg%Under');
for (const [tag, data] of Object.entries(tags).sort((a,b) => (b[1].over.length+b[1].under.length) - (a[1].over.length+a[1].under.length))) {
  const avgOver = data.over.length ? (data.over.reduce((s,u)=>s+u.pct,0)/data.over.length).toFixed(2) : '-';
  const avgUnder = data.under.length ? (data.under.reduce((s,u)=>s+u.pct,0)/data.under.length).toFixed(2) : '-';
  console.log(tag.padEnd(20), String(data.over.length).padEnd(6), String(data.under.length).padEnd(6), String(data.over.length+data.under.length).padEnd(6), avgOver.padStart(8), avgUnder.padStart(10));
}

// Show details for tags with strong directional bias
console.log('\n=== Tags with strong bias (>70% one direction) ===');
for (const [tag, data] of Object.entries(tags)) {
  const total = data.over.length + data.under.length;
  if (total < 2) continue;
  const overPct = data.over.length / total * 100;
  if (overPct > 70 || overPct < 30) {
    const dir = overPct > 50 ? 'OVERCALC' : 'UNDERCALC';
    console.log(`\n${tag} (${dir}, ${total} units):`);
    const all = [...data.over, ...data.under].sort((a,b) => b.pct - a.pct);
    for (const u of all) {
      console.log(`  ${u.name}: ${u.pct > 0 ? '+' : ''}${u.pct.toFixed(2)}% gap=${u.gap}`);
    }
  }
}
