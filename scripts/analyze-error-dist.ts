import * as fs from 'fs';
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json','utf8'));
const valid = r.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const off = valid.filter((x: any) => Math.abs(x.percentDiff) > 1);
console.log('Off >1%: ' + off.length + ' (' + off.filter((x:any) => x.percentDiff < 0).length + ' under, ' + off.filter((x:any) => x.percentDiff > 0).length + ' over)');
console.log('1-2%: ' + off.filter((x:any) => Math.abs(x.percentDiff) <= 2).length);
console.log('2-3%: ' + off.filter((x:any) => Math.abs(x.percentDiff) > 2 && Math.abs(x.percentDiff) <= 3).length);
console.log('3-5%: ' + off.filter((x:any) => Math.abs(x.percentDiff) > 3 && Math.abs(x.percentDiff) <= 5).length);
console.log('5-10%: ' + off.filter((x:any) => Math.abs(x.percentDiff) > 5 && Math.abs(x.percentDiff) <= 10).length);
console.log('>10%: ' + off.filter((x:any) => Math.abs(x.percentDiff) > 10).length);
// avg BV gap for 1-2% group
const g12 = off.filter((x:any) => Math.abs(x.percentDiff) <= 2);
console.log('\n1-2% avg gap: ' + (g12.reduce((s:number, x:any) => s + Math.abs(x.difference), 0) / g12.length).toFixed(1) + ' BV');
const g12u = g12.filter((x:any) => x.percentDiff < 0);
const g12o = g12.filter((x:any) => x.percentDiff > 0);
console.log('  1-2% under: ' + g12u.length + ' (avg ' + (g12u.reduce((s:number,x:any) => s+Math.abs(x.difference),0)/g12u.length).toFixed(1) + ' BV)');
console.log('  1-2% over: ' + g12o.length + ' (avg ' + (g12o.reduce((s:number,x:any) => s+Math.abs(x.difference),0)/g12o.length).toFixed(1) + ' BV)');

// For 1-2% undercalculated: what breakdown components differ most from correct units?
console.log('\n=== 1-2% UNDER: breakdown analysis ===');
const exact = valid.filter((x:any) => Math.abs(x.percentDiff) <= 1);
function avg(arr: any[], f: string): number {
  const v = arr.map((x:any) => x.breakdown?.[f]).filter((v:any) => v !== undefined && v !== null);
  return v.length ? v.reduce((s:number,v:number) => s+v, 0) / v.length : 0;
}
const fields = ['weaponBV','rawWeaponBV','halvedWeaponBV','ammoBV','weightBonus','offEquipBV','speedFactor','heatEfficiency','heatDissipation','moveHeat','defensiveFactor','defEquipBV','explosivePenalty','cockpitModifier'];
console.log('Field'.padEnd(22) + 'Exact'.padStart(10) + '1-2%U'.padStart(10) + '1-2%O'.padStart(10));
for (const f of fields) {
  console.log(f.padEnd(22) + avg(exact,f).toFixed(1).padStart(10) + avg(g12u,f).toFixed(1).padStart(10) + avg(g12o,f).toFixed(1).padStart(10));
}

// Check for unresolved weapons in 1-2% under group
let unresolvedCount = 0;
let withUnresolved = 0;
for (const u of g12u) {
  const issues = u.issues || [];
  const unres = issues.filter((i: string) => i.includes('Unresolved'));
  if (unres.length > 0) { withUnresolved++; unresolvedCount += unres.length; }
}
console.log('\n1-2% under with unresolved weapons: ' + withUnresolved + '/' + g12u.length + ' (' + unresolvedCount + ' total unresolved)');

// Show sample of 1-2% under with issues
console.log('\n=== SAMPLE 1-2% UNDERCALCULATED (first 10) ===');
for (const u of g12u.slice(0, 10)) {
  const b = u.breakdown;
  console.log(`${u.unitId} gap=${u.difference} (${u.percentDiff.toFixed(1)}%) wBV=${b?.weaponBV?.toFixed(0)} rawW=${b?.rawWeaponBV?.toFixed(0)} halvd=${b?.halvedWeaponBV?.toFixed(0)} ammo=${b?.ammoBV} he=${b?.heatEfficiency} sf=${b?.speedFactor}`);
  if (u.issues?.length > 0) console.log('  issues: ' + u.issues.join('; '));
}
