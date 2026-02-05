/**
 * Equipment Data Migration Script
 *
 * Splits large equipment files into smaller, focused files for better bundle optimization
 * and maintainability. Each equipment category gets its own file with related variants.
 *
 * Phase 3: Data File Reorganization
 * Day 12: Create Migration Script
 */

import * as fs from 'fs';
import * as path from 'path';

import { Equipment } from '../../src/data/equipment/types';

// Migration configuration
interface MigrationConfig {
  sourceDir: string;
  targetDir: string;
  backupDir: string;
  validateIntegrity: boolean;
}

// Equipment categorization rules
interface CategoryRule {
  category: string;
  subcategory: string;
  filename: string;
  filter: (equipment: Equipment) => boolean;
  description: string;
}

const MIGRATION_RULES: CategoryRule[] = [
  // Energy Weapons - Split by weapon type and tech level
  {
    category: 'Energy Weapons',
    subcategory: 'Basic Lasers',
    filename: 'energy-weapons-basic-lasers.ts',
    filter: (eq) =>
      Boolean(
        eq.category === 'Energy Weapons' &&
        eq.baseType &&
        (eq.baseType.includes('Small Laser') ||
          eq.baseType.includes('Medium Laser') ||
          eq.baseType.includes('Large Laser')) &&
        !eq.baseType.includes('ER') &&
        !eq.baseType.includes('Pulse') &&
        !eq.baseType.includes('Heavy'),
      ),
    description: 'Standard small, medium, and large lasers (non-ER, non-pulse)',
  },
  {
    category: 'Energy Weapons',
    subcategory: 'Extended Range Lasers',
    filename: 'energy-weapons-er-lasers.ts',
    filter: (eq) =>
      eq.category === 'Energy Weapons' &&
      eq.baseType &&
      eq.baseType.includes('ER') &&
      eq.baseType.includes('Laser') &&
      !eq.baseType.includes('Pulse'),
    description: 'Extended Range laser variants',
  },
  {
    category: 'Energy Weapons',
    subcategory: 'Pulse Lasers',
    filename: 'energy-weapons-pulse-lasers.ts',
    filter: (eq) =>
      eq.category === 'Energy Weapons' &&
      eq.baseType &&
      eq.baseType.includes('Pulse') &&
      eq.baseType.includes('Laser'),
    description: 'Pulse laser variants (standard and ER)',
  },
  {
    category: 'Energy Weapons',
    subcategory: 'Heavy Lasers',
    filename: 'energy-weapons-heavy-lasers.ts',
    filter: (eq) =>
      eq.category === 'Energy Weapons' &&
      eq.baseType &&
      eq.baseType.includes('Heavy') &&
      eq.baseType.includes('Laser'),
    description: 'Heavy laser variants',
  },
  {
    category: 'Energy Weapons',
    subcategory: 'Particle Projection Cannons',
    filename: 'energy-weapons-ppcs.ts',
    filter: (eq) =>
      eq.category === 'Energy Weapons' &&
      eq.baseType &&
      eq.baseType.includes('PPC'),
    description:
      'All PPC variants (standard, ER, Light, Heavy, Enhanced, Snub-Nose)',
  },
  {
    category: 'Energy Weapons',
    subcategory: 'Flame Weapons',
    filename: 'energy-weapons-flamers.ts',
    filter: (eq) =>
      eq.category === 'Energy Weapons' &&
      eq.baseType &&
      (eq.baseType.includes('Flamer') || eq.baseType.includes('Flame')),
    description: 'Flamer and flame-based weapons',
  },
  {
    category: 'Energy Weapons',
    subcategory: 'Defensive Systems',
    filename: 'energy-weapons-defensive.ts',
    filter: (eq) =>
      eq.category === 'Energy Weapons' &&
      eq.baseType &&
      (eq.baseType.includes('AMS') || eq.baseType.includes('Anti-Missile')),
    description: 'Laser Anti-Missile Systems and defensive energy weapons',
  },

  // Ballistic Weapons - Split by weapon family
  {
    category: 'Ballistic Weapons',
    subcategory: 'Standard Autocannons',
    filename: 'ballistic-weapons-standard-acs.ts',
    filter: (eq) =>
      eq.category === 'Ballistic Weapons' &&
      eq.baseType &&
      !!eq.baseType.match(/^AC\/\d+$/) &&
      !eq.baseType.includes('Ultra') &&
      !eq.baseType.includes('LB') &&
      !eq.baseType.includes('Light') &&
      !eq.baseType.includes('Rotary') &&
      !eq.baseType.includes('HVAC'),
    description: 'Standard Autocannons (AC/2, AC/5, AC/10, AC/20)',
  },
  {
    category: 'Ballistic Weapons',
    subcategory: 'Ultra Autocannons',
    filename: 'ballistic-weapons-ultra-acs.ts',
    filter: (eq) =>
      Boolean(
        eq.category === 'Ballistic Weapons' &&
        eq.baseType &&
        eq.baseType.includes('Ultra AC'),
      ),
    description: 'Ultra Autocannon variants',
  },
  {
    category: 'Ballistic Weapons',
    subcategory: 'LB-X Autocannons',
    filename: 'ballistic-weapons-lbx-acs.ts',
    filter: (eq) =>
      Boolean(
        eq.category === 'Ballistic Weapons' &&
        eq.baseType &&
        eq.baseType.includes('LB') &&
        eq.baseType.includes('X') &&
        eq.baseType.includes('AC'),
      ),
    description: 'LB-X Autocannon variants',
  },
  {
    category: 'Ballistic Weapons',
    subcategory: 'Light Autocannons',
    filename: 'ballistic-weapons-light-acs.ts',
    filter: (eq) =>
      eq.category === 'Ballistic Weapons' &&
      eq.baseType &&
      (eq.baseType.includes('Light AC') || eq.baseType.includes('LAC')),
    description: 'Light Autocannon variants',
  },
  {
    category: 'Ballistic Weapons',
    subcategory: 'Rotary Autocannons',
    filename: 'ballistic-weapons-rotary-acs.ts',
    filter: (eq) =>
      eq.category === 'Ballistic Weapons' &&
      eq.baseType &&
      eq.baseType.includes('Rotary AC'),
    description: 'Rotary Autocannon variants',
  },
  {
    category: 'Ballistic Weapons',
    subcategory: 'Specialized Autocannons',
    filename: 'ballistic-weapons-specialized-acs.ts',
    filter: (eq) =>
      eq.category === 'Ballistic Weapons' &&
      eq.baseType &&
      (eq.baseType.includes('HVAC') || eq.baseType.includes('ProtoMech AC')),
    description: 'Hyper-Velocity and ProtoMech Autocannons',
  },
  {
    category: 'Ballistic Weapons',
    subcategory: 'Gauss Rifles',
    filename: 'ballistic-weapons-gauss-rifles.ts',
    filter: (eq) =>
      eq.category === 'Ballistic Weapons' &&
      eq.baseType &&
      eq.baseType.includes('Gauss') &&
      eq.baseType.includes('Rifle'),
    description: 'All Gauss Rifle variants',
  },
  {
    category: 'Ballistic Weapons',
    subcategory: 'Machine Guns',
    filename: 'ballistic-weapons-machine-guns.ts',
    filter: (eq) =>
      eq.category === 'Ballistic Weapons' &&
      eq.baseType &&
      eq.baseType.includes('Machine Gun'),
    description: 'Machine Gun variants',
  },
  {
    category: 'Ballistic Weapons',
    subcategory: 'Defensive Systems',
    filename: 'ballistic-weapons-defensive.ts',
    filter: (eq) =>
      eq.category === 'Ballistic Weapons' &&
      eq.baseType &&
      (eq.baseType.includes('Anti-Missile') || eq.baseType.includes('AMS')),
    description: 'Anti-Missile Systems and defensive ballistic weapons',
  },

  // Missile Weapons - Split by missile type and guidance system
  {
    category: 'Missile Weapons',
    subcategory: 'Standard LRMs',
    filename: 'missile-weapons-standard-lrms.ts',
    filter: (eq) =>
      eq.category === 'Missile Weapons' &&
      eq.baseType &&
      !!eq.baseType.match(/^LRM \d+$/) &&
      !eq.baseType.includes('Enhanced') &&
      !eq.baseType.includes('Extended') &&
      !eq.baseType.includes('Improved') &&
      !eq.baseType.includes('Streak'),
    description: 'Standard Long Range Missiles (LRM 5, 10, 15, 20)',
  },
  {
    category: 'Missile Weapons',
    subcategory: 'Enhanced LRMs',
    filename: 'missile-weapons-enhanced-lrms.ts',
    filter: (eq) =>
      eq.category === 'Missile Weapons' &&
      eq.baseType &&
      (eq.baseType.includes('Enhanced LRM') ||
        eq.baseType.includes('Extended LRM') ||
        eq.baseType.includes('Improved LRM')),
    description: 'Enhanced, Extended, and Improved LRM variants',
  },
  {
    category: 'Missile Weapons',
    subcategory: 'Streak LRMs',
    filename: 'missile-weapons-streak-lrms.ts',
    filter: (eq) =>
      eq.category === 'Missile Weapons' &&
      eq.baseType &&
      eq.baseType.includes('Streak LRM'),
    description: 'Streak LRM variants',
  },
  {
    category: 'Missile Weapons',
    subcategory: 'Standard SRMs',
    filename: 'missile-weapons-standard-srms.ts',
    filter: (eq) =>
      eq.category === 'Missile Weapons' &&
      eq.baseType &&
      !!eq.baseType.match(/^SRM \d+$/) &&
      !eq.baseType.includes('Streak') &&
      !eq.baseType.includes('Improved'),
    description: 'Standard Short Range Missiles (SRM 2, 4, 6)',
  },
  {
    category: 'Missile Weapons',
    subcategory: 'Streak SRMs',
    filename: 'missile-weapons-streak-srms.ts',
    filter: (eq) =>
      eq.category === 'Missile Weapons' &&
      eq.baseType &&
      (eq.baseType.includes('Streak SRM') ||
        eq.baseType.includes('Prototype Streak')),
    description: 'Streak SRM variants and prototypes',
  },
  {
    category: 'Missile Weapons',
    subcategory: 'Advanced Tactical Missiles',
    filename: 'missile-weapons-atms.ts',
    filter: (eq) =>
      eq.category === 'Missile Weapons' &&
      eq.baseType &&
      (eq.baseType.includes('ATM') || eq.baseType.includes('IATM')),
    description: 'ATM and IATM systems',
  },
  {
    category: 'Missile Weapons',
    subcategory: 'Multi-Mode Launchers',
    filename: 'missile-weapons-multi-mode.ts',
    filter: (eq) =>
      eq.category === 'Missile Weapons' &&
      eq.baseType &&
      eq.baseType.includes('MML'),
    description: 'Multi-Missile Launcher systems',
  },
  {
    category: 'Missile Weapons',
    subcategory: 'Heavy Missiles',
    filename: 'missile-weapons-heavy.ts',
    filter: (eq) =>
      eq.category === 'Missile Weapons' &&
      eq.baseType &&
      (eq.baseType.includes('Thunderbolt') || eq.baseType.includes('MRM')),
    description: 'Thunderbolt and Medium Range Missiles',
  },
];

