#!/usr/bin/env node
/**
 * Extract Equipment Data from MegaMek Java Source Files
 * 
 * Parses MegaMek Java source files to extract equipment definitions
 * and convert them to JSON format matching megamek-web schemas.
 */

const fs = require('fs');
const path = require('path');

const MEGAMEK_DIR = path.join(__dirname, '..', '..', 'megamek', 'megamek', 'src', 'megamek', 'common');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'equipment', 'extracted');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Equipment storage
const extractedEquipment = {
  weapons: {
    energy: [],
    ballistic: [],
    missile: [],
    physical: []
  },
  electronics: [],
  miscellaneous: [],
  ammunition: []
};

/**
 * Convert Java tech base to JSON format
 */
function parseTechBase(techBaseStr) {
  if (!techBaseStr) return 'INNER_SPHERE';
  const upper = techBaseStr.toUpperCase();
  if (upper.includes('CLAN') || upper.includes('CL')) {
    return 'CLAN';
  }
  if (upper.includes('BOTH') || upper.includes('MIXED')) {
    return 'BOTH';
  }
  return 'INNER_SPHERE';
}

/**
 * Parse rules level from tech advancement
 */
function parseRulesLevel(content, techBase) {
  const upper = content.toUpperCase();
  
  // Check for unofficial
  if (upper.includes('.SETUNOFFICIAL(TRUE)') || upper.includes('UNOFFICIAL')) {
    return 'UNOFFICIAL';
  }
  
  // Check for experimental/prototype
  if (upper.includes('PROTOTYPE') || upper.includes('EXPERIMENTAL')) {
    return 'EXPERIMENTAL';
  }
  
  // Check for advanced
  if (upper.includes('ADVANCED') || upper.includes('PRODUCTION')) {
    return 'ADVANCED';
  }
  
  // Check for intro level
  if (upper.includes('.SETINTROLEVEL(TRUE)') || upper.includes('INTRODUCTORY')) {
    return 'INTRODUCTORY';
  }
  
  return 'STANDARD';
}

/**
 * Extract introduction year from tech advancement
 */
function extractIntroductionYear(content, techBase) {
  const isClan = techBase === 'CLAN';
  const pattern = isClan 
    ? /setISAdvancement\([^)]*\)|setClanAdvancement\([^)]*\)/g
    : /setISAdvancement\([^)]*\)/g;
  
  const matches = content.match(pattern);
  if (!matches || matches.length === 0) {
    // Try to find prototype date
    const protoPattern = /setPrototypeFactions|setProductionFactions/;
    if (protoPattern.test(content)) {
      // Look for dates in comments or nearby
      const dateMatch = content.match(/\d{4}/);
      return dateMatch ? parseInt(dateMatch[0]) : null;
    }
    return null;
  }
  
  // Extract first date from advancement call
  const dateMatch = matches[0].match(/\d{4}/);
  return dateMatch ? parseInt(dateMatch[0]) : null;
}

/**
 * Generate kebab-case ID from name
 */
function generateId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Extract weapon data from Java file
 */
