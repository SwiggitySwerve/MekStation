const r = require('../validation-output/bv-validation-report.json');

// All units with movement anomalies from boundary analysis
const anoms = [
  'alpha-wolf-a','gladiator-gld-1r-keller','woodsman-d','beowulf-beo-x-7a',
  'doloire-dlr-od','black-lanner-f','celerity-clr-03-oa','charger-c',
  'daedalus-dad-4a','raptor-ii-rpt-3x','ryoken-iii-xp-b','wolfhound-wlf-2x',
  'hachiwara-hca-4u','mantis-mts-l','jade-hawk-jhk-03','linebacker-i',
  'slagmaiden-slg-x','fenris-j','porcupine-prc-1n','scorpion-c',
  'stealth-sth-5x','ti-tsang-tsg-10l','vandal-li-o','vandal-li-oa',
  'vandal-li-ob','volkh-vkh-68','thunder-fox-tft-f11','hellhound-8',
  'amarok-3'
];

console.log('Unit'.padEnd(35) + 'Walk Run  Norm  Ratio    Diff     Status');
console.log('-'.repeat(85));

let mascOver = 0, mascUnder = 0;
for (const id of anoms) {
  const x = r.allResults.find(u => u.unitId === id);
  if (!x) continue;
  const b = x.breakdown;
  const normRun = Math.ceil(b.walkMP * 1.5);
  const ratio = (b.runMP / b.walkMP).toFixed(2);
  const sign = x.difference > 0 ? '+' : '';

  let mascType = '?';
  if (b.runMP === normRun - 1) mascType = 'Hardened';
  else if (b.runMP === b.walkMP * 2) mascType = 'MASC/SC';
  else if (b.runMP === Math.ceil(b.walkMP * 2.5)) mascType = 'MASC+SC';
  else if (b.runMP > normRun) mascType = 'Boosted';
  else mascType = 'Reduced';

  console.log(
    id.padEnd(35) +
    String(b.walkMP).padStart(4) +
    String(b.runMP).padStart(4) +
    String(normRun).padStart(5) +
    ('×' + ratio).padStart(7) +
    (sign + x.percentDiff.toFixed(2) + '%').padStart(9) +
    '  ' + mascType +
    (x.difference > 0 ? ' [OVER]' : ' [UNDER]')
  );

  if (mascType === 'MASC/SC' || mascType === 'MASC+SC' || mascType === 'Boosted') {
    if (x.difference > 0) mascOver++;
    else mascUnder++;
  }
}

console.log(`\nMASC/SC units: ${mascOver} overcalculated, ${mascUnder} undercalculated`);
