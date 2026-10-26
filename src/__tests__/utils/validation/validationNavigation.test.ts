import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import { UnitValidationSeverity } from '@/types/validation/UnitValidationInterfaces';
import {
  CATEGORY_TAB_MAP,
  TAB_LABELS,
  getTabForCategory,
  getTabLabel,
  getFixTabsForCategory,
  getPrimaryFixTab,
  countValidationIssuesByTab,
  createEmptyValidationCounts,
} from '@/utils/validation/validationNavigation';

describe('validationNavigation', () => {
  describe('getFixTabsForCategory', () => {
    it('offers equipment and armor for weight issues; its own tab stays Structure', () => {
      expect(getFixTabsForCategory(ValidationCategory.WEIGHT)).toEqual([
        'equipment',
        'armor',
      ]);
      expect(getTabForCategory(ValidationCategory.WEIGHT)).toBe('structure');
    });

    it('offers the owning tab for every other category', () => {
      for (const category of Object.values(ValidationCategory)) {
        if (category === ValidationCategory.WEIGHT) continue;
        expect(getFixTabsForCategory(category)).toEqual([
          CATEGORY_TAB_MAP[category],
        ]);
      }
    });
  });

  describe('getPrimaryFixTab', () => {
    it('is the first fix tab: Equipment for weight, the owning tab otherwise', () => {
      expect(getPrimaryFixTab(ValidationCategory.WEIGHT)).toBe('equipment');
      for (const category of Object.values(ValidationCategory)) {
        expect(getPrimaryFixTab(category)).toBe(
          getFixTabsForCategory(category)[0],
        );
      }
    });
  });

  describe('countValidationIssuesByTab', () => {
    const issue = (
      category: ValidationCategory,
      severity: UnitValidationSeverity,
    ) => ({
      id: 'x',
      ruleId: 'r',
      ruleName: 'Rule',
      severity,
      category,
      message: 'm',
    });

    it('returns empty counts without a result', () => {
      expect(countValidationIssuesByTab(null)).toEqual(
        createEmptyValidationCounts(),
      );
    });

    it('counts each issue once, on the tab where it is fixed', () => {
      const counts = countValidationIssuesByTab({
        results: [
          {
            ruleId: 'weight',
            ruleName: 'Weight',
            passed: false,
            errors: [
              issue(
                ValidationCategory.WEIGHT,
                UnitValidationSeverity.CRITICAL_ERROR,
              ),
            ],
            warnings: [
              issue(ValidationCategory.SLOTS, UnitValidationSeverity.WARNING),
            ],
            infos: [
              issue(ValidationCategory.HEAT, UnitValidationSeverity.INFO),
            ],
            executionTime: 0,
          },
        ],
      } as unknown as Parameters<typeof countValidationIssuesByTab>[0]);

      expect(counts.equipment).toEqual({ errors: 1, warnings: 0, infos: 1 });
      expect(counts.structure).toEqual({ errors: 0, warnings: 0, infos: 0 });
      expect(counts.armor.errors).toBe(0);
      expect(counts.criticals).toEqual({ errors: 0, warnings: 1, infos: 0 });
    });
  });

  describe('CATEGORY_TAB_MAP', () => {
    it('should map WEIGHT to structure tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.WEIGHT]).toBe('structure');
    });

    it('should map SLOTS to criticals tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.SLOTS]).toBe('criticals');
    });

    it('should map TECH_BASE to overview tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.TECH_BASE]).toBe('overview');
    });

    it('should map ERA to structure tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.ERA]).toBe('structure');
    });

    it('should map CONSTRUCTION to structure tab', () => {
      expect(CATEGORY_TAB_MAP[ValidationCategory.CONSTRUCTION]).toBe(
        'structure',
      );
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
        'overview',
        'structure',
        'armor',
        'weapons',
        'equipment',
        'criticals',
        'fluff',
        'preview',
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
