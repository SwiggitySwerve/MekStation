import * as fs from 'fs';
import * as path from 'path';

const dir = 'public/data/units/battlemechs';
const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));

const gyroCounts: Record<string, number> = {};
for (const u of idx.units) {
  if (!u.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(dir, u.path), 'utf8'));
    const gt = d.gyro?.type || 'MISSING';
    gyroCounts[gt] = (gyroCounts[gt] || 0) + 1;
  } catch {}
}
console.log('Gyro types in dataset:');
for (const [gt, n] of Object.entries(gyroCounts).sort((a, b) => (b as number) - (a as number))) {
  console.log(`  ${gt}: ${n}`);
}

// Check if any crit slots mention specific gyro types
let hdGyroDetected = 0;
let xlGyroDetected = 0;
let compactGyroDetected = 0;
const hdGyroUnits: string[] = [];

for (const u of idx.units) {
  if (!u.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(dir, u.path), 'utf8'));
    if (!d.criticalSlots) continue;
    const ct = d.criticalSlots['CENTER_TORSO'] || d.criticalSlots['CT'];
    if (!ct) continue;
    let gyroSlots = 0;
    for (const s of ct) {
      if (s && typeof s === 'string' && s.toLowerCase().includes('gyro')) gyroSlots++;
    }
    // Standard/HD gyro = 4 crits, XL = 6, Compact = 2
    if (gyroSlots === 6) xlGyroDetected++;
    else if (gyroSlots === 2) compactGyroDetected++;
    // Can't distinguish standard from HD by crit count (both 4)
  } catch {}
}
console.log(`\nCrit-slot based detection:`);
console.log(`  XL gyro (6 crits): ${xlGyroDetected}`);
console.log(`  Compact gyro (2 crits): ${compactGyroDetected}`);

// Check the 37 "HD gyro candidate" units more carefully
const hdCandidates = [
  'ostroc-osr-4k', 'marauder-mad-9w', 'battlemaster-blr-k4',
  'albatross-alb-5u', 'battlemaster-blr-10s', 'black-hawk-t',
  'centurion-cn9-d', 'commando-com-9s', 'grasshopper-ghr-7p',
  'griffin-grf-4n', 'griffin-grf-5k', 'hunchback-hbk-5ss',
  'liberator-lib-4t', 'marauder-mad-9w2',
];

console.log(`\nGyro type for HD candidates:`);
for (const id of hdCandidates) {
  const entry = idx.units.find((e: any) => e.id === id);
  if (!entry?.path) { console.log(`  ${id}: NOT FOUND`); continue; }
  const d = JSON.parse(fs.readFileSync(path.join(dir, entry.path), 'utf8'));
  const ct = d.criticalSlots?.['CENTER_TORSO'] || d.criticalSlots?.['CT'] || [];
  const gyroSlots = ct.filter((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('gyro'));
  console.log(`  ${id}: gyro.type="${d.gyro?.type}" critGyroSlots=${gyroSlots.length} slots=${JSON.stringify(gyroSlots)}`);
}