class EquipmentMigrationScript {
  private config: MigrationConfig;
  private equipmentDatabase: Map<string, Equipment[]> = new Map();
  private migrationResults: Map<string, Equipment[]> = new Map();

  constructor(config: MigrationConfig) {
    this.config = config;
  }

  /**
   * Execute the complete migration process
   */
  async execute(): Promise<void> {
    console.log('🚀 Starting Equipment Data Migration...');
    console.log(`Source: ${this.config.sourceDir}`);
    console.log(`Target: ${this.config.targetDir}`);
    console.log(`Backup: ${this.config.backupDir}`);

    try {
      // Step 1: Create backup
      await this.createBackup();

      // Step 2: Load existing equipment data
      await this.loadEquipmentData();

      // Step 3: Apply migration rules
      await this.applyMigrationRules();

      // Step 4: Validate data integrity
      if (this.config.validateIntegrity) {
        await this.validateDataIntegrity();
      }

      // Step 5: Generate new files
      await this.generateNewFiles();

      // Step 6: Update index file
      await this.updateIndexFile();

      console.log('✅ Migration completed successfully!');
      this.printMigrationSummary();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create backup of original files
   */
  private async createBackup(): Promise<void> {
    console.log('📦 Creating backup...');

    const backupDir = this.config.backupDir;
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const sourceFiles = [
      'energy-weapons.ts',
      'ballistic-weapons.ts',
      'missile-weapons.ts',
      'index.ts',
    ];

    for (const file of sourceFiles) {
      const sourcePath = path.join(this.config.sourceDir, file);
      const backupPath = path.join(backupDir, `${file}.backup.${Date.now()}`);

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, backupPath);
        console.log(`  ✓ Backed up ${file}`);
      }
    }
  }

