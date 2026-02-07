/**
 * Check what MegaMek includes in defensive BV that we might be missing.
 * Focus on the 2.4% systematic undercalculation on the defensive side.
 */

import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(__dirname, '../validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf-8'));
const unitPathMap = new Map<string, string>();
for (const u of indexData.units) {
  unitPathMap.set(u.id, path.join(unitsDir, u.path));
}

console.log("=== DEFENSIVE BV ASSEMBLY INVESTIGATION ===\n");

// 1. Check for equipment we might be missing as "defensive"
console.log("--- 1. MegaMek Defensive Equipment Types vs Our Detection ---\n");

console.log("MegaMek countsAsDefensiveEquipment():");
console.log("  Weapons:  AMS, B-Pod, M-Pod, Screen Launcher");
console.log("  MiscType: ECM, BAP, Viral Jammer (Decoy/Homing), A-Pod, MASS,");
console.log("            Bridge Layers, Bulldozer, Chaff Pod, HarJel II/III,");
console.log("            Spikes, Minesweeper, Shields");
console.log("");
console.log("Our code detects:");
console.log("  AMS, ECM/Guardian/Angel/Watchdog/NovaCEWS, BAP/Beagle/Bloodhound,");
console.log("  Shields, B-Pod, M-Pod, A-Pod");
console.log("");
console.log("MISSING: Viral Jammer, MASS, Bridge Layer, Bulldozer, Chaff Pod,");
console.log("         Spikes, Minesweeper, Screen Launcher");

// 2. Scan all units for these missing equipment types
console.log("\n--- 2. Scanning All Units for Missing Defensive Equipment ---\n");

const missingEquipCounts: Record<string, { count: number; units: string[] }> = {
  'viral-jammer': { count: 0, units: [] },
  'mass': { count: 0, units: [] },
  'bridge-layer': { count: 0, units: [] },
  'bulldozer': { count: 0, units: [] },
  'chaff-pod': { count: 0, units: [] },
  'spikes': { count: 0, units: [] },
  'minesweeper': { count: 0, units: [] },
  'screen-launcher': { count: 0, units: [] },
};

// Also track all unrecognized equipment in crit slots to find anything we're totally missing
const unknownEquip = new Map<string, number>();

let totalAnalyzed = 0;
for (const valUnit of report.allResults) {
  const unitPath = unitPathMap.get(valUnit.unitId);
  if (!unitPath || !fs.existsSync(unitPath)) continue;
  totalAnalyzed++;

  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    if (!unit.criticalSlots) continue;

    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const slot of slots) {
        if (!slot || typeof slot !== 'string') continue;
        const lo = slot.replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();

        if (lo.includes('viral') && lo.includes('jammer')) {
          missingEquipCounts['viral-jammer'].count++;
          if (!missingEquipCounts['viral-jammer'].units.includes(valUnit.unitId))
            missingEquipCounts['viral-jammer'].units.push(valUnit.unitId);
        }
        if (lo.includes('mass') && !lo.includes('ammo')) {
          // Be careful: "mass" might match other things
          if (lo === 'mass' || lo.includes('mobile field artillery')) {
            missingEquipCounts['mass'].count++;
            if (!missingEquipCounts['mass'].units.includes(valUnit.unitId))
              missingEquipCounts['mass'].units.push(valUnit.unitId);
          }
        }
        if (lo.includes('bridge') && lo.includes('layer')) {
          missingEquipCounts['bridge-layer'].count++;
          if (!missingEquipCounts['bridge-layer'].units.includes(valUnit.unitId))
            missingEquipCounts['bridge-layer'].units.push(valUnit.unitId);
        }
        if (lo.includes('bulldozer')) {
          missingEquipCounts['bulldozer'].count++;
          if (!missingEquipCounts['bulldozer'].units.includes(valUnit.unitId))
            missingEquipCounts['bulldozer'].units.push(valUnit.unitId);
        }
        if (lo.includes('chaff') && lo.includes('pod')) {
          missingEquipCounts['chaff-pod'].count++;
          if (!missingEquipCounts['chaff-pod'].units.includes(valUnit.unitId))
            missingEquipCounts['chaff-pod'].units.push(valUnit.unitId);
        }
        if (lo.includes('spike') && !lo.includes('ammo')) {
          missingEquipCounts['spikes'].count++;
          if (!missingEquipCounts['spikes'].units.includes(valUnit.unitId))
            missingEquipCounts['spikes'].units.push(valUnit.unitId);
        }
        if (lo.includes('minesweeper')) {
          missingEquipCounts['minesweeper'].count++;
          if (!missingEquipCounts['minesweeper'].units.includes(valUnit.unitId))
            missingEquipCounts['minesweeper'].units.push(valUnit.unitId);
        }
        if (lo.includes('screen') && lo.includes('launcher') && !lo.includes('ammo')) {
          missingEquipCounts['screen-launcher'].count++;
          if (!missingEquipCounts['screen-launcher'].units.includes(valUnit.unitId))
            missingEquipCounts['screen-launcher'].units.push(valUnit.unitId);
        }
      }
    }
  } catch (e) { /* skip */ }
}

