#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(basePath, 'index.json'), 'utf-8'));

let standardWithSmallLayout = 0;
let standardWithStandardLayout = 0;
const headPatterns: Record<string, number> = {};

for (const iu of indexData.units) {
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  const cockpit = (ud.cockpit || 'STANDARD').toUpperCase();
  if (cockpit !== 'STANDARD') continue;
  
  const headSlots = ud.criticalSlots?.HEAD;
  if (!Array.isArray(headSlots) || headSlots.length < 6) continue;
  
  const slot0 = (headSlots[0] || '').toLowerCase();
  const slot1 = (headSlots[1] || '').toLowerCase();
  const slot2 = (headSlots[2] || '').toLowerCase();
  const slot3 = (headSlots[3] || '').toLowerCase();
  const slot4 = (headSlots[4] || '').toLowerCase();
  const slot5 = (headSlots[5] || '').toLowerCase();
  
  const hasLS0 = slot0.includes('life support');
  const hasSensors1 = slot1.includes('sensors');
  const hasCockpit2 = slot2.includes('cockpit');
  const hasSensors3 = slot3.includes('sensors');
  const hasLS5 = slot5.includes('life support');
  
  const pattern = [
    hasLS0 ? 'LS' : 'EQ',
    hasSensors1 ? 'SN' : 'EQ',
    hasCockpit2 ? 'CP' : 'EQ',
    hasSensors3 ? 'SN' : 'EQ',
    slot4.includes('sensors') ? 'SN' : slot4.includes('life support') ? 'LS' : 'EQ',
    hasLS5 ? 'LS' : 'EQ',
  ].join(',');
  
  headPatterns[pattern] = (headPatterns[pattern] || 0) + 1;
  
  if (hasSensors3 && !hasLS5) {
    standardWithSmallLayout++;
  } else {
    standardWithStandardLayout++;
  }
}

console.log(`Standard cockpit units with "small" layout (sensors@3, no LS@5): ${standardWithSmallLayout}`);
console.log(`Standard cockpit units with standard layout: ${standardWithStandardLayout}`);

console.log(`\nHEAD slot patterns for STANDARD cockpit units:`);
for (const [p, c] of Object.entries(headPatterns).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${p}: ${c} units`);
}

console.log(`\n=== Checking if slot count differs ===`);
let smallCockpit3Slots = 0;
let standardCockpit5Slots = 0;
for (const iu of indexData.units) {
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  const cockpit = (ud.cockpit || 'STANDARD').toUpperCase();
  if (cockpit !== 'STANDARD') continue;
  
  const headSlots = ud.criticalSlots?.HEAD;
  if (!Array.isArray(headSlots)) continue;
  
  let cockpitSlots = 0;
  for (const s of headSlots) {
    if (!s || typeof s !== 'string') continue;
    const lo = s.toLowerCase();
    if (lo.includes('life support') || lo.includes('sensors') || lo.includes('cockpit')) cockpitSlots++;
  }
  
  if (cockpitSlots === 3) smallCockpit3Slots++;
  else if (cockpitSlots >= 5) standardCockpit5Slots++;
}
console.log(`Standard cockpit with 3 cockpit-related slots: ${smallCockpit3Slots}`);
console.log(`Standard cockpit with 5+ cockpit-related slots: ${standardCockpit5Slots}`);