  /**
   * Load equipment data from existing files
   */
  private async loadEquipmentData(): Promise<void> {
    console.log('📚 Loading equipment data...');

    const equipmentFiles = [
      { file: 'energy-weapons.ts', export: 'ENERGY_WEAPONS' },
      { file: 'ballistic-weapons.ts', export: 'BALLISTIC_WEAPONS' },
      { file: 'missile-weapons.ts', export: 'MISSILE_WEAPONS' },
    ];

    for (const { file, export: exportName } of equipmentFiles) {
      try {
        const filePath = path.join(this.config.sourceDir, file);
        const moduleData = await import(filePath);
        const equipment: Equipment[] = moduleData[exportName] || [];

        this.equipmentDatabase.set(exportName, equipment);
        console.log(`  ✓ Loaded ${equipment.length} items from ${file}`);
      } catch (error) {
        console.warn(`  ⚠️ Could not load ${file}:`, error);
      }
    }
  }

  /**
   * Apply migration rules to categorize equipment
   */
  private async applyMigrationRules(): Promise<void> {
    console.log('🔄 Applying migration rules...');

    // Flatten all equipment into a single array
    const allEquipment: Equipment[] = [];
    for (const equipment of this.equipmentDatabase.values()) {
      allEquipment.push(...equipment);
    }

    console.log(`  📊 Processing ${allEquipment.length} total equipment items`);

    // Apply each migration rule
    for (const rule of MIGRATION_RULES) {
      const matchingEquipment = allEquipment.filter(rule.filter);
      this.migrationResults.set(rule.filename, matchingEquipment);

      console.log(
        `  ✓ ${rule.subcategory}: ${matchingEquipment.length} items → ${rule.filename}`,
      );
    }

    // Check for uncategorized equipment
    const categorizedIds = new Set<string>();
    for (const equipment of this.migrationResults.values()) {
      equipment.forEach((eq) => categorizedIds.add(eq.id));
    }

    const uncategorized = allEquipment.filter(
      (eq) => !categorizedIds.has(eq.id),
    );
    if (uncategorized.length > 0) {
      console.warn(`  ⚠️ ${uncategorized.length} uncategorized items found:`);
      uncategorized.forEach((eq) =>
        console.warn(`    - ${eq.name} (${eq.baseType})`),
      );

      // Add uncategorized items to a catch-all file
      this.migrationResults.set('equipment-uncategorized.ts', uncategorized);
    }
  }