console.log(`Analyzed ${totalAnalyzed} units.\n`);
console.log("Equipment Type    | Units | Slots");
console.log("------------------|-------|------");
for (const [name, data] of Object.entries(missingEquipCounts)) {
  console.log(`${name.padEnd(17)} | ${String(data.units.length).padStart(5)} | ${String(data.count).padStart(5)}`);
  if (data.units.length > 0 && data.units.length <= 5) {
    for (const u of data.units) console.log(`  → ${u}`);
  }
}

// 3. Check: Does MegaMek add any BV for cockpit type in the DEFENSIVE calculation?
console.log("\n--- 3. Cockpit BV in Defensive Calculation ---\n");
console.log("MegaMek: Cockpit modifier (small=0.95, interface=1.3, etc) is applied to");
console.log("the FINAL BV (defensive + offensive), NOT within the defensive calculation.");
console.log("Our code: Same — getCockpitModifier() applied in calculateTotalBV() line 980.");
console.log("Result: CORRECT. No cockpit BV added inside defensiveBV.");

// 4. Check: Does MegaMek add any BV for heat sinks in defensive?
console.log("\n--- 4. Heat Sinks in Defensive Calculation ---\n");
console.log("MegaMek: NO heat sink BV in processDefensiveEquipment/processDefensiveValue.");
console.log("Heat sinks only affect offensive BV via heat efficiency.");
console.log("Our code: Same — heat sinks only used for heatDissipation in offensive calc.");
console.log("Result: CORRECT.");

// 5. Check for HarJel BV handling - this adds to defensive via armor multiplier
console.log("\n--- 5. HarJel II/III Handling ---\n");

let harjelUnits = 0;
for (const valUnit of report.allResults) {
  const unitPath = unitPathMap.get(valUnit.unitId);
  if (!unitPath || !fs.existsSync(unitPath)) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    if (!unit.criticalSlots) continue;
    for (const slots of Object.values(unit.criticalSlots) as any[]) {
      if (!Array.isArray(slots)) continue;
      for (const slot of slots) {
        if (!slot || typeof slot !== 'string') continue;
        const lo = slot.toLowerCase();
        if (lo.includes('harjel')) { harjelUnits++; break; }
      }
      if (harjelUnits > 0) break;
    }
  } catch (e) {}
}
console.log(`Units with HarJel: ${harjelUnits}`);
console.log("MegaMek: HarJel II/III counted as defensive equipment (F_HARJEL_II/III).");
console.log("Our code: HarJel handled via armor bonus in validate-bv.ts:1167-1186. ✓");

// 6. NOW THE CRITICAL CHECK: Look at specific undercalculated units and trace their defensive BV
console.log("\n--- 6. Tracing Defensive BV for Undercalculated Units ---\n");

// Pick units with simple configurations (no special equipment) to isolate defensive gap
const simpleUnder = report.allResults
  .filter((u: any) => u.percentDiff < -1.5 && u.percentDiff > -4 &&
    (u.breakdown?.defensiveEquipBV ?? 0) === 0 &&
    (u.breakdown?.explosivePenalty ?? 0) === 0)
  .slice(0, 10);

console.log(`Simple undercalculated units (no def equip, no explosive penalty): ${simpleUnder.length}\n`);

