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

const outside1 = r.allResults.filter(u => Math.abs(u.percentDiff) > 1)
  .sort((a, b) => a.percentDiff - b.percentDiff);

const under = outside1.filter(u => u.percentDiff < -1);
const over = outside1.filter(u => u.percentDiff > 1);

console.log(`Total outside 1%: ${outside1.length} (under: ${under.length}, over: ${over.length})\n`);

// Categorize by features
const categories = {
  cockpit: {},
  techBase: {},
  hasTC: 0,
  hasArtemis: 0,
  hasMGA: 0,
  hasLaserInsulator: 0,
  isQuad: 0,
  hasCommandConsole: 0,
  hasTorsoMounted: 0,
  hasSmallCockpit: 0,
  hasStreakLRM: 0,
  hasBombast: 0,
  hasApollo: 0,
};

// Group by direction and cockpit
const underByCockpit = {};
const overByCockpit = {};

for (const u of outside1) {
  const b = u.breakdown || {};
  const data = unitMap.get(u.unitId);
  if (!data) continue;

  const cockpit = data.cockpit || 'UNKNOWN';
  categories.cockpit[cockpit] = (categories.cockpit[cockpit] || 0) + 1;
  categories.techBase[b.techBase || 'UNKNOWN'] = (categories.techBase[b.techBase || 'UNKNOWN'] || 0) + 1;

  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  if (crits.includes('targeting computer') || crits.includes('targcomp')) categories.hasTC++;
  if (crits.includes('artemis')) categories.hasArtemis++;
  if (crits.includes('mga') || crits.includes('machine gun array')) categories.hasMGA++;
  if (crits.includes('insulator')) categories.hasLaserInsulator++;
  if (crits.includes('apollo')) categories.hasApollo++;
  if (crits.includes('bombast')) categories.hasBombast++;
  if (crits.includes('streaklrm') || crits.includes('streak lrm')) categories.hasStreakLRM++;

  const hasQuadLegs = data.criticalSlots && (data.criticalSlots.FRONT_LEFT_LEG || data.criticalSlots.REAR_LEFT_LEG);
  if (hasQuadLegs) categories.isQuad++;

  if (cockpit === 'COMMAND_CONSOLE') categories.hasCommandConsole++;
  if (cockpit === 'TORSO_MOUNTED') categories.hasTorsoMounted++;
  if (cockpit === 'SMALL') categories.hasSmallCockpit++;

  const bucket = u.percentDiff < 0 ? underByCockpit : overByCockpit;
  bucket[cockpit] = (bucket[cockpit] || 0) + 1;
}

console.log('Feature breakdown:');
for (const [k, v] of Object.entries(categories)) {
  if (typeof v === 'number') console.log(`  ${k}: ${v}`);
  else console.log(`  ${k}: ${JSON.stringify(v)}`);
}

console.log('\nUndercalculated by cockpit:', JSON.stringify(underByCockpit));
console.log('Overcalculated by cockpit:', JSON.stringify(overByCockpit));

// Check pattern: for overcalculated, what's the ratio calc/ref?
console.log('\n=== Overcalculated ratio analysis ===');
for (const u of over.sort((a,b) => b.percentDiff - a.percentDiff).slice(0, 20)) {
  const data = unitMap.get(u.unitId);
  const cockpit = data ? data.cockpit : '?';
  const ratio = (u.calculatedBV / u.indexBV).toFixed(4);
  const crits = data ? JSON.stringify(data.criticalSlots || {}).toLowerCase() : '';
  const hasMGA = crits.includes('mga') || crits.includes('machine gun array');
  const hasTC = crits.includes('targeting computer') || crits.includes('targcomp');
  console.log(`  ${u.chassis} ${u.model}: +${u.percentDiff.toFixed(2)}% ratio=${ratio} cockpit=${cockpit}${hasMGA ? ' [MGA]' : ''}${hasTC ? ' [TC]' : ''}`);
}

// Check: how many overcalculated units have both MGA and TC?
let mgaTCover = 0, mgaOnlyOver = 0, tcOnlyOver = 0, neitherOver = 0;
for (const u of over) {
  const data = unitMap.get(u.unitId);
  if (!data) continue;
  const crits = JSON.stringify(data.criticalSlots || {}).toLowerCase();
  const hasMGA = crits.includes('mga') || crits.includes('machine gun array');
  const hasTC = crits.includes('targeting computer') || crits.includes('targcomp');
  if (hasMGA && hasTC) mgaTCover++;
  else if (hasMGA) mgaOnlyOver++;
  else if (hasTC) tcOnlyOver++;
  else neitherOver++;
}
console.log(`\nOvercalc: MGA+TC=${mgaTCover}, MGA-only=${mgaOnlyOver}, TC-only=${tcOnlyOver}, neither=${neitherOver}`);

// Check Revenant cockpit source — read its MTF-derived data
const rev = unitMap.get('revenant-ubm-1a');
if (rev) {
  console.log('\nRevenant details:');
  console.log('  cockpit:', rev.cockpit);
  console.log('  source:', rev.source || rev.mtfSource || 'unknown');
  console.log('  head crits:', (rev.criticalSlots || {}).HEAD);
}
