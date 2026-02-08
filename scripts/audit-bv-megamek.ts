#!/usr/bin/env npx tsx
// Compare our weapon catalog BV values against MegaMek Java source
import * as fs from 'fs';
import * as path from 'path';

const MEGAMEK_WEAPONS = 'E:/Projects/megamek/megamek/src/megamek/common/weapons';

// Extract BV from a Java weapon file
function extractBV(filePath: string): { bv: number | null; internalName: string | null; heat: number | null } {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find bv assignment
  const bvMatch = content.match(/(?:this\.)?bv\s*=\s*(\d+)/);
  const bv = bvMatch ? parseInt(bvMatch[1]) : null;

  // Find internal name
  const nameMatch = content.match(/setInternalName\(\s*"([^"]+)"\s*\)/);
  const internalName = nameMatch ? nameMatch[1] : null;

  // Find heat
  const heatMatch = content.match(/(?:this\.)?heat\s*=\s*(\d+)/);
  const heat = heatMatch ? parseInt(heatMatch[1]) : null;

  return { bv, internalName, heat };
}

// Walk directory recursively
function walkDir(dir: string, callback: (f: string) => void) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip battle armor, infantry, unofficial
      if (['battleArmor', 'infantry', 'unofficial', 'handlers', 'attacks', 'prototypes'].includes(entry.name)) continue;
      walkDir(fullPath, callback);
    } else if (entry.name.endsWith('.java') && !entry.name.includes('Handler') && !entry.name.includes('Helper') && !entry.name.includes('Weapon.java')) {
      callback(fullPath);
    }
  }
}

// Load all MegaMek weapon BVs
const megamekWeapons: Map<string, { bv: number; heat: number | null; file: string }> = new Map();

walkDir(MEGAMEK_WEAPONS, (filePath) => {
  const { bv, internalName, heat } = extractBV(filePath);
  if (bv !== null && internalName) {
    megamekWeapons.set(internalName.toLowerCase(), { bv, heat, file: filePath });
  }
});

console.log(`Loaded ${megamekWeapons.size} MegaMek weapons with BV values`);

// Load our catalogs
const catalogs = ['energy.json', 'ballistic.json', 'missile.json'];
const ourWeapons: { id: string; bv: number; heat: number; file: string }[] = [];

for (const cat of catalogs) {
  const fp = path.resolve('public/data/equipment/official/weapons', cat);
  if (!fs.existsSync(fp)) continue;
  const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  for (const item of data.items) {
    ourWeapons.push({ id: item.id, bv: item.battleValue, heat: item.heat, file: cat });
  }
}

console.log(`Loaded ${ourWeapons.length} catalog weapons`);

