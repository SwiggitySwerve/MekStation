#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'));
const unitIndex = new Map<string, any>();
for (const iu of indexData.units) unitIndex.set(iu.id, iu);

const nearMiss = report.allResults.filter((r: any) => r.percentDiff >= -2.5 && r.percentDiff < -1.0);
console.log(`Units at -1% to -2.5%: ${nearMiss.length}`);

const hasJJ: Record<string, number> = { yes: 0, no: 0 };
const hasDHS: Record<string, number> = { yes: 0, no: 0 };
const hasTC: Record<string, number> = { yes: 0, no: 0 };
const techBase: Record<string, number> = {};
const armorType: Record<string, number> = {};

for (const r of nearMiss) {
  const iu = unitIndex.get(r.unitId);
  if (!iu) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  
  hasJJ[ud.movement.jump > 0 ? 'yes' : 'no']++;
  hasDHS[ud.heatSinks.type.includes('DOUBLE') ? 'yes' : 'no']++;
  const hasTargComp = ud.equipment?.some((e: any) => e.id.toLowerCase().includes('targeting-computer')) || 
    (ud.criticalSlots && Object.values(ud.criticalSlots).some((slots: any) => Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('targeting computer'))));
  hasTC[hasTargComp ? 'yes' : 'no']++;
  techBase[ud.techBase] = (techBase[ud.techBase] || 0) + 1;
  armorType[ud.armor?.type || 'unknown'] = (armorType[ud.armor?.type || 'unknown'] || 0) + 1;
}

console.log('Tech base:', techBase);
console.log('Has JJ:', hasJJ);
console.log('Has DHS:', hasDHS);
console.log('Has TC:', hasTC);
console.log('Armor type:', armorType);

console.log('\nSample -1% to -2% units with breakdown:');
for (const r of nearMiss.slice(0, 20)) {
  const iu = unitIndex.get(r.unitId);
  if (!iu) continue;
  const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
  const bd = r.breakdown;
  const weapCount = (ud.equipment || []).filter((e: any) => !e.id.toLowerCase().includes('ammo') && !e.id.toLowerCase().includes('targeting') && !e.id.toLowerCase().includes('tsm')).length;
  console.log(`  ${(r.chassis + ' ' + r.model).padEnd(35)} ${r.percentDiff.toFixed(1)}% tech=${ud.techBase.padEnd(5)} ${ud.tonnage}t walk=${ud.movement.walk} jmp=${ud.movement.jump} hs=${ud.heatSinks.count}${ud.heatSinks.type.includes('DOUBLE')?'D':'S'} weps=${weapCount} def=${bd?.defensiveBV?.toFixed(0)} off=${bd?.offensiveBV?.toFixed(0)}`);
}