function extractWeaponData(filePath, content) {
  const weapon = {
    id: null,
    name: null,
    category: null,
    subType: null,
    techBase: 'INNER_SPHERE',
    rulesLevel: 'STANDARD',
    damage: 0,
    heat: 0,
    ranges: {
      minimum: 0,
      short: 0,
      medium: 0,
      long: 0
    },
    weight: 0,
    criticalSlots: 0,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 2300,
    special: []
  };
  
  // Extract class name to infer tech base
  const classNameMatch = content.match(/public\s+class\s+(\w+)/);
  if (classNameMatch) {
    const className = classNameMatch[1];
    if (className.startsWith('CL') || className.startsWith('Clan')) {
      weapon.techBase = 'CLAN';
    } else if (className.startsWith('IS') || className.startsWith('InnerSphere')) {
      weapon.techBase = 'INNER_SPHERE';
    }
  }
  
  // Extract name
  const nameMatch = content.match(/name\s*=\s*"([^"]+)"/);
  if (nameMatch) {
    weapon.name = nameMatch[1];
    weapon.id = generateId(weapon.name);
  }
  
  // Extract internal name for better ID
  const internalNameMatch = content.match(/setInternalName\("([^"]+)"\)/);
  if (internalNameMatch) {
    weapon.id = generateId(internalNameMatch[1].replace(/^IS|^CL/, ''));
  }
  
  // Extract heat
  const heatMatch = content.match(/heat\s*=\s*(\d+)/);
  if (heatMatch) {
    weapon.heat = parseInt(heatMatch[1]);
  }
  
  // Extract damage
  const damageMatch = content.match(/damage\s*=\s*(\d+)/);
  if (damageMatch) {
    weapon.damage = parseInt(damageMatch[1]);
  } else {
    // Check for variable damage like "1/missile"
    const varDamageMatch = content.match(/damage\s*=\s*"([^"]+)"/);
    if (varDamageMatch) {
      weapon.damage = varDamageMatch[1];
    }
  }
  
  // Extract ranges
  const shortRangeMatch = content.match(/shortRange\s*=\s*(\d+)/);
  const mediumRangeMatch = content.match(/mediumRange\s*=\s*(\d+)/);
  const longRangeMatch = content.match(/longRange\s*=\s*(\d+)/);
  const extremeRangeMatch = content.match(/extremeRange\s*=\s*(\d+)/);
  
  if (shortRangeMatch) weapon.ranges.short = parseInt(shortRangeMatch[1]);
  if (mediumRangeMatch) weapon.ranges.medium = parseInt(mediumRangeMatch[1]);
  if (longRangeMatch) weapon.ranges.long = parseInt(longRangeMatch[1]);
  if (extremeRangeMatch) weapon.ranges.extreme = parseInt(extremeRangeMatch[1]);
  
  // Extract minimum range (may be calculated)
  const minRangeMatch = content.match(/minimumRange\s*=\s*(\d+)/);
  if (minRangeMatch) {
    weapon.ranges.minimum = parseInt(minRangeMatch[1]);
  }
  
  // Extract tonnage
  const tonnageMatch = content.match(/tonnage\s*=\s*([\d.]+)/);
  if (tonnageMatch) {
    weapon.weight = parseFloat(tonnageMatch[1]);
  }
  
  // Extract critical slots
  const critMatch = content.match(/criticalSlots\s*=\s*(\d+)/);
  if (critMatch) {
    weapon.criticalSlots = parseInt(critMatch[1]);
  }
  
  // Extract cost
  const costMatch = content.match(/cost\s*=\s*(\d+)/);
  if (costMatch) {
    weapon.costCBills = parseInt(costMatch[1]);
  }
  
  // Extract battle value
  const bvMatch = content.match(/bv\s*=\s*(\d+)/);
  if (bvMatch) {
    weapon.battleValue = parseInt(bvMatch[1]);
  }
  
  // Extract ammo per ton
  const ammoMatch = content.match(/ammoPerTon\s*=\s*(\d+)/);
  if (ammoMatch) {
    weapon.ammoPerTon = parseInt(ammoMatch[1]);
  }
  
  // Extract rules level
  weapon.rulesLevel = parseRulesLevel(content, weapon.techBase);
  
  // Extract introduction year
  const introYear = extractIntroductionYear(content, weapon.techBase);
  if (introYear) {
    weapon.introductionYear = introYear;
  }
  
  // Determine category and subType from file path and class name
  const filePathLower = filePath.toLowerCase();
  if (filePathLower.includes('laser') || filePathLower.includes('ppc') || filePathLower.includes('flamer') || filePathLower.includes('plasma')) {
    weapon.category = 'Energy';
    if (filePathLower.includes('laser')) weapon.subType = 'Laser';
    else if (filePathLower.includes('ppc')) weapon.subType = 'PPC';
    else if (filePathLower.includes('flamer')) weapon.subType = 'Flamer';
    else if (filePathLower.includes('plasma')) weapon.subType = 'Plasma';
  } else if (filePathLower.includes('autocannon') || filePathLower.includes('gauss') || filePathLower.includes('rifle') || filePathLower.includes('machine') || filePathLower.includes('mg')) {
    weapon.category = 'Ballistic';
    if (filePathLower.includes('autocannon') || filePathLower.includes('ac')) weapon.subType = 'Autocannon';
    else if (filePathLower.includes('gauss')) weapon.subType = 'Gauss';
    else if (filePathLower.includes('rifle')) weapon.subType = 'Rifle';
    else if (filePathLower.includes('machine') || filePathLower.includes('mg')) weapon.subType = 'Machine Gun';
  } else if (filePathLower.includes('lrm') || filePathLower.includes('srm') || filePathLower.includes('mrm') || filePathLower.includes('atm') || filePathLower.includes('narc') || filePathLower.includes('missile')) {
    weapon.category = 'Missile';
    if (filePathLower.includes('lrm')) weapon.subType = 'LRM';
    else if (filePathLower.includes('srm')) weapon.subType = 'SRM';
    else if (filePathLower.includes('mrm')) weapon.subType = 'MRM';
    else if (filePathLower.includes('atm')) weapon.subType = 'ATM';
    else if (filePathLower.includes('narc')) weapon.subType = 'NARC';
    else weapon.subType = 'Missile';
  }
  
  // Only return if we have essential data
  if (weapon.name && weapon.id) {
    return weapon;
  }
  
  return null;
}

