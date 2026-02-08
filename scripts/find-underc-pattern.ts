#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf-8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

// Undercalculated 1-5%
const under = report.allResults.filter((r: any) => r.percentDiff < -1 && r.percentDiff > -5);

// Exact matches
const exact = report.allResults.filter((r: any) => r.percentDiff === 0);

// For each group, count tech bases, engine types, armor types, etc.
function analyzeGroup(group: any[], label: string) {
  console.log(`\n=== ${label} (${group.length} units) ===`);

  const techBases: Record<string, number> = {};
  const armorTypes: Record<string, number> = {};
  const engineTypes: Record<string, number> = {};
  const structTypes: Record<string, number> = {};
  const cockpitTypes: Record<string, number> = {};
  const hasJump: number[] = [0, 0]; // [no, yes]
  const hasTSM: number[] = [0, 0];
  const hasMASC: number[] = [0, 0];

  for (const r of group) {
    const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === `${r.chassis} ${r.model}`);
    if (!iu) continue;
    try {
      const fp = path.resolve('public/data/units/battlemechs', iu.path);
      const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));

      techBases[ud.techBase] = (techBases[ud.techBase] || 0) + 1;
      armorTypes[ud.armor.type] = (armorTypes[ud.armor.type] || 0) + 1;
      engineTypes[ud.engine.type] = (engineTypes[ud.engine.type] || 0) + 1;
      structTypes[ud.structure.type] = (structTypes[ud.structure.type] || 0) + 1;
      cockpitTypes[ud.cockpit] = (cockpitTypes[ud.cockpit] || 0) + 1;
      hasJump[ud.movement.jump > 0 ? 1 : 0]++;

      const eqIds = ud.equipment.map((e: any) => e.id.toLowerCase()).join(' ');
      hasTSM[eqIds.includes('tsm') ? 1 : 0]++;
      hasMASC[eqIds.includes('masc') ? 1 : 0]++;
    } catch {}
  }

  console.log('  techBase:', JSON.stringify(techBases));
  console.log('  armor:', JSON.stringify(armorTypes));
  console.log('  engine:', JSON.stringify(engineTypes));
  console.log('  structure:', JSON.stringify(structTypes));
  console.log('  cockpit:', JSON.stringify(cockpitTypes));
  console.log('  jump: no=' + hasJump[0] + ' yes=' + hasJump[1] + ' (' + (hasJump[1] / (hasJump[0] + hasJump[1]) * 100).toFixed(0) + '%)');
  console.log('  TSM: no=' + hasTSM[0] + ' yes=' + hasTSM[1]);
  console.log('  MASC: no=' + hasMASC[0] + ' yes=' + hasMASC[1]);
}

analyzeGroup(under, 'UNDERCALCULATED 1-5%');
analyzeGroup(exact, 'EXACT MATCHES');
