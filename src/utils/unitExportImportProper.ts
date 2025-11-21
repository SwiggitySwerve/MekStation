// Export/Import functionality with proper EditableUnit type mapping
import { EditableUnit, EquipmentPlacement, CriticalSlotAssignment, Quirk, FluffContent } from '../types/editor';
import { FullUnit, UnitData, WeaponOrEquipmentItem, ArmorLocation } from '../types/index';

// File extension mapping based on unit type
const FILE_EXTENSIONS: { [key: string]: string } = {
  'mech': 'mtf',
  'battlemech': 'mtf',
  'vehicle': 'blk',
  'battlearmor': 'blk',
  'aerospace': 'blk',
  'protomech': 'blk',
  'infantry': 'blk',
  'dropship': 'blk',
  'jumpship': 'blk',
  'warship': 'blk',
  'spacestation': 'blk',
  'smallcraft': 'blk',
  'default': 'blk'
};

// Get appropriate file extension based on unit type
export function getFileExtension(unitType?: string): string {
  if (!unitType) return FILE_EXTENSIONS.default;
  const type = unitType.toLowerCase().replace(/\s+/g, '');
  return FILE_EXTENSIONS[type] || FILE_EXTENSIONS.default;
}

// Export to JSON format
export function exportToJSON(unit: EditableUnit): string {
  // Create clean export object
  const exportData = {
    ...unit,
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    application: 'BattleTech Editor'
  };
  
  return JSON.stringify(exportData, null, 2);
}

