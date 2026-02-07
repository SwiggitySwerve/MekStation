import * as fs from 'fs';
import * as path from 'path';

interface ValidationReport {
  summary: any;
  allResults: Array<{
    unitId: string;
    chassis: string;
    model: string;
    tonnage: number;
    indexBV: number;
    calculatedBV: number;
    difference: number;
    percentDiff: number;
    status: string;
    breakdown?: any;
  }>;
}

interface UnitIndex {
  version: string;
  generatedAt: string;
  totalUnits: number;
  units: Array<{
    id: string;
    path: string;
    chassis: string;
    model: string;
    tonnage: number;
    role?: string;
    techBase?: string;
    year?: number;
  }>;
}

interface Unit {
  id: string;
  name: string;
  tonnage: number;
  walkMP?: number;
  runMP?: number;
  jumpMP?: number;
  engine?: {
    type?: string;
    rating?: number;
  };
  armor?: {
    type?: string;
  };
  structure?: {
    type?: string;
  };
  equipment?: Array<{
    id: string;
    name?: string;
    location?: string;
    quantity?: number;
  }>;
  criticals?: {
    [location: string]: Array<{
      slot: number;
      id?: string;
      name?: string;
      type?: string;
    }>;
  };
}

const TARGET_UNITS = [
  'barghest-bgs-4t',
  'revenant-ubm-2r4',
  'tessen-tsn-c3',
  'tessen-tsn-1cr',
  'raven-rvn-4lc'
];

function main() {
  console.log('=== C3 Slave Undercalculation Investigation ===\n');

  // Load validation report
  const reportPath = path.join(process.cwd(), 'validation-output', 'bv-validation-report.json');
  const report: ValidationReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

  // Load unit index
  const indexPath = path.join(process.cwd(), 'public', 'data', 'units', 'battlemechs', 'index.json');
  const index: UnitIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

  for (const unitId of TARGET_UNITS) {
    console.log('\n' + '='.repeat(80));
    console.log(`UNIT: ${unitId}`);
    console.log('='.repeat(80) + '\n');

    // Find in validation report
    const validationResult = report.allResults.find(r => r.unitId === unitId);
    if (!validationResult) {
      console.log(`ERROR: Unit ${unitId} not found in validation report`);
      continue;
    }

    // Find in index
    const indexEntry = index.units.find(u => u.id === unitId);
    if (!indexEntry) {
      console.log(`ERROR: Unit ${unitId} not found in index`);
      continue;
    }

    // Load unit JSON
    const unitPath = path.join(process.cwd(), 'public', 'data', 'units', 'battlemechs', indexEntry.path);
    let unit: Unit;
    try {
      unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    } catch (err) {
      console.log(`ERROR: Could not load unit from ${unitPath}`);
      console.log(err);
      continue;
    }

    // Show BV gap
    console.log('--- BV GAP ---');
    console.log(`Reference BV (indexBV): ${validationResult.indexBV}`);
    console.log(`Calculated BV: ${validationResult.calculatedBV}`);
    console.log(`Difference: ${validationResult.difference}`);
    console.log(`Percent Diff: ${validationResult.percentDiff.toFixed(2)}%`);
    console.log();

    // Show unit specs
    console.log('--- UNIT SPECS ---');
    console.log(`Tonnage: ${unit.tonnage}`);
    console.log(`Walk MP: ${unit.walkMP || 'N/A'}`);
    console.log(`Run MP: ${unit.runMP || 'N/A'}`);
    console.log(`Jump MP: ${unit.jumpMP || 0}`);
    console.log(`Engine Type: ${unit.engine?.type || 'N/A'}`);
    console.log(`Engine Rating: ${unit.engine?.rating || 'N/A'}`);
    console.log(`Armor Type: ${unit.armor?.type || 'Standard'}`);
    console.log(`Structure Type: ${unit.structure?.type || 'Standard'}`);
    console.log();

    // Show breakdown from validation report
    console.log('--- BV BREAKDOWN (from validation report) ---');
    if (validationResult.breakdown) {
      console.log(JSON.stringify(validationResult.breakdown, null, 2));
    } else {
      console.log('No breakdown available');
    }
    console.log();

    // Check equipment for C3
    console.log('--- EQUIPMENT (ALL) ---');
    if (unit.equipment && unit.equipment.length > 0) {
      const hasC3Equipment = unit.equipment.some(eq =>
        eq.id.toLowerCase().includes('c3') ||
        (eq.name && eq.name.toLowerCase().includes('c3'))
      );
      console.log(`Has C3 in equipment array: ${hasC3Equipment ? 'YES' : 'NO'}`);
      console.log();

      unit.equipment.forEach((eq, idx) => {
        const isC3 = eq.id.toLowerCase().includes('c3') ||
                     (eq.name && eq.name.toLowerCase().includes('c3'));
        const marker = isC3 ? ' <<< C3 EQUIPMENT' : '';
        console.log(`[${idx}] ${eq.id}${marker}`);
        console.log(`    Name: ${eq.name || 'N/A'}`);
        console.log(`    Location: ${eq.location || 'N/A'}`);
        console.log(`    Quantity: ${eq.quantity || 1}`);
      });
    } else {
      console.log('No equipment array found');
    }
    console.log();

    // Show HEAD critical slots (to check small cockpit detection)
    console.log('--- HEAD CRITICAL SLOTS ---');
    if (unit.criticalSlots && unit.criticalSlots.HEAD) {
      const headSlots = unit.criticalSlots.HEAD;
      headSlots.forEach((slot, idx) => {
        console.log(`  [${idx}] ${slot || 'null'}`);
      });
      const lsCount = headSlots.filter((s: string | null) => s && s.includes('Life Support')).length;
      const slot4 = headSlots[3];
      const hasC3 = headSlots.some((s: string | null) => s && s.toLowerCase().includes('c3'));
      console.log(`  Life Support count: ${lsCount}`);
      console.log(`  Slot 4 (index 3): ${slot4 || 'null'}`);
      console.log(`  Has C3: ${hasC3 ? 'YES' : 'NO'}`);
      console.log(`  Small cockpit detection would trigger: ${slot4 && slot4.includes('Sensors') && lsCount === 1 ? 'YES' : 'NO'}`);
    } else {
      console.log('No HEAD critical slots found');
    }
    console.log();

    // Show C3 critical slots
    console.log('--- C3 CRITICAL SLOTS (all locations) ---');
    if (unit.criticalSlots) {
      let foundC3Crits = false;
      for (const [location, slots] of Object.entries(unit.criticalSlots)) {
        const c3Slots = (slots as any[]).map((slot, idx) => ({idx, slot})).filter(({slot}) => {
          if (!slot) return false;
          return slot.toLowerCase().includes('c3');
        });

        if (c3Slots.length > 0) {
          foundC3Crits = true;
          console.log(`Location: ${location}`);
          c3Slots.forEach(({idx, slot}) => {
            console.log(`  [${idx}] ${slot}`);
          });
        }
      }
      if (!foundC3Crits) {
        console.log('No C3 critical slots found');
      }
    } else {
      console.log('No criticals data found');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Investigation complete');
  console.log('='.repeat(80));
}

main();
