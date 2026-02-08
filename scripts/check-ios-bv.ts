/**
 * Compare IOS weapon BV values against base weapon BV to check if IOS penalty is pre-applied.
 */
import * as fs from 'fs';

const missile = JSON.parse(fs.readFileSync('public/data/equipment/official/weapons/missile.json', 'utf8'));

const iosItems = missile.items.filter((item: any) => item.id.endsWith('-ios'));

for (const ios of iosItems) {
  // Find base weapon (remove -ios suffix)
  const baseId = ios.id.replace(/-ios$/, '');
  const base = missile.items.find((item: any) => item.id === baseId);
  if (base) {
    const ratio = base.battleValue > 0 ? (ios.battleValue / base.battleValue) : 0;
    console.log(`${ios.id.padEnd(25)} bv=${String(ios.battleValue).padStart(4)}  base=${base.id.padEnd(20)} bv=${String(base.battleValue).padStart(4)}  ratio=${ratio.toFixed(3)}`);
  } else {
    console.log(`${ios.id.padEnd(25)} bv=${String(ios.battleValue).padStart(4)}  BASE NOT FOUND`);
  }
}
