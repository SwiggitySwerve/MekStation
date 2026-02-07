#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { calculateTMM, calculateDefensiveBV } from '../src/utils/construction/battleValueCalculations';

const basePath = './public/data/units/battlemechs';
const data = JSON.parse(fs.readFileSync('./validation-output/bv-validation-report.json', 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf8'));

function getUnitPath(unitId: string): string | null {
  const entry = index.units.find((u: any) => u.id === unitId);
  return entry ? path.join(basePath, entry.path) : null;
}

function readUnit(unitId: string): any | null {
  const p = getUnitPath(unitId);
  if (!p || !fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Pick 5 diverse units from within5 category with different movement profiles
const unitIds = ['turkina-t', 'stinger-stg-6s', 'charger-cgr-1x1', 'goliath-gol-3l', 'osteon-d'];

function mpToTMM(mp: number): number {
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

for (const id of unitIds) {
  const unitData = readUnit(id);
  if (!unitData) { console.log(`${id}: unit data not found`); continue; }
  const result = data.allResults.find((r: any) => r.unitId === id);
  if (!result) { console.log(`${id}: not found in results`); continue; }

  const walk = unitData.movement?.walk || 0;
  const jump = unitData.movement?.jump || 0;
  const ton = unitData.tonnage;

  // Check for MASC/SC/TSM
  const equipment = unitData.equipment || [];
  const hasMASC = equipment.some((e: any) => e.id.toLowerCase().includes('masc') && !e.id.toLowerCase().includes('ammo'));
  const hasSC = equipment.some((e: any) => e.id.toLowerCase().includes('supercharger'));
  const hasTSM = equipment.some((e: any) => e.id.toLowerCase().includes('tsm') || e.id.toLowerCase().includes('triple-strength'));

  let bvWalk = walk;
  if (hasTSM) bvWalk = walk + 1;

  let runMP: number;
  if (hasMASC && hasSC) runMP = Math.ceil(bvWalk * 2.5);
  else if (hasMASC || hasSC) runMP = bvWalk * 2;
  else runMP = Math.ceil(bvWalk * 1.5);

  const runTMM = mpToTMM(runMP);
  const jumpTMM = jump > 0 ? mpToTMM(jump) + 1 : 0;
  const maxTMM = Math.max(runTMM, jumpTMM);
  const defensiveFactor = 1 + maxTMM / 10.0;

  const ourTMM = calculateTMM(runMP, jump);

  console.log(`\n=== ${id} (${ton}t, ${unitData.techBase}) ===`);
  console.log(`  Walk: ${walk}, BVWalk: ${bvWalk}, Run: ${runMP}, Jump: ${jump}`);
  console.log(`  Run TMM: ${runTMM}, Jump TMM (with +1): ${jumpTMM}`);
  console.log(`  Max TMM: ${maxTMM} => Defensive Factor: ${defensiveFactor}`);
  console.log(`  Our calculateTMM(${runMP}, ${jump}): ${ourTMM}`);
  console.log(`  Index BV: ${result.indexBV}, Calc BV: ${result.calculatedBV}, Diff: ${result.percentDiff?.toFixed(2)}%`);
  console.log(`  Breakdown - DefBV: ${result.breakdown?.defensiveBV?.toFixed(2)}, SF: ${result.breakdown?.speedFactor}`);
  if (hasMASC || hasSC || hasTSM) {
    console.log(`  Special equipment: MASC=${hasMASC}, SC=${hasSC}, TSM=${hasTSM}`);
  }
}

// Systematic analysis: check if TMM/defensiveFactor difference could explain the ~2.4% gap
console.log('\n\n=== SYSTEMATIC PATTERN ANALYSIS ===');
const within1 = data.allResults.filter((r: any) => r.status === 'within1' && r.status !== 'exact');
const within5undercalc = data.allResults.filter((r: any) => r.status === 'within5' && r.percentDiff < -1);
const within5overcalc = data.allResults.filter((r: any) => r.status === 'within5' && r.percentDiff > 1);

console.log(`Within 1%: ${within1.length}`);
console.log(`Within 5% undercalculating: ${within5undercalc.length}`);
console.log(`Within 5% overcalculating: ${within5overcalc.length}`);

// For undercalculating units, what's the TMM distribution?
let tmmCounts: Record<number, { count: number, totalPctDiff: number }> = {};
for (const r of within5undercalc) {
  const ud = readUnit(r.unitId);
  if (!ud) continue;
  const walk = ud.movement?.walk || 0;
  const jump = ud.movement?.jump || 0;
  const eq = ud.equipment || [];
  const hasMASC2 = eq.some((e: any) => e.id.toLowerCase().includes('masc') && !e.id.toLowerCase().includes('ammo'));
  const hasSC2 = eq.some((e: any) => e.id.toLowerCase().includes('supercharger'));
  const hasTSM2 = eq.some((e: any) => e.id.toLowerCase().includes('tsm') || e.id.toLowerCase().includes('triple-strength'));
  let bw = walk;
  if (hasTSM2) bw += 1;
  let rmp: number;
  if (hasMASC2 && hasSC2) rmp = Math.ceil(bw * 2.5);
  else if (hasMASC2 || hasSC2) rmp = bw * 2;
  else rmp = Math.ceil(bw * 1.5);

  const tmm = calculateTMM(rmp, jump);
  if (!tmmCounts[tmm]) tmmCounts[tmm] = { count: 0, totalPctDiff: 0 };
  tmmCounts[tmm].count++;
  tmmCounts[tmm].totalPctDiff += r.percentDiff;
}

console.log('\nUndercalculating units by TMM:');
for (const [tmm, data2] of Object.entries(tmmCounts).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  TMM ${tmm}: ${data2.count} units, avg diff: ${(data2.totalPctDiff / data2.count).toFixed(2)}%`);
}
