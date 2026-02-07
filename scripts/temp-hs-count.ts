#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'));

let mismatchCount = 0;
const mismatches: string[] = [];

for (const iu of indexData.units) {
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  if (!ud.criticalSlots) continue;
  
  const isDHS = ud.heatSinks.type.includes('DOUBLE');
  const declaredCount = ud.heatSinks.count;
  
  let critHSCount = 0;
  for (const [loc, slots] of Object.entries(ud.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    const seen = new Set<number>();
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i] as string | null;
      if (!slot) continue;
      const lo = slot.toLowerCase().replace(/\s*\(omnipod\)/gi, '');
      if (lo.includes('heat sink') || lo.includes('heatsink')) {
        if (!seen.has(i)) {
          critHSCount++;
          seen.add(i);
          if (isDHS) {
            if (i + 1 < slots.length && slots[i+1] && (slots[i+1] as string).toLowerCase().replace(/\s*\(omnipod\)/gi, '').includes('heat sink')) seen.add(i+1);
            if (i + 2 < slots.length && slots[i+2] && (slots[i+2] as string).toLowerCase().replace(/\s*\(omnipod\)/gi, '').includes('heat sink')) seen.add(i+2);
          }
        }
      }
    }
  }
  
  const engineRating = ud.engine?.rating || 0;
  const freeHS = Math.floor(engineRating / 25);
  const totalHS = critHSCount + freeHS;
  
  if (totalHS !== declaredCount && Math.abs(totalHS - declaredCount) >= 2) {
    mismatchCount++;
    if (mismatches.length < 10) {
      mismatches.push(`${iu.chassis} ${iu.model}: declared=${declaredCount} crit=${critHSCount} free=${freeHS} total=${totalHS} type=${ud.heatSinks.type}`);
    }
  }
}

console.log(`Heat sink count mismatches (diff >= 2): ${mismatchCount}`);
for (const m of mismatches) console.log(`  ${m}`);