// Import from JSON format
export function importFromJSON(jsonString: string): EditableUnit {
  try {
    const data = JSON.parse(jsonString);
    
    // If it's already an EditableUnit, return it with defaults for missing fields
    if (data.armorAllocation && data.equipmentPlacements) {
      return data as EditableUnit;
    }
    
    // Otherwise, create a new EditableUnit from partial data
    const unitData: UnitData = data.data || {
      chassis: data.chassis || 'Unknown',
      model: data.model || 'Standard',
      mass: data.mass || 25,
      tech_base: data.tech_base || 'Inner Sphere',
      era: data.era || '3025',
      source: data.source || 'Custom',
      rules_level: data.rules_level || 'Standard',
      engine: {
        type: 'Fusion',
        rating: 100,
      },
      structure: {
        type: 'Standard',
      },
      armor: {
        type: 'Standard',
        locations: [],
        total_armor_points: 0
      },
      heat_sinks: {
        type: 'Single',
        count: 10,
      },
      movement: {
        walk_mp: 4,
        jump_mp: 0,
      },
      weapons_and_equipment: [],
      criticals: [],
    };
    
    const unit: EditableUnit = {
      // FullUnit properties
      id: data.id || '',
      chassis: data.chassis || unitData.chassis || 'Unknown',
      model: data.model || unitData.model || 'Standard',
      mul_id: data.mul_id || '-1',
      mass: data.mass || unitData.mass || 25,
      tech_base: data.tech_base || unitData.tech_base || 'Inner Sphere',
      era: data.era || unitData.era || '3025',
      source: data.source || unitData.source,
      rules_level: data.rules_level || unitData.rules_level,
      role: data.role || '',
      data: unitData,
      
      // EditableUnit properties
      armorAllocation: data.armorAllocation || {},
      equipmentPlacements: data.equipmentPlacements || [],
      criticalSlots: data.criticalSlots || [],
      fluffData: data.fluffData || {},
      selectedQuirks: data.selectedQuirks || [],
      validationState: data.validationState || { isValid: true, errors: [], warnings: [] },
      editorMetadata: data.editorMetadata || {
        lastModified: new Date(),
        isDirty: false,
        version: '1.0'
      }
    };
    
    return unit;
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error}`);
  }
}

// Export to MTF format (MegaMekLab)
export function exportToMTF(unit: EditableUnit): string {
  const lines: string[] = [];
  const data = unit.data;
  
  // Header
  lines.push(`chassis:${unit.chassis}`);
  lines.push(`model:${unit.model}`);
  lines.push(`mul id:${unit.mul_id || '-1'}`);
  lines.push('');
  
  // Config
  lines.push(`Config:${data.config || 'Biped'}`);
  lines.push(`TechBase:${unit.tech_base}`);
  lines.push(`Era:${unit.era}`);
  lines.push(`Source:${unit.source || data.source || 'Custom'}`);
  lines.push(`Rules Level:${unit.rules_level || data.rules_level || 'Standard'}`);
  lines.push('');
  
  // Mass
  lines.push(`Mass:${unit.mass}`);
  lines.push(`Engine:${data.engine?.rating || 100} ${data.engine?.type || 'Fusion'}`);
  lines.push(`Structure:${data.structure?.type || 'Standard'}`);
  lines.push(`Myomer:${data.myomer?.type || 'Standard'}`);
  lines.push('');
  
  // Heat Sinks
  lines.push(`Heat Sinks:${data.heat_sinks?.count || 10} ${data.heat_sinks?.type || 'Single'}`);
  lines.push(`Walk MP:${data.movement?.walk_mp || 4}`);
  lines.push(`Jump MP:${data.movement?.jump_mp || 0}`);
  lines.push('');
  
  // Armor
  lines.push(`Armor:${data.armor?.type || 'Standard'}`);
  
  // Convert armorAllocation to location-based output
  if (unit.armorAllocation) {
    Object.entries(unit.armorAllocation).forEach(([location, allocation]) => {
      const locName = location.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      lines.push(`${locName}:${allocation.front}`);
      if (allocation.rear !== undefined && allocation.rear > 0) {
        lines.push(`${locName} Rear:${allocation.rear}`);
      }
    });
  }
  lines.push('');
  
  // Weapons & Equipment
  lines.push('Weapons & Equipment:');
  if (unit.equipmentPlacements && unit.equipmentPlacements.length > 0) {
    unit.equipmentPlacements.forEach(placement => {
      const rear = placement.isRear ? ' (R)' : '';
      lines.push(`${placement.equipment.name}, ${placement.location}${rear}`);
    });
  }
  lines.push('');
  
  // Quirks
  if (unit.selectedQuirks && unit.selectedQuirks.length > 0) {
    lines.push('Quirks:');
    unit.selectedQuirks.forEach(quirk => {
      lines.push(quirk.name);
    });
    lines.push('');
  }
  
  // Manufacturer Data (from fluffData)
  const hasManufacturerData = unit.fluffData && Object.keys(unit.fluffData).some(key => 
    key.includes('manufacturer') || key.includes('factory') || key.includes('system')
  );
  
  if (hasManufacturerData) {
    lines.push('Manufacturer:');
    if (unit.fluffData.manufacturer) {
      lines.push(`Primary: ${unit.fluffData.manufacturer}`);
    }
    if (unit.fluffData.primaryFactory) {
      lines.push(`Factory: ${unit.fluffData.primaryFactory}`);
    }
    // Add other manufacturer fields as needed
  }
  
  return lines.join('\n');
}

// Export to BLK format (for vehicles, battle armor, aerospace, etc.)
export function exportToBLK(unit: EditableUnit): string {
  const lines: string[] = [];
  const data = unit.data;
  
  // BLK Header
  lines.push('<BlockVersion>');
  lines.push('1');
  lines.push('</BlockVersion>');
  lines.push('');
  
  // Unit type identifier
  const unitType = data.config?.toLowerCase() || 'vehicle';
  if (unitType.includes('vehicle') || unitType.includes('tank')) {
    lines.push('<UnitType>');
    lines.push('Tank');
    lines.push('</UnitType>');
  } else if (unitType.includes('vtol')) {
    lines.push('<UnitType>');
    lines.push('VTOL');
    lines.push('</UnitType>');
  } else if (unitType.includes('battlearmor')) {
    lines.push('<UnitType>');
    lines.push('BattleArmor');
    lines.push('</UnitType>');
  } else if (unitType.includes('aero')) {
    lines.push('<UnitType>');
    lines.push('Aero');
    lines.push('</UnitType>');
  }
  lines.push('');
  
  // Basic info
  lines.push(`<name>${unit.chassis} ${unit.model}</name>`);
  lines.push(`<model>${unit.model}</model>`);
  lines.push(`<mul id:>${unit.mul_id || '-1'}</mul id:>`);
  lines.push(`<year>${unit.era || '3025'}</year>`);
  lines.push(`<type>${unit.tech_base || 'IS'}</type>`);
  lines.push('');
  
  // Physical characteristics
  lines.push('<tonnage>');
  lines.push(String(unit.mass || 25));
  lines.push('</tonnage>');
  lines.push('');
  
  // Movement
  if (data.movement) {
    lines.push('<motion_type>');
    if (unitType.includes('vtol')) {
      lines.push('VTOL');
    } else if (unitType.includes('hover')) {
      lines.push('Hover');
    } else if (unitType.includes('wheeled')) {
      lines.push('Wheeled');
    } else {
      lines.push('Tracked');
    }
    lines.push('</motion_type>');
    lines.push('<cruiseMP>');
    lines.push(String(data.movement.walk_mp || 4));
    lines.push('</cruiseMP>');
  }
  lines.push('');
  
  // Engine
  if (data.engine) {
    lines.push('<engine>');
    lines.push(`<rating>${data.engine.rating || 100}</rating>`);
    lines.push(`<type>${data.engine.type || 'Fusion'}</type>`);
    lines.push('</engine>');
  }
  lines.push('');
  
  // Armor
  if (data.armor) {
    lines.push('<armor>');
    lines.push(`<type>${data.armor.type || 'Standard'}</type>`);
    
    // Armor values by location
    if (unit.armorAllocation) {
      Object.entries(unit.armorAllocation).forEach(([location, allocation]) => {
        const locTag = location.replace(/_/g, '');
        lines.push(`<${locTag}>${allocation.front || 0}</${locTag}>`);
        if (allocation.rear !== undefined && allocation.rear > 0) {
          lines.push(`<${locTag}_rear>${allocation.rear}</${locTag}_rear>`);
        }
      });
    }
    lines.push('</armor>');
  }
  lines.push('');
  
  // Structure  
  if (data.structure) {
    lines.push('<structure>');
    lines.push(`<type>${data.structure.type || 'Standard'}</type>`);
    lines.push('</structure>');
  }
  lines.push('');
  
  // Equipment
  if (unit.equipmentPlacements && unit.equipmentPlacements.length > 0) {
    lines.push('<equipment>');
    unit.equipmentPlacements.forEach(placement => {
      const location = placement.location.replace(/ /g, '');
      const rear = placement.isRear ? ' rear="true"' : '';
      lines.push(`<${placement.equipment.type} location="${location}"${rear}>`);
      lines.push(placement.equipment.name);
      lines.push(`</${placement.equipment.type}>`);
    });
    lines.push('</equipment>');
  }
  
  return lines.join('\n');
}

// Import from BLK format
export function importFromBLK(blkString: string): EditableUnit {
  // Simple XML parsing for BLK format
  const getTagValue = (content: string, tag: string): string => {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  };
  
  const getAttributeValue = (content: string, tag: string, attribute: string): string => {
    const regex = new RegExp(`<${tag}[^>]*${attribute}="([^"]*)"`, 'i');
    const match = content.match(regex);
    return match ? match[1] : '';
  };
  
  // Extract basic info
  const name = getTagValue(blkString, 'name');
  const [chassis, ...modelParts] = name.split(' ');
  const model = modelParts.join(' ') || getTagValue(blkString, 'model');
  
  // Type-safe value parsing with fallbacks
  const rawTechBase = getTagValue(blkString, 'type') || 'Inner Sphere';
  const techBase = ['Inner Sphere', 'Clan'].includes(rawTechBase) ? rawTechBase : 'Inner Sphere';
  
  const rawConfig = getTagValue(blkString, 'UnitType') || 'Vehicle';
  const validConfigs = ['Vehicle', 'BattleMech', 'AeroSpaceFighter', 'Jumpship', 'WarShip', 'SpaceStation'];
  const config = validConfigs.includes(rawConfig) ? rawConfig : 'Vehicle';

  const unitData: UnitData = {
    chassis: chassis,
    model: model,
    mass: parseInt(getTagValue(blkString, 'tonnage')) || 25,
    tech_base: techBase,
    era: getTagValue(blkString, 'year') || '3025',
    source: 'BLK Import',
    rules_level: 'Standard',
    config: config,
    movement: {
      walk_mp: parseInt(getTagValue(blkString, 'cruiseMP')) || 4,
      jump_mp: 0,
    },
    engine: {
      type: getTagValue(blkString.match(/<engine>([\s\S]*?)<\/engine>/)?.[1] || '', 'type') || 'Fusion',
      rating: parseInt(getTagValue(blkString.match(/<engine>([\s\S]*?)<\/engine>/)?.[1] || '', 'rating')) || 100,
    },
    structure: {
      type: getTagValue(blkString.match(/<structure>([\s\S]*?)<\/structure>/)?.[1] || '', 'type') || 'Standard',
    },
    armor: {
      type: getTagValue(blkString.match(/<armor>([\s\S]*?)<\/armor>/)?.[1] || '', 'type') || 'Standard',
      locations: [],
      total_armor_points: 0
    },
    heat_sinks: {
      type: 'Single',
      count: 10,
    },
    weapons_and_equipment: [],
    criticals: [],
  };
  
  // Create EditableUnit
  const unit: EditableUnit = {
    id: '',
    chassis: chassis,
    model: model,
    mul_id: getTagValue(blkString, 'mul id:') || '-1',
    mass: unitData.mass || 25,
    tech_base: unitData.tech_base || 'Inner Sphere',
    era: unitData.era || '3025',
    source: unitData.source || 'BLK Import',
    rules_level: unitData.rules_level || 'Standard',
    role: '',
    data: unitData,
    armorAllocation: {},
    equipmentPlacements: [],
    criticalSlots: [],
    fluffData: {},
    selectedQuirks: [],
    validationState: { isValid: true, errors: [], warnings: [] },
    editorMetadata: {
      lastModified: new Date(),
      isDirty: false,
      version: '1.0'
    }
  };
  
  // Parse armor values
  const armorMatch = blkString.match(/<armor>([\s\S]*?)<\/armor>/);
  if (armorMatch) {
    const armorSection = armorMatch[1];
    const locations = ['front', 'left', 'right', 'rear', 'turret'];
    
    locations.forEach(loc => {
      const value = parseInt(getTagValue(armorSection, loc)) || 0;
      if (value > 0) {
        unit.armorAllocation[loc] = {
          front: value,
          maxArmor: value * 2, // Estimate
          type: {
            id: 'standard',
            name: 'Standard',
            pointsPerTon: 16,
            criticalSlots: 0,
            techLevel: 'Introductory',
            isClan: false,
            isInner: true
          }
        };
      }
    });
  }
  
  // Parse equipment
  const equipmentMatch = blkString.match(/<equipment>([\s\S]*?)<\/equipment>/);
  if (equipmentMatch) {
    const equipmentSection = equipmentMatch[1];
    const equipmentRegex = /<(\w+)\s+location="([^"]+)"[^>]*>([^<]+)<\/\1>/g;
    let match;
    
    while ((match = equipmentRegex.exec(equipmentSection)) !== null) {
      const [, type, location, name] = match;
      const placement: EquipmentPlacement = {
        id: Date.now().toString() + Math.random(),
        equipment: {
          id: Date.now().toString(),
          name: name.trim(),
          type: type,
        },
        location: location,
        criticalSlots: [],
        isRear: match[0].includes('rear="true"')
      };
      unit.equipmentPlacements.push(placement);
    }
  }
  
  return unit;
}