for (const valUnit of simpleUnder.slice(0, 8)) {
  const unitPath = unitPathMap.get(valUnit.unitId);
  if (!unitPath || !fs.existsSync(unitPath)) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

    // Compute expected defensive BV components
    const totalArmor = Object.values(unit.armor?.allocation || {}).reduce((sum: number, v: any) => {
      if (typeof v === 'number') return sum + v;
      return sum + (v.front || 0) + (v.rear || 0);
    }, 0) as number;

    // Standard structure points by tonnage
    const structureByTonnage: Record<number, number> = {
      20: 33, 25: 42, 30: 51, 35: 60, 40: 68, 45: 77, 50: 85, 55: 94,
      60: 102, 65: 111, 70: 119, 75: 128, 80: 136, 85: 145, 90: 153,
      95: 162, 100: 171
    };
    const totalStruct = structureByTonnage[unit.tonnage] || Math.round(unit.tonnage * 1.71);

    const armorBV = totalArmor * 2.5; // assuming standard armor
    const structBV = totalStruct * 1.5; // need engine mult too
    const gyroBV = unit.tonnage * 0.5; // assuming standard gyro

    const defBV = valUnit.breakdown?.defensiveBV ?? 0;
    const offBV = valUnit.breakdown?.offensiveBV ?? 0;

    // Estimate defensive factor from defBV and components
    const rawComponents = armorBV + structBV + gyroBV;
    const estimatedDefFactor = rawComponents > 0 ? defBV / rawComponents : 0;

    console.log(`${valUnit.unitId} (${unit.tonnage}t, ${unit.techBase})`);
    console.log(`  Index: ${valUnit.indexBV}, Calc: ${valUnit.calculatedBV}, Diff: ${valUnit.difference} (${valUnit.percentDiff.toFixed(1)}%)`);
    console.log(`  Def BV: ${defBV.toFixed(1)}, Off BV: ${offBV.toFixed(1)}`);
    console.log(`  Armor: ${totalArmor}pts, Structure: ${totalStruct}pts, Tonnage: ${unit.tonnage}`);
    console.log(`  Engine: ${unit.engine?.type}, Gyro: ${unit.gyro?.type}, Armor type: ${unit.armor?.type}`);
    console.log(`  Raw est: armor=${armorBV.toFixed(0)} + struct=${structBV.toFixed(0)} + gyro=${gyroBV.toFixed(0)} = ${rawComponents.toFixed(0)}`);
    console.log(`  Implied def factor: ${estimatedDefFactor.toFixed(3)}`);
    console.log(`  Walk: ${unit.movement?.walk}, Jump: ${unit.movement?.jump || 0}`);
    console.log('');
  } catch (e) { /* skip */ }
}

// 7. Check if there's a systematic pattern in how our defBV differs
console.log("--- 7. Defensive BV vs Offensive BV Split Analysis ---\n");

// For ALL undercalculated units, check if the gap is consistently in the defensive portion
let defGapCount = 0;
let offGapCount = 0;
let bothGapCount = 0;
let analyzedForSplit = 0;

// We can't directly see MegaMek's def/off split, but we can check our percentages
const undercalcUnits = report.allResults.filter((u: any) => u.percentDiff < -1.5 && u.percentDiff > -5);
console.log(`Undercalculated units in -1.5% to -5% range: ${undercalcUnits.length}`);

// Check if there's a pattern with specific equipment
const equipCounters: Record<string, number> = {};
for (const valUnit of undercalcUnits) {
  const unitPath = unitPathMap.get(valUnit.unitId);
  if (!unitPath || !fs.existsSync(unitPath)) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    if (!unit.criticalSlots) continue;

    const equipSet = new Set<string>();
    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const slot of slots) {
        if (!slot || typeof slot !== 'string') continue;
        const lo = slot.replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
        // Skip structural items
        if (lo.includes('engine') || lo.includes('gyro') || lo.includes('actuator') ||
            lo.includes('shoulder') || lo.includes('hip') || lo.includes('foot') ||
            lo.includes('cockpit') || lo.includes('sensor') || lo.includes('life support') ||
            lo.includes('heat sink') || lo.includes('endo') || lo.includes('ferro') ||
            lo.includes('ammo') || lo.includes('stealth') || lo.includes('case')) continue;
        equipSet.add(lo);
      }
    }
    for (const eq of equipSet) {
      equipCounters[eq] = (equipCounters[eq] ?? 0) + 1;
    }
  } catch (e) {}
}

// Show most common equipment in undercalculated units
const sortedEquip = Object.entries(equipCounters).sort((a, b) => b[1] - a[1]);
console.log("\nMost common equipment in undercalculated units:");
for (const [eq, count] of sortedEquip.slice(0, 20)) {
  console.log(`  ${eq}: ${count} units`);
}
