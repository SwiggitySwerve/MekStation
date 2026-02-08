#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(basePath, 'index.json'), 'utf-8'));

for (const iu of indexData.units) {
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  
  const allSlots = ud.criticalSlots ? Object.entries(ud.criticalSlots) : [];
  const aesLocs: string[] = [];
  for (const [loc, slots] of allSlots) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (s && typeof s === 'string' && s.toLowerCase().includes('aes')) {
        if (!aesLocs.includes(loc)) aesLocs.push(loc);
      }
    }
  }
  if (aesLocs.length === 0) continue;
  
  const physWeapons: string[] = [];
  const armWeapons: string[] = [];
  for (const [loc, slots] of allSlots) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.toLowerCase();
      if (lo.includes('hatchet') || lo.includes('sword') || lo.includes('mace') || lo.includes('claw') || lo.includes('retractable blade') || lo.includes('lance') || lo.includes('talon') || lo.includes('buzzsaw')) {
        physWeapons.push(`${s}@${loc}`);
      }
    }
  }
  
  for (const eq of ud.equipment || []) {
    const eqLoc = eq.location?.toUpperCase() || '';
    if (aesLocs.some(l => eqLoc.includes(l.replace(/[_\s]/g, '')))) {
      armWeapons.push(`${eq.id}@${eq.location}`);
    }
  }
  
  console.log(`${iu.chassis} ${iu.model} (${iu.techBase}): AES in ${aesLocs.join(',')} | phys: ${physWeapons.join('; ')} | arm weapons: ${armWeapons.join('; ')}`);
}
