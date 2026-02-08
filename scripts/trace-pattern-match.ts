#!/usr/bin/env npx tsx
/**
 * Quick test: does the regex pattern match "is ammo srm-6"?
 */
const testPatterns: Array<[RegExp, string]> = [
  [/^(?:is\s*)?ammo\s+srm-(\d+)$/, 'is ammo srm-6'],
  [/^(?:is\s*)?ammo\s+lrm-(\d+)$/, 'is ammo lrm-15'],
  [/^(?:is\s*)?ammo\s+ac[/-](\d+)$/, 'is ammo ac/10'],
  [/^cl(?:an)?\s*mediumchemlaser\s*ammo$/, 'clmediumchemlaserammo'],
  [/^(?:is\s*)?plasmarifle?\s*ammo$/, 'isplasmarifleammo'],
  [/^(?:is\s*)?gauss\s*ammo$/, 'isgauss ammo'],
  [/^(?:is\s*)?gauss\s*ammo$/, 'isgaussammo'],
  [/^cl(?:an)?\s*gauss\s*ammo$/, 'clan gauss ammo'],
  [/^cl(?:an)?\s*streaksrm(\d+)\s*ammo$/, 'clan streak srm 6 ammo'],
  [/^cl(?:an)?\s*streak\s*srm\s*(\d+)\s*ammo$/, 'clan streak srm 6 ammo'],
  [/^cl(?:an)?\s*ultraac(\d+)\s*ammo$/, 'clan ultra ac/10 ammo'],
  [/^cl(?:an)?\s*ultra\s*ac[/-](\d+)\s*ammo$/, 'clan ultra ac/10 ammo'],
  [/^(?:is\s*)?rotaryac(\d+)\s*ammo$/, 'isrotaryac5 ammo'],
  [/^(?:is\s*)?ams\s*ammo$/, 'isams ammo'],
  [/^(?:is\s*)?heavy\s*gauss\s*ammo$/, 'isheavygauss ammo'],
  [/^hag[/-](\d+)\s*ammo$/, 'hag/20 ammo'],
  [/^cl(?:an)?\s*apgaussrifle\s*ammo$/, 'clapgaussrifle ammo'],
  [/^(?:is\s*)?ammo\s+lrm-(\d+)$/, 'is ammo lrm-15 artemis-capable'],
  [/^cl(?:an)?\s*ammo\s+lrm-(\d+)$/, 'clan ammo lrm-15'],
  [/^cl(?:an)?\s*ammo\s+srm-(\d+)$/, 'clan ammo srm-6'],
  [/^(?:is\s*)?(?:light\s*)?mg\s*ammo$/, 'is ammo mg - full'],
  [/^(?:is\s*)?ammo\s+mg$/, 'is ammo mg - full'],
  [/^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/, 'clan lb 10-x ac ammo'],
  [/^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/, 'clan lb 10-x cluster ammo'],
];

for (const [re, input] of testPatterns) {
  const m = input.match(re);
  console.log(`${m ? 'MATCH' : 'MISS '}  ${re.source.padEnd(55).slice(0, 55)}  tested against "${input}"`);
}
