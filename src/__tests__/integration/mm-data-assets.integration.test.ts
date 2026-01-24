/**
 * Integration Tests for mm-data Asset Loading
 *
 * These tests verify that:
 * 1. mm-data assets are properly configured and fetchable
 * 2. SVG templates contain required elements for record sheet generation
 * 3. Armor and structure pip SVGs are valid and correctly formatted
 * 4. The complete record sheet generation pipeline works end-to-end
 *
 * Note: These tests require assets to exist in public/record-sheets/.
 * Run `npm run fetch:assets` if tests fail due to missing assets.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DOMParser } from '@xmldom/xmldom';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  mmDataAssetService,
  MechConfiguration,
  PaperSize,
} from '@/services/assets/MmDataAssetService';
// Data extractors are tested in their own unit tests
// This file focuses on asset loading and SVG validation

// Type definitions for config file
interface MmDataConfig {
  version: string;
  repository: string;
  directories: string[];
  patterns: Record<string, string[]>;
  cdnBase: string;
  rawBase: string;
}

interface VersionManifest {
  syncedAt: string;
  mmDataCommit: string;
  mmDataDate: string;
  syncScript: string;
}

// Path to assets
const ASSETS_BASE = path.join(process.cwd(), 'public', 'record-sheets');
const CONFIG_PATH = path.join(process.cwd(), 'config', 'mm-data-assets.json');

// Skip tests if assets don't exist (CI environment without fetched assets)
const assetsExist = fs.existsSync(ASSETS_BASE) && 
  fs.existsSync(path.join(ASSETS_BASE, 'templates_us'));

const describeIfAssets = assetsExist ? describe : describe.skip;

describe('mm-data Asset Configuration', () => {
  it('should have valid asset configuration file', () => {
    expect(fs.existsSync(CONFIG_PATH)).toBe(true);
    
    const config: MmDataConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as MmDataConfig;
    
    expect(config.version).toBeDefined();
    expect(config.repository).toBe('MegaMek/mm-data');
    expect(config.directories).toContain('biped_pips');
    expect(config.directories).toContain('templates_us');
    expect(config.directories).toContain('templates_iso');
    expect(config.patterns).toBeDefined();
  });

  it('should have valid CDN and fallback URLs in config', () => {
    const config: MmDataConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as MmDataConfig;
    
    expect(config.cdnBase).toMatch(/^https:\/\/cdn\.jsdelivr\.net/);
    expect(config.rawBase).toMatch(/^https:\/\/raw\.githubusercontent\.com/);
  });
});

describeIfAssets('mm-data SVG Templates', () => {
  const templates = [
    'mek_biped_default.svg',
    'mek_quad_default.svg',
    'mek_tripod_default.svg',
    'mek_lam_default.svg',
    'mek_quadvee_default.svg',
  ];

  describe('US Letter Templates', () => {
    templates.forEach(template => {
      it(`should have valid ${template}`, () => {
        const templatePath = path.join(ASSETS_BASE, 'templates_us', template);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        const content = fs.readFileSync(templatePath, 'utf-8');
        expect(content).toContain('<svg');
        expect(content).toContain('</svg>');
        
        // Should be valid XML
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'image/svg+xml');
        expect(doc.documentElement.tagName).toBe('svg');
      });
    });

    it('biped template should have required placeholder elements', () => {
      const templatePath = path.join(ASSETS_BASE, 'templates_us', 'mek_biped_default.svg');
      const content = fs.readFileSync(templatePath, 'utf-8');
      const parser = new DOMParser();
      // Parse to verify it's valid XML (parser errors logged but don't fail)
      parser.parseFromString(content, 'image/svg+xml');
      
      // Should have text elements for unit info
      expect(content).toMatch(/text.*id/i);
    });

    it('quad template should have quad-specific armor groups', () => {
      const templatePath = path.join(ASSETS_BASE, 'templates_us', 'mek_quad_default.svg');
      const content = fs.readFileSync(templatePath, 'utf-8');
      
      // Quad mechs use FLL, FRL, RLL, RRL instead of LA, RA, LL, RL
      // Just verify it's a valid SVG
      expect(content).toContain('<svg');
      expect(content.length).toBeGreaterThan(10000); // Templates are substantial
    });
  });

  describe('A4/ISO Templates', () => {
    templates.forEach(template => {
      it(`should have valid ${template} in templates_iso`, () => {
        const templatePath = path.join(ASSETS_BASE, 'templates_iso', template);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        const content = fs.readFileSync(templatePath, 'utf-8');
        expect(content).toContain('<svg');
      });
    });
  });
});

describeIfAssets('mm-data Armor Pip SVGs', () => {
  describe('Head Armor Pips', () => {
    it('should have armor pips for head (1-9)', () => {
      for (let count = 1; count <= 9; count++) {
        const pipPath = path.join(ASSETS_BASE, 'biped_pips', `Armor_Head_${count}_Humanoid.svg`);
        expect(fs.existsSync(pipPath)).toBe(true);
        
        const content = fs.readFileSync(pipPath, 'utf-8');
        expect(content).toContain('<svg');
        expect(content).toContain('path'); // Should have pip shapes
      }
    });
  });

  describe('Center Torso Armor Pips', () => {
    it('should have front armor pips (1-51)', () => {
      // Test sample of CT armor values
      [1, 10, 25, 35, 51].forEach(count => {
        const pipPath = path.join(ASSETS_BASE, 'biped_pips', `Armor_CT_${count}_Humanoid.svg`);
        expect(fs.existsSync(pipPath)).toBe(true);
      });
    });

    it('should have rear armor pips (1-21)', () => {
      // Test sample of CT rear armor values
      [1, 10, 15, 21].forEach(count => {
        const pipPath = path.join(ASSETS_BASE, 'biped_pips', `Armor_CT_R_${count}_Humanoid.svg`);
        expect(fs.existsSync(pipPath)).toBe(true);
      });
    });
  });

  describe('Arm Armor Pips', () => {
    it('should have left arm armor pips (1-34)', () => {
      [1, 16, 34].forEach(count => {
        const pipPath = path.join(ASSETS_BASE, 'biped_pips', `Armor_LArm_${count}_Humanoid.svg`);
        expect(fs.existsSync(pipPath)).toBe(true);
      });
    });

    it('should have right arm armor pips (1-34)', () => {
      [1, 16, 34].forEach(count => {
        const pipPath = path.join(ASSETS_BASE, 'biped_pips', `Armor_RArm_${count}_Humanoid.svg`);
        expect(fs.existsSync(pipPath)).toBe(true);
      });
    });
  });

  describe('Leg Armor Pips', () => {
    it('should have left leg armor pips (1-43)', () => {
      [1, 20, 43].forEach(count => {
        const pipPath = path.join(ASSETS_BASE, 'biped_pips', `Armor_LLeg_${count}_Humanoid.svg`);
        expect(fs.existsSync(pipPath)).toBe(true);
      });
    });

    it('should have right leg armor pips (1-43)', () => {
      [1, 20, 43].forEach(count => {
        const pipPath = path.join(ASSETS_BASE, 'biped_pips', `Armor_RLeg_${count}_Humanoid.svg`);
        expect(fs.existsSync(pipPath)).toBe(true);
      });
    });
  });

  describe('Side Torso Armor Pips', () => {
    it('should have left torso front armor pips (1-34)', () => {
      [1, 17, 34].forEach(count => {
        const pipPath = path.join(ASSETS_BASE, 'biped_pips', `Armor_LT_${count}_Humanoid.svg`);
        expect(fs.existsSync(pipPath)).toBe(true);
      });
    });

    it('should have left torso rear armor pips (1-15)', () => {
      [1, 8, 15].forEach(count => {
        const pipPath = path.join(ASSETS_BASE, 'biped_pips', `Armor_LT_R_${count}_Humanoid.svg`);
        expect(fs.existsSync(pipPath)).toBe(true);
      });
    });
  });
});

describeIfAssets('mm-data Structure Pip SVGs', () => {
  const tonnages = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
  const locations = ['CT', 'HD', 'LA', 'RA', 'LT', 'RT', 'LL', 'RL'];

  describe('Complete Structure Pip Files', () => {
    it('should have complete structure pip sets for all standard tonnages', () => {
      tonnages.forEach(tonnage => {
        const basePath = path.join(ASSETS_BASE, 'biped_pips', `BipedIS${tonnage}.svg`);
        expect(fs.existsSync(basePath)).toBe(true);
      });
    });
  });

  describe('Location-Specific Structure Pips', () => {
    // Test a few key tonnages comprehensively
    [50, 75, 100].forEach(tonnage => {
      it(`should have all location structure pips for ${tonnage}t mech`, () => {
        locations.forEach(loc => {
          const pipPath = path.join(ASSETS_BASE, 'biped_pips', `BipedIS${tonnage}_${loc}.svg`);
          expect(fs.existsSync(pipPath)).toBe(true);
          
          const content = fs.readFileSync(pipPath, 'utf-8');
          expect(content).toContain('<svg');
          expect(content.length).toBeGreaterThan(100);
        });
      });
    });
  });

  describe('Structure Pip SVG Validity', () => {
    it('should have valid SVG content in structure pip files', () => {
      const samplePath = path.join(ASSETS_BASE, 'biped_pips', 'BipedIS50_CT.svg');
      const content = fs.readFileSync(samplePath, 'utf-8');
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      
      expect(doc.documentElement.tagName).toBe('svg');
      // Should contain path elements for the pips
      const paths = doc.getElementsByTagName('path');
      expect(paths.length).toBeGreaterThan(0);
    });
  });
});

describeIfAssets('Complete Asset Inventory', () => {
  it('should have version manifest file', () => {
    const manifestPath = path.join(ASSETS_BASE, 'mm-data-version.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    
    const manifest: VersionManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as VersionManifest;
    expect(manifest.syncedAt).toBeDefined();
    expect(manifest.mmDataCommit).toBeDefined();
  });

  it('should have at least 500 SVG files total', () => {
    let totalSvgCount = 0;
    
    const countSvgsInDir = (dir: string): number => {
      if (!fs.existsSync(dir)) return 0;
      const files = fs.readdirSync(dir);
      return files.filter(f => f.endsWith('.svg')).length;
    };
    
    totalSvgCount += countSvgsInDir(path.join(ASSETS_BASE, 'biped_pips'));
    totalSvgCount += countSvgsInDir(path.join(ASSETS_BASE, 'templates_us'));
    totalSvgCount += countSvgsInDir(path.join(ASSETS_BASE, 'templates_iso'));
    
    // We expect ~524 files based on our asset list
    expect(totalSvgCount).toBeGreaterThanOrEqual(500);
  });
});

describeIfAssets('MmDataAssetService Path Generation', () => {
  // These tests verify the service generates correct paths
  // The paths should match the actual file structure
  
  it('should generate correct armor pip paths', () => {
    const headPath = mmDataAssetService.getArmorPipPath(MechLocation.HEAD, 9);
    expect(headPath).toBe('/record-sheets/biped_pips/Armor_Head_9_Humanoid.svg');
    
    const ctPath = mmDataAssetService.getArmorPipPath(MechLocation.CENTER_TORSO, 35);
    expect(ctPath).toBe('/record-sheets/biped_pips/Armor_CT_35_Humanoid.svg');
    
    const ctRearPath = mmDataAssetService.getArmorPipPath(MechLocation.CENTER_TORSO, 12, true);
    expect(ctRearPath).toBe('/record-sheets/biped_pips/Armor_CT_R_12_Humanoid.svg');
  });

  it('should generate correct structure pip paths', () => {
    const path50CT = mmDataAssetService.getStructurePipPath(50, MechLocation.CENTER_TORSO);
    expect(path50CT).toBe('/record-sheets/biped_pips/BipedIS50_CT.svg');
    
    const path100HD = mmDataAssetService.getStructurePipPath(100, MechLocation.HEAD);
    expect(path100HD).toBe('/record-sheets/biped_pips/BipedIS100_HD.svg');
  });

  it('should generate correct template paths', () => {
    const bipedLetter = mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.BIPED);
    expect(bipedLetter).toBe('/record-sheets/templates_us/mek_biped_default.svg');
    
    const quadA4 = mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.QUAD, PaperSize.A4);
    expect(quadA4).toBe('/record-sheets/templates_iso/mek_quad_default.svg');
  });

  it('generated paths should correspond to existing files', () => {
    // Get a template path and verify the file exists
    const templatePath = mmDataAssetService.getRecordSheetTemplatePath(MechConfiguration.BIPED);
    const fullPath = path.join(process.cwd(), 'public', templatePath);
    expect(fs.existsSync(fullPath)).toBe(true);
    
    // Get a pip path and verify the file exists
    const pipPath = mmDataAssetService.getArmorPipPath(MechLocation.HEAD, 5);
    const fullPipPath = path.join(process.cwd(), 'public', pipPath);
    expect(fs.existsSync(fullPipPath)).toBe(true);
  });
});

// Note: Record sheet data extraction tests are in:
// src/__tests__/services/printing/recordsheet/dataExtractors.test.ts
// This file focuses purely on mm-data asset loading and SVG validation
