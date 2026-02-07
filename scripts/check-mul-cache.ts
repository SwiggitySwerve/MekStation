import * as fs from 'fs';
const cache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const targets = ['vulture-prime', 'vulture-b', 'gladiator-a', 'gladiator-f', 'jenner-jr7-d-webster', 'jenner-jr10-x', 'man-o-war-e', 'man-o-war-conal', 'loki-prime', 'loki-a', 'thunderbolt-tdr-5l', 'thunderbolt-c', 'hatamoto-chi-htm-27t-lowenbrau', 'hatamoto-chi-htm-26t'];
for (const id of targets) {
  const entry = cache.entries?.[id];
  console.log(`${id}: ${JSON.stringify(entry)}`);
}