/**
 * Extract ammunition from AmmoType.java
 */
function extractAmmunition(content) {
  const ammoItems = [];
  
  // Pattern to find create*() methods that return AmmoType
  // Match method blocks that create AmmoType instances
  const createMethodPattern = /private\s+static\s+AmmoType\s+create\w+\(\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
  let match;
  
  while ((match = createMethodPattern.exec(content)) !== null) {
    const methodContent = match[0];
    const ammo = {
      id: null,
      name: null,
      category: null,
      variant: 'Standard',
      techBase: 'INNER_SPHERE',
      rulesLevel: 'STANDARD',
      compatibleWeaponIds: [],
      shotsPerTon: 0,
      weight: 1,
      criticalSlots: 1,
      costPerTon: 0,
      battleValue: 0,
      isExplosive: true,
      introductionYear: 2300,
      special: []
    };
    
    // Extract name
    const nameMatch = methodContent.match(/ammo\.name\s*=\s*"([^"]+)"/);
    if (nameMatch) {
      ammo.name = nameMatch[1].replace(/\s*\[IS\]|\s*\[Clan\]/g, '').trim();
    }
    
    // Extract internal name
    const internalNameMatch = methodContent.match(/setInternalName\("([^"]+)"\)/);
    if (internalNameMatch) {
      const internalName = internalNameMatch[1];
      ammo.id = generateId(internalName.replace(/^IS|^CL/, '').replace(/\s+Ammo$/, ''));
      
      // Determine tech base from internal name
      if (internalName.startsWith('CL')) {
        ammo.techBase = 'CLAN';
      } else if (internalName.startsWith('IS')) {
        ammo.techBase = 'INNER_SPHERE';
      }
    }
    
    if (!ammo.name) continue;
    
    if (!ammo.id) {
      ammo.id = generateId(ammo.name);
    }
    
    // Extract shots per ton
    const shotsMatch = methodContent.match(/ammo\.shots\s*=\s*(\d+)/);
    if (shotsMatch) {
      ammo.shotsPerTon = parseInt(shotsMatch[1]);
    }
    
    // Extract cost per ton
    const costMatch = methodContent.match(/ammo\.cost\s*=\s*(\d+)/);
    if (costMatch) {
      ammo.costPerTon = parseInt(costMatch[1]);
    }
    
    // Extract BV
    const bvMatch = methodContent.match(/ammo\.bv\s*=\s*(\d+)/);
    if (bvMatch) {
      ammo.battleValue = parseInt(bvMatch[1]);
    }
    
    // Extract ammo type enum to determine category
    const ammoTypeMatch = methodContent.match(/ammo\.ammoType\s*=\s*AmmoTypeEnum\.(\w+)/);
    if (ammoTypeMatch) {
      const ammoTypeEnum = ammoTypeMatch[1];
      // Map enum to category
      if (ammoTypeEnum.includes('AC') || ammoTypeEnum.includes('AUTOCANNON')) {
        ammo.category = 'Autocannon';
      } else if (ammoTypeEnum.includes('GAUSS')) {
        ammo.category = 'Gauss';
      } else if (ammoTypeEnum.includes('MG') || ammoTypeEnum.includes('MACHINE')) {
        ammo.category = 'Machine Gun';
      } else if (ammoTypeEnum.includes('LRM')) {
        ammo.category = 'LRM';
      } else if (ammoTypeEnum.includes('SRM')) {
        ammo.category = 'SRM';
      } else if (ammoTypeEnum.includes('MRM')) {
        ammo.category = 'MRM';
      } else if (ammoTypeEnum.includes('ATM')) {
        ammo.category = 'ATM';
      } else if (ammoTypeEnum.includes('NARC')) {
        ammo.category = 'NARC';
      } else if (ammoTypeEnum.includes('AMS')) {
        ammo.category = 'AMS';
      } else if (ammoTypeEnum.includes('ARTILLERY') || ammoTypeEnum.includes('ARROW') || ammoTypeEnum.includes('SNIPER') || ammoTypeEnum.includes('THUMPER') || ammoTypeEnum.includes('LONG_TOM')) {
        ammo.category = 'Artillery';
      }
    }
    
    // Determine variant from name
    const nameLower = ammo.name.toLowerCase();
    if (nameLower.includes('armor-piercing') || nameLower.includes('ap')) {
      ammo.variant = 'Armor-Piercing';
    } else if (nameLower.includes('cluster')) {
      ammo.variant = 'Cluster';
    } else if (nameLower.includes('precision')) {
      ammo.variant = 'Precision';
    } else if (nameLower.includes('flechette')) {
      ammo.variant = 'Flechette';
    } else if (nameLower.includes('inferno')) {
      ammo.variant = 'Inferno';
    } else if (nameLower.includes('fragmentation') || nameLower.includes('frag')) {
      ammo.variant = 'Fragmentation';
    } else if (nameLower.includes('incendiary')) {
      ammo.variant = 'Incendiary';
    } else if (nameLower.includes('smoke')) {
      ammo.variant = 'Smoke';
    } else if (nameLower.includes('thunder')) {
      ammo.variant = 'Thunder';
    } else if (nameLower.includes('swarm')) {
      ammo.variant = 'Swarm';
    } else if (nameLower.includes('tandem')) {
      ammo.variant = 'Tandem-Charge';
    } else if (nameLower.includes('extended') || nameLower.includes('er')) {
      ammo.variant = 'Extended Range';
    } else if (nameLower.includes('high explosive') || nameLower.includes('he')) {
      ammo.variant = 'High Explosive';
    }
    
    // Extract rules level
    ammo.rulesLevel = parseRulesLevel(methodContent, ammo.techBase);
    
    // Extract introduction year
    const introYear = extractIntroductionYear(methodContent, ammo.techBase);
    if (introYear) {
      ammo.introductionYear = introYear;
    }
    
    // Most ammo is explosive (except some special types)
    if (nameLower.includes('non-explosive') || nameLower.includes('nonexplosive')) {
      ammo.isExplosive = false;
    }
    
    if (ammo.name && ammo.id && ammo.category && ammo.shotsPerTon > 0) {
      ammoItems.push(ammo);
    }
  }
  
  return ammoItems;
}