// Build name mapping from our IDs to MegaMek internal names
const idToMegamek: Record<string, string> = {
  'small-laser': 'issmalllaser',
  'medium-laser': 'ismediumlaser',
  'large-laser': 'islargelaser',
  'er-small-laser': 'isersmalllaser',
  'er-medium-laser': 'isermediumlaser',
  'er-large-laser': 'iserlargelaser',
  'small-pulse-laser': 'issmallpulselaser',
  'medium-pulse-laser': 'ismediumpulselaser',
  'large-pulse-laser': 'islargepulselaser',
  'ppc': 'isppc',
  'er-ppc': 'iserppc',
  'flamer': 'isflamer',
  'heavy-ppc': 'isheavyppc',
  'light-ppc': 'islightppc',
  'snub-nose-ppc': 'issnubnose ppc',
  'clan-er-small-laser': 'clersmall',
  'clan-er-medium-laser': 'clermediumlaser',
  'clan-er-large-laser': 'clerlargelaser',
  'clan-small-pulse-laser': 'clsmallpulselaser',
  'clan-medium-pulse-laser': 'clmediumpulselaser',
  'clan-large-pulse-laser': 'cllargepulselaser',
  'clan-er-ppc': 'clerppc',
  'ac-2': 'isac2',
  'ac-5': 'isac5',
  'ac-10': 'isac10',
  'ac-20': 'isac20',
  'uac-2': 'isultraac2',
  'uac-5': 'isultraac5',
  'uac-10': 'isultraac10',
  'uac-20': 'isultraac20',
  'lb-2-x-ac': 'islbxac2',
  'lb-5-x-ac': 'islbxac5',
  'lb-10-x-ac': 'islbxac10',
  'lb-20-x-ac': 'islbxac20',
  'clan-uac-2': 'clultraac2',
  'clan-uac-5': 'clultraac5',
  'clan-uac-10': 'clultraac10',
  'clan-uac-20': 'clultraac20',
  'clan-lb-2-x-ac': 'cllbxac2',
  'clan-lb-5-x-ac': 'cllbxac5',
  'clan-lb-10-x-ac': 'cllbxac10',
  'clan-lb-20-x-ac': 'cllbxac20',
  'gauss-rifle': 'isgaussrifle',
  'light-gauss-rifle': 'islightgaussrifle',
  'heavy-gauss-rifle': 'isheavygaussrifle',
  'clan-gauss-rifle': 'clgaussrifle',
  'rac-2': 'israc2',
  'rac-5': 'israc5',
  'machine-gun': 'ismg',
  'light-machine-gun': 'islightmg',
  'heavy-machine-gun': 'isheavymg',
  'clan-machine-gun': 'clmg',
  'clan-light-machine-gun': 'cllightmg',
  'clan-heavy-machine-gun': 'clheavymg',
  'lrm-5': 'islrm5',
  'lrm-10': 'islrm10',
  'lrm-15': 'islrm15',
  'lrm-20': 'islrm20',
  'srm-2': 'issrm2',
  'srm-4': 'issrm4',
  'srm-6': 'issrm6',
  'streak-srm-2': 'isstreaksrm2',
  'streak-srm-4': 'isstreaksrm4',
  'streak-srm-6': 'isstreaksrm6',
  'clan-lrm-5': 'cllrm5',
  'clan-lrm-10': 'cllrm10',
  'clan-lrm-15': 'cllrm15',
  'clan-lrm-20': 'cllrm20',
  'clan-srm-2': 'clsrm2',
  'clan-srm-4': 'clsrm4',
  'clan-srm-6': 'clsrm6',
  'clan-streak-srm-2': 'clstreaksrm2',
  'clan-streak-srm-4': 'clstreaksrm4',
  'clan-streak-srm-6': 'clstreaksrm6',
  'clan-atm-3': 'clatm3',
  'clan-atm-6': 'clatm6',
  'clan-atm-9': 'clatm9',
  'clan-atm-12': 'clatm12',
  'mrm-10': 'ismrm10',
  'mrm-20': 'ismrm20',
  'mrm-30': 'ismrm30',
  'mrm-40': 'ismrm40',
  'mml-3': 'ismml3',
  'mml-5': 'ismml5',
  'mml-7': 'ismml7',
  'mml-9': 'ismml9',
  'narc-launcher': 'isnarc',
  'clan-narc-launcher': 'clnarc',
  'arrow-iv-launcher': 'isarrowiv',
  'clan-arrow-iv-launcher': 'clarrowiv',
  'plasma-rifle': 'isplasmarifle',
  'clan-plasma-cannon': 'clplasmacannon',
  'er-flamer': 'iserflamer',
  'clan-er-flamer': 'clerflamer',
  'clan-flamer': 'clflamer',
  'heavy-flamer': 'isheavyflamer',
  'clan-heavy-flamer': 'clheavyflamer',
  'small-heavy-laser': 'isheavysmalllaser',
  'medium-heavy-laser': 'isheavymediumlaser',
  'large-heavy-laser': 'isheavylargelaser',
};

// Try to match and compare
console.log('\n=== BV MISMATCHES ===');
let mismatches = 0;
let matched = 0;
let unmatched = 0;

for (const w of ourWeapons) {
  const mmKey = idToMegamek[w.id];
  if (!mmKey) {
    // Try direct lookup
    const direct = megamekWeapons.get(w.id.toLowerCase());
    if (!direct) {
      unmatched++;
      continue;
    }
    if (direct.bv !== w.bv) {
      console.log(`${w.id.padEnd(35)} ours=${w.bv} megamek=${direct.bv} diff=${direct.bv - w.bv} (${w.file})`);
      mismatches++;
    } else {
      matched++;
    }
    continue;
  }

  const mmWeapon = megamekWeapons.get(mmKey.toLowerCase());
  if (!mmWeapon) {
    unmatched++;
    continue;
  }

  if (mmWeapon.bv !== w.bv) {
    console.log(`${w.id.padEnd(35)} ours=${w.bv} megamek=${mmWeapon.bv} diff=${mmWeapon.bv - w.bv} (${w.file})`);
    mismatches++;
  } else {
    matched++;
  }
}

console.log(`\nMatched: ${matched}, Mismatches: ${mismatches}, Unmatched: ${unmatched}`);
