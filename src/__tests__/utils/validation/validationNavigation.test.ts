import {
  CATEGORY_TAB_MAP,
  TAB_LABELS,
  getTabForCategory,
  getTabLabel,
  createEmptyValidationCounts,
  ValidationCountsByTab,
} from '@/utils/validation/validationNavigation';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';

describe('validationNavigation', () => {
  describe('CATEGORY_TAB_MAP', () => {
    it('should map WEIGHT to structure tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.WEIGHT]).toBe('structure');
    });

    it('should map SLOTS to criticals tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.SLOTS]).toBe('criticals');
    });

    it('should map TECH_BASE to structure tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.TECH_BASE]).toBe('structure');
    });

    it('should map ERA to structure tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.ERA]).toBe('structure');
    });

    it('should map CONSTRUCTION to structure tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.CONSTRUCTION]).toBe('structure');
    });

    it('should map EQUIPMENT to equipment tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.EQUIPMENT]).toBe('equipment');
    });

    it('should map MOVEMENT to structure tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.MOVEMENT]).toBe('structure');
    });

    it('should map ARMOR to armor tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.ARMOR]).toBe('armor');
    });

    it('should map HEAT to equipment tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.HEAT]).toBe('equipment');
    });

    it('should have mappings for all ValidationCategory values', () => {
      const allCategories = Object.values(ValidationCategory);
      allCategories.forEach((category) => {
        expect(CATEGORY_TAB_MAP[category]).toBeDefined();
      });
    });
  });

  describe('TAB_LABELS', () => {
    it('should have labels for all customizer tabs', () => {
      const expectedTabs: CustomizerTabId[] = [
        'overview', 'structure', 'armor', 'weapons', 
        'equipment', 'criticals', 'fluff', 'preview'
      ];
      
      expectedTabs.forEach((tabId) => {
        expect(TAB_LABELS[tabId]).toBeDefined();
        expect(typeof TAB_LABELS[tabId]).toBe('string');
        expect(TAB_LABELS[tabId].length).toBeGreaterThan(0);
      });
    });

    it('should return human-readable labels', () => {
      expect(TAB_LABELS.structure).toBe('Structure');
      expect(TAB_LABELS.criticals).toBe('Critical Slots');
      expect(TAB_LABELS.armor).toBe('Armor');
      expect(TAB_LABELS.equipment).toBe('Equipment');
    });
  });

  describe('getTabForCategory', () => {
    it('should return correct tab for each category', () => {
      expect(getTabForCategory(ValidationCategory.ARMOR)).toBe('armor');
      expect(getTabForCategory(ValidationCategory.SLOTS)).toBe('criticals');
      expect(getTabForCategory(ValidationCategory.EQUIPMENT)).toBe('equipment');
      expect(getTabForCategory(ValidationCategory.WEIGHT)).toBe('structure');
    });

    it('should return structure as fallback for unknown category', () => {
      const unknownCategory = 'UNKNOWN' as ValidationCategory;
      expect(getTabForCategory(unknownCategory)).toBe('structure');
    });
  });

  describe('getTabLabel', () => {
    it('should return correct label for each tab', () => {
      expect(getTabLabel('armor')).toBe('Armor');
      expect(getTabLabel('structure')).toBe('Structure');
      expect(getTabLabel('criticals')).toBe('Critical Slots');
      expect(getTabLabel('equipment')).toBe('Equipment');
    });

    it('should return tab ID as fallback for unknown tab', () => {
      const unknownTab = 'unknown-tab' as CustomizerTabId;
      expect(getTabLabel(unknownTab)).toBe('unknown-tab');
    });
  });

  describe('createEmptyValidationCounts', () => {
    it('should return object with all tabs', () => {
      const counts = createEmptyValidationCounts();
      
      expect(counts.overview).toBeDefined();
      expect(counts.structure).toBeDefined();
      expect(counts.armor).toBeDefined();
      expect(counts.weapons).toBeDefined();
      expect(counts.equipment).toBeDefined();
      expect(counts.criticals).toBeDefined();
      expect(counts.fluff).toBeDefined();
      expect(counts.preview).toBeDefined();
    });

    it('should initialize all counts to zero', () => {
      const counts = createEmptyValidationCounts();
      
      Object.values(counts).forEach((tabCounts) => {
        expect(tabCounts.errors).toBe(0);
        expect(tabCounts.warnings).toBe(0);
        expect(tabCounts.infos).toBe(0);
      });
    });

    it('should return a new object each time', () => {
      const counts1 = createEmptyValidationCounts();
      const counts2 = createEmptyValidationCounts();
      
      expect(counts1).not.toBe(counts2);
      
      counts1.structure.errors = 5;
      expect(counts2.structure.errors).toBe(0);
    });
  });
});