/**
 * Extract misc equipment from MiscType.java
 */
function extractMiscEquipment(content) {
  const miscItems = [];
  
  // Pattern to find create*() methods that return MiscType
  const createMethodPattern = /public\s+static\s+MiscType\s+create\w+\(\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
  let match;
  
  while ((match = createMethodPattern.exec(content)) !== null) {
    const methodContent = match[0];
    const misc = {
      id: null,
      name: null,
      category: null,
      techBase: 'INNER_SPHERE',
      rulesLevel: 'STANDARD',
      weight: 0,
      criticalSlots: 0,
      costCBills: 0,
      battleValue: 0,
      introductionYear: 2300,
      special: []
    };
    
    // Extract name
    const nameMatch = methodContent.match(/misc\.name\s*=\s*"([^"]+)"/);
    if (nameMatch) {
      misc.name = nameMatch[1];
    }
    
    // Extract internal name
    const internalNameMatch = methodContent.match(/setInternalName\("([^"]+)"\)/);
    if (internalNameMatch) {
      const internalName = internalNameMatch[1];
      misc.id = generateId(internalName.replace(/^IS|^CL/, ''));
      
      // Determine tech base from internal name
      if (internalName.startsWith('CL')) {
        misc.techBase = 'CLAN';
      } else if (internalName.startsWith('IS')) {
        misc.techBase = 'INNER_SPHERE';
      }
    }
    
    if (!misc.name) continue;
    
    if (!misc.id) {
      misc.id = generateId(misc.name);
    }
    
    // Extract tonnage (may be variable)
    const tonnageMatch = methodContent.match(/tonnage\s*=\s*([\d.]+|TONNAGE_VARIABLE)/);
    if (tonnageMatch) {
      if (tonnageMatch[1] === 'TONNAGE_VARIABLE') {
        misc.weight = 0; // Variable
      } else {
        misc.weight = parseFloat(tonnageMatch[1]);
      }
    }
    
    // Extract critical slots
    const critMatch = methodContent.match(/criticalSlots\s*=\s*(\d+|CRITICAL_SLOTS_VARIABLE)/);
    if (critMatch) {
      if (critMatch[1] === 'CRITICAL_SLOTS_VARIABLE') {
        misc.criticalSlots = 0; // Variable
      } else {
        misc.criticalSlots = parseInt(critMatch[1]);
      }
    }
    
    // Extract cost
    const costMatch = methodContent.match(/cost\s*=\s*(\d+|COST_VARIABLE)/);
    if (costMatch) {
      if (costMatch[1] === 'COST_VARIABLE') {
        misc.costCBills = 0; // Variable
      } else {
        misc.costCBills = parseInt(costMatch[1]);
      }
    }
    
    // Extract BV
    const bvMatch = methodContent.match(/bv\s*=\s*(\d+)/);
    if (bvMatch) {
      misc.battleValue = parseInt(bvMatch[1]);
    }
    
    // Determine category from flags
    if (methodContent.includes('F_TARGETING_COMPUTER')) {
      misc.category = 'Targeting';
    } else if (methodContent.includes('F_ECM') || methodContent.includes('F_ANGEL_ECM')) {
      misc.category = 'ECM';
    } else if (methodContent.includes('F_BAP') || methodContent.includes('F_LIGHT_ACTIVE_PROBE')) {
      misc.category = 'Active Probe';
    } else if (methodContent.includes('F_C3') || methodContent.includes('F_C3I') || methodContent.includes('F_C3S')) {
      misc.category = 'C3 System';
    } else if (methodContent.includes('TAG')) {
      misc.category = 'TAG';
    } else if (methodContent.includes('F_COMMUNICATIONS')) {
      misc.category = 'Communications';
    } else {
      misc.category = 'Miscellaneous';
    }
    
    // Extract rules level
    misc.rulesLevel = parseRulesLevel(methodContent, misc.techBase);
    
    // Extract introduction year
    const introYear = extractIntroductionYear(methodContent, misc.techBase);
    if (introYear) {
      misc.introductionYear = introYear;
    }
    
    // Add special notes
    if (methodContent.includes('TONNAGE_VARIABLE')) {
      misc.special.push('Variable weight');
    }
    if (methodContent.includes('CRITICAL_SLOTS_VARIABLE')) {
      misc.special.push('Variable critical slots');
    }
    
    if (misc.name && misc.id) {
      miscItems.push(misc);
    }
  }
  
  return miscItems;
}