// Import from MTF format
export function importFromMTF(mtfString: string): EditableUnit {
  const lines = mtfString.split('\n').map(line => line.trim());
  
  // Initialize structures
  const unitData: Partial<UnitData> = {
    movement: {},
    engine: {},
    structure: {},
    armor: {
      locations: [],
      type: 'Standard'
    },
    heat_sinks: {},
    weapons_and_equipment: [],
    criticals: [],
  };
  
  const unit: Partial<EditableUnit> = {
    data: unitData as UnitData,
    armorAllocation: {},
    equipmentPlacements: [],
    criticalSlots: [],
    fluffData: {},
    selectedQuirks: [],
  };
  
  let currentSection = '';
  const armorValues: { [key: string]: number } = {};
  
  for (const line of lines) {
    if (!line) {
      currentSection = '';
      continue;
    }
    
    // Check for section headers
    if (line.endsWith(':') && !line.includes(':')) {
      currentSection = line.slice(0, -1).toLowerCase();
      continue;
    }
    
    // Parse key:value pairs
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).toLowerCase();
      const value = line.substring(colonIndex + 1).trim();
      
      switch (key) {
        case 'chassis':
          unit.chassis = value;
          unitData.chassis = value;
          break;
        case 'model':
          unit.model = value;
          unitData.model = value;
          break;
        case 'mul id':
          unit.mul_id = value;
          unitData.mul_id = value;
          break;
        case 'config':
          // Type-safe config assignment with explicit typing
          const validConfigValues = ['Vehicle', 'BattleMech', 'AeroSpaceFighter', 'Jumpship', 'WarShip', 'SpaceStation'] as const;
          unitData.config = validConfigValues.includes(value as any) ? value as any : 'Vehicle';
          break;
        case 'techbase':
          // Type-safe tech base assignment with explicit typing
          const validTechBases = ['Inner Sphere', 'Clan'] as const;
          const safeTechBase = validTechBases.includes(value as any) ? value as any : 'Inner Sphere';
          unit.tech_base = safeTechBase;
          unitData.tech_base = safeTechBase;
          break;
        case 'era':
          unit.era = value;
          unitData.era = value;
          break;
        case 'source':
          unit.source = value;
          unitData.source = value;
          break;
        case 'rules level':
          unit.rules_level = value;
          unitData.rules_level = value;
          break;
        case 'mass':
          unit.mass = parseInt(value) || 25;
          unitData.mass = unit.mass;
          break;
        case 'engine':
          const engineParts = value.split(' ');
          unitData.engine!.rating = parseInt(engineParts[0]) || 100;
          unitData.engine!.type = engineParts.slice(1).join(' ');
          break;
        case 'structure':
          unitData.structure!.type = value;
          break;
        case 'armor':
          unitData.armor!.type = value;
          break;
        case 'heat sinks':
          const hsParts = value.split(' ');
          unitData.heat_sinks!.count = parseInt(hsParts[0]) || 10;
          unitData.heat_sinks!.type = hsParts.slice(1).join(' ');
          break;
        case 'walk mp':
          unitData.movement!.walk_mp = parseInt(value) || 4;
          break;
        case 'jump mp':
          unitData.movement!.jump_mp = parseInt(value) || 0;
          break;
        default:
          // Handle armor locations
          if (currentSection === '' && (key.includes('torso') || key.includes('arm') || 
              key.includes('leg') || key === 'head')) {
            armorValues[key] = parseInt(value) || 0;
          }
      }
    }
    
    // Handle weapons & equipment section
    if (currentSection === 'weapons & equipment' && line.includes(',')) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const placement: EquipmentPlacement = {
          id: Date.now().toString() + Math.random(),
          equipment: {
            id: Date.now().toString(),
            name: parts[0],
            type: 'equipment',
          },
          location: parts[1].replace(' (R)', ''),
          criticalSlots: [],
          isRear: parts[1].includes('(R)')
        };
        unit.equipmentPlacements!.push(placement);
      }
    }
    
    // Handle quirks section
    if (currentSection === 'quirks' && line && !line.includes(':')) {
      const quirk: Quirk = {
        id: Date.now().toString(),
        name: line,
        category: 'positive', // Default, would need more info
        cost: 0,
        description: ''
      };
      unit.selectedQuirks!.push(quirk);
    }
  }
  
  // Convert armor values to armorAllocation
  Object.entries(armorValues).forEach(([location, value]) => {
    const key = location.replace(/ /g, '_').toLowerCase();
    const isRear = location.includes('rear');
    const baseLocation = key.replace('_rear', '');
    
    if (!unit.armorAllocation![baseLocation]) {
      unit.armorAllocation![baseLocation] = {
        front: 0,
        maxArmor: 100, // Would need to calculate based on tonnage
        type: {
          id: 'standard',
          name: 'Standard',
          pointsPerTon: 16,
          criticalSlots: 0,
          techLevel: 'Introductory',
          isClan: false,
          isInner: true
        }
      };
    }
    
    if (isRear) {
      unit.armorAllocation![baseLocation].rear = value;
    } else {
      unit.armorAllocation![baseLocation].front = value;
    }
  });
  
  // Set defaults and ensure required fields
  const fullUnit: EditableUnit = {
    id: '',
    chassis: unit.chassis || 'Imported Unit',
    model: unit.model || 'Standard',
    mul_id: unit.mul_id || '-1',
    mass: unit.mass || 25,
    tech_base: unit.tech_base || 'Inner Sphere',
    era: unit.era || '3025',
    source: unit.source,
    rules_level: unit.rules_level,
    role: '',
    data: unitData as UnitData,
    armorAllocation: unit.armorAllocation || {},
    equipmentPlacements: unit.equipmentPlacements || [],
    criticalSlots: unit.criticalSlots || [],
    fluffData: unit.fluffData || {},
    selectedQuirks: unit.selectedQuirks || [],
    validationState: { isValid: true, errors: [], warnings: [] },
    editorMetadata: {
      lastModified: new Date(),
      isDirty: false,
      version: '1.0'
    }
  };
  
  return fullUnit;
}

