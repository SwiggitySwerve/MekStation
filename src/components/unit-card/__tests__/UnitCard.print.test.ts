/**
 * Unit Card Print CSS Tests
 *
 * Verifies that print styles are properly structured and contain
 * necessary rules for print output.
 */

import fs from 'fs';
import path from 'path';

// =============================================================================
// Test Helpers
// =============================================================================

const PRINT_CSS_PATH = path.join(__dirname, '..', 'UnitCard.print.css');

function readCSSFile(): string {
  return fs.readFileSync(PRINT_CSS_PATH, 'utf-8');
}

// =============================================================================
// Tests
// =============================================================================

describe('UnitCard.print.css', () => {
  let cssContent: string;

  beforeAll(() => {
    cssContent = readCSSFile();
  });

  describe('file structure', () => {
    it('should exist', () => {
      expect(fs.existsSync(PRINT_CSS_PATH)).toBe(true);
    });

    it('should not be empty', () => {
      expect(cssContent.length).toBeGreaterThan(0);
    });

    it('should have @media print query', () => {
      expect(cssContent).toContain('@media print');
    });
  });

  describe('page setup', () => {
    it('should define @page rules', () => {
      expect(cssContent).toContain('@page');
    });

    it('should set page margins', () => {
      expect(cssContent).toMatch(/margin:\s*\d+mm/);
    });
  });

  describe('hidden elements', () => {
    it('should hide navigation elements', () => {
      expect(cssContent).toContain('nav');
      expect(cssContent).toMatch(/display:\s*none\s*!important/);
    });

    it('should hide buttons', () => {
      expect(cssContent).toContain('button');
    });

    it('should hide interactive elements', () => {
      expect(cssContent).toContain('input');
      expect(cssContent).toContain('select');
    });

    it('should have .no-print class for hiding elements', () => {
      expect(cssContent).toContain('.no-print');
    });
  });

  describe('unit card styling', () => {
    it('should target unit-card class', () => {
      expect(cssContent).toContain('.unit-card');
    });

    it('should remove box-shadow for print', () => {
      expect(cssContent).toMatch(/box-shadow:\s*none\s*!important/);
    });

    it('should set white background for print', () => {
      expect(cssContent).toMatch(/background(-color)?:\s*#fff\s*!important/);
    });
  });

  describe('typography', () => {
    it('should set body font for print', () => {
      expect(cssContent).toMatch(/font-family:/);
    });

    it('should set text color to black', () => {
      expect(cssContent).toMatch(/color:\s*#000/);
    });
  });

  describe('table styling', () => {
    it('should have table rules for weapons list', () => {
      expect(cssContent).toContain('table');
    });

    it('should set border-collapse for tables', () => {
      expect(cssContent).toContain('border-collapse');
    });
  });

  describe('page break rules', () => {
    it('should have page-break-inside avoid for unit cards', () => {
      expect(cssContent).toMatch(/page-break-inside:\s*avoid/);
    });

    it('should have break-inside avoid (modern syntax)', () => {
      expect(cssContent).toMatch(/break-inside:\s*avoid/);
    });

    it('should have page-break-after avoid for headings', () => {
      expect(cssContent).toMatch(/page-break-after:\s*avoid/);
    });
  });

  describe('print utilities', () => {
    it('should have .print-only class', () => {
      expect(cssContent).toContain('.print-only');
    });

    it('should have page-break-before utility class', () => {
      expect(cssContent).toContain('.page-break-before');
    });

    it('should have page-break-after utility class', () => {
      expect(cssContent).toContain('.page-break-after');
    });
  });

  describe('color handling', () => {
    it('should set print-color-adjust', () => {
      expect(cssContent).toMatch(/print-color-adjust:\s*exact/);
    });

    it('should use high contrast colors', () => {
      // Headers should be dark
      expect(cssContent).toMatch(/background-color:\s*#1a1a1a/);
      // Text should be black
      expect(cssContent).toMatch(/color:\s*#000/);
    });
  });

  describe('badge styling', () => {
    it('should have badge rules', () => {
      expect(cssContent).toContain('.badge');
    });
  });

  describe('stats and movement', () => {
    it('should have stat item styling', () => {
      expect(cssContent).toContain('.stat-');
    });

    it('should have movement stats styling', () => {
      expect(cssContent).toContain('.movement-');
    });
  });

  describe('link handling', () => {
    it('should style links for print', () => {
      expect(cssContent).toMatch(/a\s*\{/);
    });

    it('should show URL after links', () => {
      expect(cssContent).toContain('attr(href)');
    });
  });
});

describe('Print CSS import in globals', () => {
  it('should be imported in globals.css', () => {
    const globalsPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'styles',
      'globals.css',
    );
    const globalsContent = fs.readFileSync(globalsPath, 'utf-8');

    expect(globalsContent).toContain('UnitCard.print.css');
  });
});
