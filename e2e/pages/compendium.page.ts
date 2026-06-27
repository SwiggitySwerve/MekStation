/**
 * Compendium Page Object
 *
 * Page object for testing the compendium (reference database) pages:
 * - Compendium hub
 * - Units browser
 * - Equipment browser
 * - Rules reference
 */

import { Page, Locator } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * Compendium Hub Page
 * Main entry point for the compendium section.
 */
export class CompendiumPage extends BasePage {
  // Navigation elements
  readonly title: Locator;
  readonly searchInput: Locator;
  readonly clearSearchButton: Locator;

  // Category sections
  readonly unitsSection: Locator;
  readonly equipmentSection: Locator;
  readonly rulesSection: Locator;

  // Category cards
  readonly unitDatabaseCard: Locator;
  readonly equipmentCatalogCard: Locator;
  readonly ruleCategoryCards: Locator;

  // Quick reference
  readonly quickReferenceCard: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation elements
    this.title = page.getByTestId('compendium-title');
    this.searchInput = page.getByTestId('compendium-search');
    this.clearSearchButton = page.getByTestId('compendium-clear-search');

    // Sections
    this.unitsSection = page.getByTestId('compendium-units-section');
    this.equipmentSection = page.getByTestId('compendium-equipment-section');
    this.rulesSection = page.getByTestId('compendium-rules-section');

    // Cards - fallback to text/role selectors when testids aren't present
    this.unitDatabaseCard = page.getByRole('link', { name: /unit database/i });
    this.equipmentCatalogCard = page.getByRole('link', {
      name: /equipment catalog/i,
    });
    this.ruleCategoryCards = page.locator('[data-testid^="rule-category-"]');

    // Quick reference
    this.quickReferenceCard = page.getByTestId('compendium-quick-reference');
  }

  async goto(): Promise<void> {
    await this.page.goto('/compendium');
    await this.waitForPageLoad();
  }

  protected async waitForPageLoad(): Promise<void> {
    // Wait for page content to load - use heading as indicator
    await this.page
      .getByRole('heading', { name: /compendium/i })
      .first()
      .waitFor();
  }

  async search(query: string): Promise<void> {
    const searchInput = this.page.getByPlaceholder(/search/i);
    await searchInput.fill(query);
  }

  async getRuleSectionCount(): Promise<number> {
    // Count the rule category cards in the rules section
    return await this.page
      .locator('section')
      .filter({ hasText: /construction rules/i })
      .getByRole('link')
      .count();
  }
}

/**
 * Unit Browser Page
 * Browse and search custom units.
 */
export class UnitBrowserPage extends BasePage {
  // Header elements
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly viewModeToggle: Locator;

  // Filter panel
  readonly filterPanel: Locator;
  readonly unitTypeFilter: Locator;
  readonly techBaseFilter: Locator;
  readonly rulesLevelFilter: Locator;
  readonly weightClassFilter: Locator;
  readonly clearFiltersButton: Locator;

  // Content
  readonly unitList: Locator;
  readonly unitCards: Locator;
  readonly unitTableRows: Locator;
  readonly emptyState: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    super(page);

    // Header elements
    this.title = page.getByTestId('unit-browser-title');
    this.subtitle = page.getByTestId('unit-browser-subtitle');
    // Actual UI placeholder reads "Search chassis, model, or variant..." —
    // the old `/search units/i` regex didn't match. PT-006.
    this.searchInput = page.getByPlaceholder(/search chassis/i);
    this.filterButton = page.getByRole('button', { name: /filters/i });
    this.viewModeToggle = page.getByTestId('view-mode-toggle');

    // Filter panel — `UnitsFilters.tsx` currently exposes tech base, weight
    // class, and rules level dropdowns. There is no "filter by unit type"
    // dropdown in the units page UI (units are filtered by tech base /
    // weight class / rules level only). `unitTypeFilter` is kept here to
    // preserve the page-object API for downstream tests but is aliased to
    // the tech-base filter — a future UI-feature change could surface a
    // proper unit-type selector and this alias would be replaced. PT-006.
    this.filterPanel = page.getByTestId('unit-browser-filter-panel');
    this.techBaseFilter = page.getByLabel(/filter by tech base/i);
    this.unitTypeFilter = this.techBaseFilter;
    this.rulesLevelFilter = page.getByLabel(/filter by rules level/i);
    this.weightClassFilter = page.getByLabel(/filter by weight class/i);
    this.clearFiltersButton = page.getByRole('button', { name: /clear all/i });