/**
 * Main extraction function
 */
function extractEquipment() {
  console.log('Starting equipment extraction from MegaMek...\n');
  
  // Extract weapons
  const weaponsDir = path.join(MEGAMEK_DIR, 'weapons');
  if (fs.existsSync(weaponsDir)) {
    console.log('Extracting weapons...');
    extractWeaponsRecursive(weaponsDir);
  }
  
  // Extract misc equipment
  const miscTypeFile = path.join(MEGAMEK_DIR, 'equipment', 'MiscType.java');
  if (fs.existsSync(miscTypeFile)) {
    console.log('Extracting misc equipment...');
    const miscContent = fs.readFileSync(miscTypeFile, 'utf8');
    const miscItems = extractMiscEquipment(miscContent);
    extractedEquipment.miscellaneous.push(...miscItems);
    console.log(`  Found ${miscItems.length} misc equipment items`);
  }
  
  // Extract ammunition
  const ammoTypeFile = path.join(MEGAMEK_DIR, 'equipment', 'AmmoType.java');
  if (fs.existsSync(ammoTypeFile)) {
    console.log('Extracting ammunition...');
    const ammoContent = fs.readFileSync(ammoTypeFile, 'utf8');
    const ammoItems = extractAmmunition(ammoContent);
    extractedEquipment.ammunition.push(...ammoItems);
    console.log(`  Found ${ammoItems.length} ammunition items`);
  }
  
  // Write output files
  writeOutputFiles();
  
  console.log('\nExtraction complete!');
  console.log(`  Energy Weapons: ${extractedEquipment.weapons.energy.length}`);
  console.log(`  Ballistic Weapons: ${extractedEquipment.weapons.ballistic.length}`);
  console.log(`  Missile Weapons: ${extractedEquipment.weapons.missile.length}`);
  console.log(`  Physical Weapons: ${extractedEquipment.weapons.physical.length}`);
  console.log(`  Electronics: ${extractedEquipment.electronics.length}`);
  console.log(`  Miscellaneous: ${extractedEquipment.miscellaneous.length}`);
  console.log(`  Ammunition: ${extractedEquipment.ammunition.length}`);
}

