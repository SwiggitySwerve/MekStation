#!/usr/bin/env npx tsx

const testCases = [
  { input: 'IS Ammo MML-7 SRM', expected: 'mml-7-srm-ammo' },
  { input: 'IS Ammo MML-7 LRM', expected: 'mml-7-lrm-ammo' },
  { input: 'ISRotaryAC2 Ammo', expected: 'rotaryac2' },
  { input: 'ISLBXAC5 CL Ammo', expected: 'lb-5-x-cluster-ammo' },
  { input: 'CLMediumChemLaserAmmo', expected: 'clan-medium-chemical-laser-ammo' },
  { input: 'Clan Heavy Machine Gun Ammo - Half', expected: 'heavy-mg-ammo' },
];

for (const tc of testCases) {
  const clean = tc.input.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\((?:Clan|IS)\)\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '').replace(/\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '').replace(/\|.*/g, '').trim();
  const lo = clean.toLowerCase();
  const stripped = lo.replace(/\s*\((?:clan|is)\)\s*/g, '').replace(/\s*-\s*(?:full|half|proto)\s*$/g, '').replace(/\s*\(\d+\)\s*$/g, '').trim();
  
  console.log(`Input: "${tc.input}"`);
  console.log(`  clean: "${clean}"`);
  console.log(`  lo: "${lo}"`);
  console.log(`  stripped: "${stripped}"`);
  
  const rules: Array<{ re: RegExp; name: string }> = [
    { re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+srm$/, name: 'mml-srm' },
    { re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+lrm$/, name: 'mml-lrm' },
    { re: /^(?:is\s*)?mml(\d+)\s+srm\s*ammo$/, name: 'mml-srm-2' },
    { re: /^(?:is\s*)?mml(\d+)\s+lrm\s*ammo$/, name: 'mml-lrm-2' },
    { re: /^(?:is\s*)?rotaryac(\d+)\s*ammo$/, name: 'rotary-ac' },
    { re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/, name: 'lbx-cluster' },
    { re: /^cl(?:an)?\s*mediumchemlaser\s*ammo$/, name: 'cl-chem-laser' },
    { re: /^cl(?:an)?\s*heavy\s*machine\s*gun\s*ammo$/, name: 'cl-heavy-mg' },
  ];
  
  let matched = false;
  for (const rule of rules) {
    const m = stripped.match(rule.re);
    if (m) {
      console.log(`  MATCH: ${rule.name} → ${JSON.stringify(m)}`);
      matched = true;
      break;
    }
  }
  if (!matched) console.log(`  NO MATCH`);
  console.log();
}
