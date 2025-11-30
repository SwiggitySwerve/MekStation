#!/usr/bin/env ts-node
/**
 * Equipment Type Extraction Script
 * 
 * Scans MegaMekLab JSON files to extract all unique equipment item_types.
 * Used to build a comprehensive mapping file.
 * 
 * Usage:
 *   npx ts-node scripts/data-migration/extract-equipment-types.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_DIR = 'data/megameklab_converted_output/mekfiles';

interface EquipmentInfo {
  itemType: string;
  itemName: string;
  techBase: string;
  count: number;
}

function findJsonFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsonFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.includes('UnitVerifier')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function main(): Promise<void> {
  console.log('Extracting equipment types from MegaMekLab files...\n');
  
  const equipmentMap = new Map<string, EquipmentInfo>();
  let totalFiles = 0;
  let totalEquipment = 0;
  
  const jsonFiles = findJsonFiles(SOURCE_DIR);
  console.log(`Found ${jsonFiles.length} JSON files to process\n`);
  
  for (const filePath of jsonFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.weapons_and_equipment) {
        totalFiles++;
        
        for (const item of data.weapons_and_equipment) {
          totalEquipment++;
          
          const key = `${item.item_type}|${item.tech_base}`;
          
          if (equipmentMap.has(key)) {
            const existing = equipmentMap.get(key)!;
            existing.count++;
          } else {
            equipmentMap.set(key, {
              itemType: item.item_type,
              itemName: item.item_name,
              techBase: item.tech_base,
              count: 1,
            });
          }
        }
      }
    } catch {
      // Skip invalid files
    }
  }
  
  // Sort by count (most common first)
  const sorted = Array.from(equipmentMap.values())
    .sort((a, b) => b.count - a.count);
  
  console.log(`Processed ${totalFiles} files with ${totalEquipment} total equipment items\n`);
  console.log(`Found ${sorted.length} unique equipment types:\n`);
  
  // Group by category
  const byCategory: Record<string, EquipmentInfo[]> = {
    'Lasers': [],
    'PPCs': [],
    'Autocannons': [],
    'Gauss': [],
    'Machine Guns': [],
    'LRMs': [],
    'SRMs': [],
    'Other Missiles': [],
    'Heat Sinks': [],
    'Jump Jets': [],
    'Equipment': [],
    'Ammo': [],
    'Unknown': [],
  };
  
  for (const item of sorted) {
    const type = item.itemType.toLowerCase();
    
    if (type.includes('laser') || type.includes('er ') && type.includes('laser')) {
      byCategory['Lasers'].push(item);
    } else if (type.includes('ppc')) {
      byCategory['PPCs'].push(item);
    } else if (type.includes('ac') || type.includes('autocannon')) {
      byCategory['Autocannons'].push(item);
    } else if (type.includes('gauss') || type.includes('hag')) {
      byCategory['Gauss'].push(item);
    } else if (type.includes('machinegun') || type.includes('machine gun') || type === 'mg') {
      byCategory['Machine Guns'].push(item);
    } else if (type.includes('lrm')) {
      byCategory['LRMs'].push(item);
    } else if (type.includes('srm') || type.includes('streak')) {
      byCategory['SRMs'].push(item);
    } else if (type.includes('mrm') || type.includes('atm') || type.includes('missile') || type.includes('rocket') || type.includes('narc') || type.includes('arrow')) {
      byCategory['Other Missiles'].push(item);
    } else if (type.includes('heatsink') || type.includes('heat sink')) {
      byCategory['Heat Sinks'].push(item);
    } else if (type.includes('jump')) {
      byCategory['Jump Jets'].push(item);
    } else if (type.includes('ammo') || type.includes(' ammo')) {
      byCategory['Ammo'].push(item);
    } else if (type.includes('ecm') || type.includes('bap') || type.includes('probe') || type.includes('tag') || type.includes('c3') || type.includes('ams') || type.includes('case') || type.includes('masc') || type.includes('tsm')) {
      byCategory['Equipment'].push(item);
    } else {
      byCategory['Unknown'].push(item);
    }
  }
  
  // Print by category
  for (const [category, items] of Object.entries(byCategory)) {
    if (items.length === 0) continue;
    
    console.log(`=== ${category} (${items.length}) ===`);
    for (const item of items.slice(0, 50)) { // Limit output
      console.log(`  '${item.itemType}': '???', // ${item.techBase}, ${item.itemName} (x${item.count})`);
    }
    if (items.length > 50) {
      console.log(`  ... and ${items.length - 50} more`);
    }
    console.log('');
  }
  
  // Generate mapping suggestions
  console.log('\n=== SUGGESTED MAPPINGS ===\n');
  console.log('const MEGAMEKLAB_TYPE_MAP: Record<string, string> = {');
  
  for (const item of sorted.slice(0, 100)) {
    const suggestedId = item.itemType
      .replace(/^(IS|CL|Clan)/, '')
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/-+/g, '-');
    
    console.log(`  '${item.itemType}': '${suggestedId}', // ${item.itemName} (x${item.count})`);
  }
  
  console.log('};');
}

main().catch(console.error);

