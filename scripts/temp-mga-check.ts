#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(basePath, 'index.json'), 'utf-8'));

for (const iu of indexData.units) {
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  
  const hasMGAEquip = ud.equipment?.some((eq: any) => {
    const lo = eq.id.toLowerCase();
    return lo.includes('machine-gun-array') || lo === 'ismga' || lo === 'clmga';
  });
  
  const hasMGACrit = ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => 
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && 
      (s.toLowerCase().includes('machine gun array') || s.toLowerCase().includes('mga')))
  );
  
  if (hasMGAEquip || hasMGACrit) {
    const mgaCrits: string[] = [];
    if (ud.criticalSlots) {
      for (const [loc, slots] of Object.entries(ud.criticalSlots)) {
        if (!Array.isArray(slots)) continue;
        for (const s of (slots as any[])) {
          if (s && typeof s === 'string' && (s.toLowerCase().includes('machine gun array') || s.toLowerCase().includes('mga'))) {
            mgaCrits.push(`${s}@${loc}`);
          }
        }
      }
    }
    const mgaEquips = (ud.equipment || []).filter((eq: any) => {
      const lo = eq.id.toLowerCase();
      return lo.includes('machine-gun-array') || lo === 'ismga' || lo === 'clmga';
    }).map((eq: any) => `${eq.id}@${eq.location}`);
    
    const mgEquips = (ud.equipment || []).filter((eq: any) => {
      const lo = eq.id.toLowerCase();
      return (lo.includes('machine-gun') || lo.includes('machine gun') || lo === 'mg') && !lo.includes('array') && !lo.includes('ammo');
    }).map((eq: any) => `${eq.id}@${eq.location}`);
    
    console.log(`${iu.chassis} ${iu.model}: crits=[${mgaCrits.join('; ')}] equip=[${mgaEquips.join('; ')}] mgs=[${mgEquips.join('; ')}]`);
  }
}