// Main export function that determines format
export function exportUnit(unit: EditableUnit, format: 'json' | 'mtf' | 'blk' | 'auto' = 'auto'): string {
  let actualFormat: 'json' | 'mtf' | 'blk';
  
  if (format === 'auto') {
    // Use MTF for mechs, BLK for everything else
    const unitType = unit.data?.config?.toLowerCase() || 'biped';
    if (unitType.includes('biped') || unitType.includes('quad') || unitType.includes('tripod')) {
      actualFormat = 'mtf';
    } else {
      actualFormat = 'blk';
    }
  } else {
    actualFormat = format;
  }
  
  switch (actualFormat) {
    case 'json':
      return exportToJSON(unit);
    case 'mtf':
      return exportToMTF(unit);
    case 'blk':
      return exportToBLK(unit);
    default:
      return exportToJSON(unit);
  }
}

// Main import function that auto-detects format
export function importUnit(content: string, filename?: string): EditableUnit {
  // Try to detect format from filename
  if (filename) {
    if (filename.endsWith('.json')) {
      return importFromJSON(content);
    } else if (filename.endsWith('.mtf')) {
      return importFromMTF(content);
    } else if (filename.endsWith('.blk')) {
      return importFromBLK(content);
    }
  }
  
  // Try to detect format from content
  if (content.trim().startsWith('{')) {
    return importFromJSON(content);
  } else if (content.includes('chassis:') && content.includes('model:')) {
    return importFromMTF(content);
  } else if (content.includes('<BlockVersion>')) {
    return importFromBLK(content);
  }
  
  // Default to JSON
  return importFromJSON(content);
}

// Download helper
export function downloadUnit(unit: EditableUnit, format: 'json' | 'mtf' | 'blk' | 'auto' = 'auto') {
  const content = exportUnit(unit, format);
  const extension = format === 'auto' ? getFileExtension(unit.data?.config) : format;
  const filename = `${unit.chassis}_${unit.model}.${extension}`.replace(/\s+/g, '_');
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// File upload helper
export async function readUploadedFile(file: File): Promise<EditableUnit> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const unit = importUnit(content, file.name);
        resolve(unit);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
