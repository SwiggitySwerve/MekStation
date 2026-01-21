/**
 * Compendium Page Object
 *
 * Page object for testing the compendium (reference database) pages:
 * - Compendium hub
 * - Units browser
 * - Equipment browser
 * - Rules reference
 */

import { Page, Locator, expect } from '@playwright/test';
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
    this.equipmentCatalogCard = page.getByRole('link', { name: /equipment catalog/i });
    this.ruleCategoryCards = page.locator('[data-testid^="rule-category-"]');

    // Quick reference
    this.quickReferenceCard = page.getByTestId('compendium-quick-reference');
  }

  async goto(): Promise<void> {
    await this.page.goto('/compendium');
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    // Wait for page content to load - use heading as indicator
    await this.page.getByRole('heading', { name: /compendium/i }).first().waitFor();
  }

  async search(query: string): Promise<void> {
    const searchInput = this.page.getByPlaceholder(/search/i);
    await searchInput.fill(query);
  }

  async clearSearch(): Promise<void> {
    const clearButton = this.page.getByRole('button', { name: /clear search/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  }

  async navigateToUnits(): Promise<void> {
    await this.unitDatabaseCard.click();
    // Wait for navigation to complete
    await this.page.waitForURL(/\/compendium\/units/, { timeout: 10000 });
  }

  async navigateToEquipment(): Promise<void> {
    await this.equipmentCatalogCard.click();
    // Wait for navigation to complete
    await this.page.waitForURL(/\/compendium\/equipment/, { timeout: 10000 });
  }

  async navigateToRuleSection(sectionId: string): Promise<void> {
    // Find the card by its title text
    const ruleCard = this.page.locator('a').filter({ hasText: new RegExp(sectionId, 'i') }).first();
    await ruleCard.click();
    await this.page.waitForURL(new RegExp(`/compendium/rules/${sectionId}`), { timeout: 10000 });
  }

  async getRuleSectionCount(): Promise<number> {
    // Count the rule category cards in the rules section
    return await this.page.locator('section').filter({ hasText: /construction rules/i }).getByRole('link').count();
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
    this.searchInput = page.getByPlaceholder(/search units/i);
    this.filterButton = page.getByRole('button', { name: /filters/i });
    this.viewModeToggle = page.getByTestId('view-mode-toggle');

    // Filter panel
    this.filterPanel = page.getByTestId('unit-browser-filter-panel');
    this.unitTypeFilter = page.getByLabel(/filter by unit type/i);
    this.techBaseFilter = page.getByLabel(/filter by tech base/i);
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

  async waitForPageLoad(): Promise<void> {
    // Wait for the page to load - use heading as indicator
    await this.page.getByRole('heading', { name: /unit database/i }).first().waitFor();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Wait for filtering to apply
    await this.page.waitForTimeout(300);
  }

  async openFilters(): Promise<void> {
    await this.filterButton.click();
  }

  async filterByUnitType(type: string): Promise<void> {
    await this.openFilters();
    await this.unitTypeFilter.selectOption({ label: type });
  }

  async filterByTechBase(techBase: string): Promise<void> {
    await this.openFilters();
    await this.techBaseFilter.selectOption({ label: techBase });
  }

  async filterByWeightClass(weightClass: string): Promise<void> {
    await this.openFilters();
    await this.weightClassFilter.selectOption({ label: weightClass });
  }

  async clearFilters(): Promise<void> {
    if (await this.clearFiltersButton.isVisible()) {
      await this.clearFiltersButton.click();
    }
  }

  async setViewMode(mode: 'grid' | 'list' | 'table'): Promise<void> {
    const button = this.page.getByRole('button', { name: new RegExp(mode, 'i') });
    await button.click();
  }

  async getDisplayedUnitCount(): Promise<number> {
    // Try table rows first (default view), then cards
    const tableCount = await this.unitTableRows.count();
    if (tableCount > 0) return tableCount;

    return await this.unitCards.count();
  }

  async clickUnit(index: number = 0): Promise<void> {
    // Click a unit in the list (works for table or card view)
    const tableRows = this.unitTableRows;
    if (await tableRows.count() > 0) {
      await tableRows.nth(index).click();
    } else {
      await this.unitCards.nth(index).click();
    }
  }

  async getSubtitleText(): Promise<string> {
    // The subtitle shows the unit count
    const subtitleElement = this.page.locator('p').filter({ hasText: /units?$/i }).first();
    return await subtitleElement.textContent() || '';
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

  async waitForPageLoad(): Promise<void> {
    // Wait for the page to load - use heading as indicator
    await this.page.getByRole('heading', { name: /equipment catalog/i }).first().waitFor();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Wait for filtering to apply
    await this.page.waitForTimeout(300);
  }

  async openFilters(): Promise<void> {
    await this.filterButton.click();
  }

  async filterByCategory(category: string): Promise<void> {
    await this.openFilters();
    await this.categoryFilter.selectOption({ label: category });
  }

  async filterByTechBase(techBase: string): Promise<void> {
    await this.openFilters();
    await this.techBaseFilter.selectOption({ label: techBase });
  }

  async clearFilters(): Promise<void> {
    if (await this.clearFiltersButton.isVisible()) {
      await this.clearFiltersButton.click();
    }
  }

  async setViewMode(mode: 'grid' | 'list' | 'table'): Promise<void> {
    const button = this.page.getByRole('button', { name: new RegExp(mode, 'i') });
    await button.click();
  }

  async getDisplayedEquipmentCount(): Promise<number> {
    // Try table rows first (default view), then cards
    const tableCount = await this.equipmentTableRows.count();
    if (tableCount > 0) return tableCount;

    return await this.equipmentCards.count();
  }

  async clickEquipment(index: number = 0): Promise<void> {
    // Click an equipment item in the list
    const tableRows = this.equipmentTableRows;
    if (await tableRows.count() > 0) {
      await tableRows.nth(index).click();
    } else {
      await this.equipmentCards.nth(index).click();
    }
  }

  async getSubtitleText(): Promise<string> {
    // The subtitle shows the item count
    const subtitleElement = this.page.locator('p').filter({ hasText: /items?$/i }).first();
    return await subtitleElement.textContent() || '';
  }
}

/**
 * Rules Reference Page
 * View construction rules for a specific section.
 */
export class RulesReferencePage extends BasePage {
  // Page elements
  readonly title: Locator;
  readonly breadcrumbs: Locator;
  readonly backButton: Locator;
  readonly content: Locator;

  constructor(page: Page) {
    super(page);

    this.title = page.getByTestId('rules-page-title');
    this.breadcrumbs = page.getByTestId('rules-breadcrumbs');
    this.backButton = page.getByRole('link', { name: /back/i });
    this.content = page.getByTestId('rules-content');
  }

  async goto(sectionId: string): Promise<void> {
    await this.page.goto(`/compendium/rules/${sectionId}`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    // Wait for page content
    await this.page.locator('main').first().waitFor();
  }

  async goBack(): Promise<void> {
    await this.page.goBack();
  }
}

/**
 * Unit Detail Page
 * View full specifications for a single unit.
 */
export class UnitDetailPage extends BasePage {
  readonly title: Locator;
  readonly breadcrumbs: Locator;
  readonly unitTypeBadge: Locator;
  readonly techBaseBadge: Locator;
  readonly weightClassBadge: Locator;
  readonly editButton: Locator;

  // Stats sections
  readonly physicalPropertiesCard: Locator;
  readonly movementCard: Locator;
  readonly armorCard: Locator;
  readonly heatManagementCard: Locator;
  readonly equipmentTable: Locator;
  readonly quirksSection: Locator;
  readonly unitInfoCard: Locator;

  constructor(page: Page) {
    super(page);

    this.title = page.getByTestId('unit-detail-title');
    this.breadcrumbs = page.getByTestId('unit-detail-breadcrumbs');
    this.unitTypeBadge = page.getByTestId('unit-type-badge');
    this.techBaseBadge = page.getByTestId('tech-base-badge');
    this.weightClassBadge = page.getByTestId('weight-class-badge');
    this.editButton = page.getByRole('link', { name: /edit/i });

    // Stats sections
    this.physicalPropertiesCard = page.getByTestId('unit-physical-properties');
    this.movementCard = page.getByTestId('unit-movement');
    this.armorCard = page.getByTestId('unit-armor');
    this.heatManagementCard = page.getByTestId('unit-heat-management');
    this.equipmentTable = page.getByTestId('unit-equipment-table');
    this.quirksSection = page.getByTestId('unit-quirks');
    this.unitInfoCard = page.getByTestId('unit-info');
  }

  async goto(unitId: string): Promise<void> {
    await this.page.goto(`/compendium/units/${encodeURIComponent(unitId)}`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    // Wait for page to load
    await this.page.locator('main').first().waitFor();
  }

  async clickEdit(): Promise<void> {
    await this.editButton.click();
    await this.page.waitForURL(/\/customizer/);
  }
}

/**
 * Equipment Detail Page
 * View full specifications for a single equipment item.
 */
export class EquipmentDetailPage extends BasePage {
  readonly title: Locator;
  readonly breadcrumbs: Locator;
  readonly categoryBadge: Locator;
  readonly techBaseBadge: Locator;
  readonly rulesLevelBadge: Locator;

  // Stats sections
  readonly physicalPropertiesCard: Locator;
  readonly availabilityCard: Locator;
  readonly combatStatsCard: Locator;
  readonly rangeProfileCard: Locator;
  readonly specialRulesSection: Locator;
  readonly descriptionSection: Locator;

  constructor(page: Page) {
    super(page);

    this.title = page.getByTestId('equipment-detail-title');
    this.breadcrumbs = page.getByTestId('equipment-detail-breadcrumbs');
    this.categoryBadge = page.getByTestId('equipment-category-badge');
    this.techBaseBadge = page.getByTestId('tech-base-badge');
    this.rulesLevelBadge = page.getByTestId('rules-level-badge');

    // Stats sections
    this.physicalPropertiesCard = page.getByTestId('equipment-physical-properties');
    this.availabilityCard = page.getByTestId('equipment-availability');
    this.combatStatsCard = page.getByTestId('equipment-combat-stats');
    this.rangeProfileCard = page.getByTestId('equipment-range-profile');
    this.specialRulesSection = page.getByTestId('equipment-special-rules');
    this.descriptionSection = page.getByTestId('equipment-description');
  }

  async goto(equipmentId: string): Promise<void> {
    await this.page.goto(`/compendium/equipment/${encodeURIComponent(equipmentId)}`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    // Wait for page to load
    await this.page.locator('main').first().waitFor();
  }
}
