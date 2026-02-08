import * as fs from 'fs';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json','utf8'));
console.log('Keys:', Object.keys(r).join(', '));
for (const k of Object.keys(r)) {
  const v = r[k];
  if (Array.isArray(v)) console.log(`  ${k}: array length ${v.length}`);
  else if (typeof v === 'object' && v !== null) console.log(`  ${k}: object with keys [${Object.keys(v).join(', ')}]`);
  else console.log(`  ${k}: ${typeof v} = ${v}`);
}