/**
 * Recursively extract weapons from directory
 */
function extractWeaponsRecursive(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      extractWeaponsRecursive(filePath);
    } else if (file.endsWith('.java') && !file.includes('Weapon.java') && !file.includes('Handler')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Only process weapon classes (not handlers, base classes, etc.)
        if (content.includes('extends') && (content.includes('Weapon') || content.includes('LaserWeapon') || content.includes('PPCWeapon'))) {
          const weapon = extractWeaponData(filePath, content);
          if (weapon) {
            if (weapon.category === 'Energy') {
              extractedEquipment.weapons.energy.push(weapon);
            } else if (weapon.category === 'Ballistic') {
              extractedEquipment.weapons.ballistic.push(weapon);
            } else if (weapon.category === 'Missile') {
              extractedEquipment.weapons.missile.push(weapon);
            } else if (weapon.category === 'Physical') {
              extractedEquipment.weapons.physical.push(weapon);
            }
          }
        }
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
      }
    }
  }
}

/**
 * Write output JSON files
 */
function writeOutputFiles() {
  const schemaBase = '../_schema/';
  
  // Write energy weapons
  if (extractedEquipment.weapons.energy.length > 0) {
    const energyFile = {
      $schema: schemaBase + 'weapon-schema.json',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      count: extractedEquipment.weapons.energy.length,
      items: extractedEquipment.weapons.energy
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'weapons-energy.json'),
      JSON.stringify(energyFile, null, 2)
    );
  }
  
  // Write ballistic weapons
  if (extractedEquipment.weapons.ballistic.length > 0) {
    const ballisticFile = {
      $schema: schemaBase + 'weapon-schema.json',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      count: extractedEquipment.weapons.ballistic.length,
      items: extractedEquipment.weapons.ballistic
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'weapons-ballistic.json'),
      JSON.stringify(ballisticFile, null, 2)
    );
  }
  
  // Write missile weapons
  if (extractedEquipment.weapons.missile.length > 0) {
    const missileFile = {
      $schema: schemaBase + 'weapon-schema.json',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      count: extractedEquipment.weapons.missile.length,
      items: extractedEquipment.weapons.missile
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'weapons-missile.json'),
      JSON.stringify(missileFile, null, 2)
    );
  }
  
  // Write electronics (from misc equipment)
  const electronics = extractedEquipment.miscellaneous.filter(item => 
    item.category !== 'Miscellaneous'
  );
  if (electronics.length > 0) {
    const electronicsFile = {
      $schema: schemaBase + 'electronics-schema.json',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      count: electronics.length,
      items: electronics
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'electronics.json'),
      JSON.stringify(electronicsFile, null, 2)
    );
    extractedEquipment.electronics = electronics;
  }
  
  // Write miscellaneous equipment
  const miscOnly = extractedEquipment.miscellaneous.filter(item => 
    item.category === 'Miscellaneous'
  );
  if (miscOnly.length > 0) {
    const miscFile = {
      $schema: schemaBase + 'misc-equipment-schema.json',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      count: miscOnly.length,
      items: miscOnly
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'miscellaneous.json'),
      JSON.stringify(miscFile, null, 2)
    );
  }
  
  // Write ammunition
  if (extractedEquipment.ammunition.length > 0) {
    const ammoFile = {
      $schema: schemaBase + 'ammunition-schema.json',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      count: extractedEquipment.ammunition.length,
      items: extractedEquipment.ammunition
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'ammunition.json'),
      JSON.stringify(ammoFile, null, 2)
    );
  }
}

// Run extraction
if (require.main === module) {
  extractEquipment();
}

module.exports = { extractEquipment, extractWeaponData, extractMiscEquipment, extractAmmunition };