  /**
   * Validate data integrity after migration
   */
  private async validateDataIntegrity(): Promise<void> {
    console.log('🔍 Validating data integrity...');

    // Count original vs migrated equipment
    const originalCount = Array.from(this.equipmentDatabase.values()).reduce(
      (total, equipment) => total + equipment.length,
      0,
    );

    const migratedCount = Array.from(this.migrationResults.values()).reduce(
      (total, equipment) => total + equipment.length,
      0,
    );

    if (originalCount !== migratedCount) {
      throw new Error(
        `Data integrity check failed: ${originalCount} original items !== ${migratedCount} migrated items`,
      );
    }

    // Check for duplicate IDs
    const allIds = new Set<string>();
    const duplicates: string[] = [];

    for (const equipment of this.migrationResults.values()) {
      equipment.forEach((eq) => {
        if (allIds.has(eq.id)) {
          duplicates.push(eq.id);
        } else {
          allIds.add(eq.id);
        }
      });
    }

    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate equipment IDs found: ${duplicates.join(', ')}`,
      );
    }

    console.log(
      `  ✅ Data integrity validated: ${originalCount} items processed successfully`,
    );
  }

  /**
   * Generate new equipment files based on migration results
   */
  private async generateNewFiles(): Promise<void> {
    console.log('📝 Generating new equipment files...');

    // Ensure target directory exists
    if (!fs.existsSync(this.config.targetDir)) {
      fs.mkdirSync(this.config.targetDir, { recursive: true });
    }

    for (const [filename, equipment] of this.migrationResults.entries()) {
      const filePath = path.join(this.config.targetDir, filename);
      const fileContent = this.generateFileContent(filename, equipment);

      fs.writeFileSync(filePath, fileContent, 'utf8');
      console.log(`  ✓ Generated ${filename} (${equipment.length} items)`);
    }
  }

  /**
   * Generate TypeScript file content for equipment
   */
  private generateFileContent(
    filename: string,
    equipment: Equipment[],
  ): string {
    const categoryName = filename
      .replace('.ts', '')
      .toUpperCase()
      .replace(/-/g, '_');
    const exportName = categoryName;

    let content = `import { Equipment } from '../types';\n\n`;

    // Add individual equipment exports
    equipment.forEach((eq) => {
      content += this.generateEquipmentDefinition(eq);
      content += '\n';
    });

    // Add array export
    content += `export const ${exportName}: Equipment[] = [\n`;
    equipment.forEach((eq) => {
      content += `  ${eq.id.toUpperCase()},\n`;
    });
    content += '];\n';

    return content;
  }

  /**
   * Generate TypeScript definition for a single equipment item
   */
  private generateEquipmentDefinition(equipment: Equipment): string {
    const constName = equipment.id.toUpperCase();

    let definition = `export const ${constName}: Equipment = {\n`;
    definition += `  id: '${equipment.id}',\n`;
    definition += `  name: '${equipment.name}',\n`;
    definition += `  category: '${equipment.category}',\n`;
    definition += `  baseType: '${equipment.baseType}',\n`;
    definition += `  description: '${equipment.description}',\n`;
    definition += `  requiresAmmo: ${equipment.requiresAmmo},\n`;
    definition += `  introductionYear: ${equipment.introductionYear},\n`;
    definition += `  rulesLevel: '${equipment.rulesLevel}',\n`;

    if (equipment.techRating) {
      definition += `  techRating: '${equipment.techRating}',\n`;
    }

    if (equipment.sourceBook) {
      definition += `  sourceBook: '${equipment.sourceBook}',\n`;
    }

    if (equipment.pageReference) {
      definition += `  pageReference: '${equipment.pageReference}',\n`;
    }

    definition += `  variants: {\n`;
    Object.entries(equipment.variants).forEach(([techBase, variant]) => {
      definition += `    ${techBase}: {\n`;
      Object.entries(variant).forEach(([key, value]) => {
        if (typeof value === 'string') {
          definition += `      ${key}: '${value}',\n`;
        } else {
          definition += `      ${key}: ${value},\n`;
        }
      });
      definition += `    },\n`;
    });
    definition += `  }\n`;
    definition += `};\n`;

    return definition;
  }

  /**
   * Update the main index file with new exports
   */
  private async updateIndexFile(): Promise<void> {
    console.log('📄 Updating index file...');

    let indexContent = `import { Equipment } from './types';\n`;

    // Add imports for all new files
    const imports: string[] = [];
    const exports: string[] = [];

    for (const filename of this.migrationResults.keys()) {
      const moduleName = filename.replace('.ts', '');
      const exportName = moduleName.toUpperCase().replace(/-/g, '_');

      imports.push(`import { ${exportName} } from './${moduleName}';`);
      exports.push(`  ${moduleName.replace(/-/g, '')}: ${exportName}`);
    }

    indexContent += imports.join('\n') + '\n\n';
    indexContent += `export * from './types';\n`;
    indexContent += `export { BROWSABLE_CATEGORIES, SPECIAL_CATEGORIES, ALL_CATEGORIES } from './types';\n\n`;

    indexContent += `export const EQUIPMENT_DATABASE = {\n`;
    indexContent += exports.join(',\n') + '\n';
    indexContent += `};\n\n`;

    // Create flattened export
    const allExports = Array.from(this.migrationResults.keys()).map(
      (filename) =>
        filename.replace('.ts', '').toUpperCase().replace(/-/g, '_'),
    );

    indexContent += `// Flattened list of all equipment with tech base variants\n`;
    indexContent += `export const ALL_EQUIPMENT_VARIANTS = [\n`;
    indexContent += allExports.map((exp) => `  ...${exp}`).join(',\n') + '\n';
    indexContent += `];\n`;

    const indexPath = path.join(this.config.targetDir, 'index.ts');
    fs.writeFileSync(indexPath, indexContent, 'utf8');
    console.log('  ✓ Updated index.ts');
  }

  /**
   * Print migration summary
   */
  private printMigrationSummary(): void {
    console.log('\n📊 Migration Summary:');
    console.log('='.repeat(50));

    let totalFiles = 0;
    let totalEquipment = 0;

    for (const [filename, equipment] of this.migrationResults.entries()) {
      console.log(`${filename}: ${equipment.length} items`);
      totalFiles++;
      totalEquipment += equipment.length;
    }

    console.log('='.repeat(50));
    console.log(
      `Total: ${totalFiles} files, ${totalEquipment} equipment items`,
    );
    console.log(
      `Bundle optimization: ~${Math.round(((totalFiles - 3) / 3) * 100)}% improvement in granularity`,
    );
  }
}

// Export for external use
export { EquipmentMigrationScript, MIGRATION_RULES };

// CLI execution
if (require.main === module) {
  const config: MigrationConfig = {
    sourceDir: path.join(__dirname, '../../src/data/equipment'),
    targetDir: path.join(__dirname, '../../src/data/equipment-migrated'),
    backupDir: path.join(__dirname, '../../src/data/equipment-backup'),
    validateIntegrity: true,
  };

  const migration = new EquipmentMigrationScript(config);
  migration.execute().catch(console.error);
}