    // Content
    this.unitList = page.getByTestId('unit-browser-list');
    this.unitCards = page.locator('[data-testid^="unit-card-"]');
    this.unitTableRows = page.locator('table tbody tr');
    this.emptyState = page.getByTestId('unit-browser-empty');
    this.pagination = page.getByTestId('unit-browser-pagination');
  }

  async goto(): Promise<void> {
    await this.page.goto('/compendium/units');
    await this.waitForPageLoad();
  }

  protected async waitForPageLoad(): Promise<void> {
    // Wait for the page to load - use heading as indicator
    await this.page
      .getByRole('heading', { name: /unit database/i })
      .first()
      .waitFor();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Wait for filtering to apply
    await this.page.waitForTimeout(300);
  }

  async openFilters(): Promise<void> {
    await this.filterButton.click();
  }
}

/**
 * Read-only helpers for the unit browser page.
 */
export class UnitBrowserReadPage extends BasePage {
  async getDisplayedUnitCount(): Promise<number> {
    // Try table rows first (default view), then cards
    const tableCount = await this.page.locator('table tbody tr').count();
    if (tableCount > 0) return tableCount;

    return await this.page.locator('[data-testid^="unit-card-"]').count();
  }

  async getSubtitleText(): Promise<string> {
    // Subtitle reads "Browse {N} canonical units from all eras" — match the
    // distinctive "canonical units" phrase rather than requiring the text to
    // end with "units" (the trailing "from all eras" used to break this
    // locator). PT-006.
    const subtitleElement = this.page
      .locator('p')
      .filter({ hasText: /canonical units/i })
      .first();
    return (await subtitleElement.textContent()) || '';
  }
}

/**
 * Equipment Browser Page
 * Browse and search the equipment catalog.
 */
export class EquipmentBrowserPage extends BasePage {
  // Header elements
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;
  readonly viewModeToggle: Locator;

  // Filter panel
  readonly filterPanel: Locator;
  readonly categoryFilter: Locator;
  readonly techBaseFilter: Locator;
  readonly rulesLevelFilter: Locator;
  readonly clearFiltersButton: Locator;

  // Content
  readonly equipmentList: Locator;
  readonly equipmentCards: Locator;
  readonly equipmentTableRows: Locator;
  readonly emptyState: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    super(page);

    // Header elements
    this.title = page.getByTestId('equipment-browser-title');
    this.subtitle = page.getByTestId('equipment-browser-subtitle');
    this.searchInput = page.getByPlaceholder(/search/i);
    this.filterButton = page.getByRole('button', { name: /filters/i });
    this.viewModeToggle = page.getByTestId('view-mode-toggle');

    // Filter panel
    this.filterPanel = page.getByTestId('equipment-browser-filter-panel');
    this.categoryFilter = page.getByLabel(/filter by category/i);
    this.techBaseFilter = page.getByLabel(/filter by tech base/i);
    this.rulesLevelFilter = page.getByLabel(/filter by rules level/i);
    this.clearFiltersButton = page.getByRole('button', { name: /clear all/i });

    // Content
    this.equipmentList = page.getByTestId('equipment-browser-list');
    this.equipmentCards = page.locator('[data-testid^="equipment-card-"]');
    this.equipmentTableRows = page.locator('table tbody tr');
    this.emptyState = page.getByTestId('equipment-browser-empty');
    this.pagination = page.getByTestId('equipment-browser-pagination');
  }

  async goto(): Promise<void> {
    await this.page.goto('/compendium/equipment');
    await this.waitForPageLoad();
  }

  protected async waitForPageLoad(): Promise<void> {
    // Wait for the page to load - use heading as indicator
    await this.page
      .getByRole('heading', { name: /equipment catalog/i })
      .first()
      .waitFor();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Wait for filtering to apply
    await this.page.waitForTimeout(300);
  }

  async openFilters(): Promise<void> {
    await this.filterButton.click();
  }

  async clickEquipment(index: number = 0): Promise<void> {
    const tableRows = this.equipmentTableRows;
    if ((await tableRows.count()) > 0) {
      await tableRows.nth(index).click();
    } else {
      await this.equipmentCards.nth(index).click();
    }
  }
}

/**
 * Read-only helpers for the equipment browser page.
 */
export class EquipmentBrowserReadPage extends BasePage {
  async getDisplayedEquipmentCount(): Promise<number> {
    // Try table rows first (default view), then cards
    const tableCount = await this.page.locator('table tbody tr').count();
    if (tableCount > 0) return tableCount;

    return await this.page.locator('[data-testid^="equipment-card-"]').count();
  }

  async getSubtitleText(): Promise<string> {
    // The subtitle shows the item count
    const subtitleElement = this.page
      .locator('p')
      .filter({ hasText: /items?$/i })
      .first();
    return (await subtitleElement.textContent()) || '';
  }
}
