/**
 * Props for Filter Panel component for filtering data across tabs.
 * Supports multiple filter definitions with optional search functionality.
 *
 * @example
 * const props: IFilterPanelProps = {
 *   filters: [
 *     {
 *       id: 'severity',
 *       label: 'Severity',
 *       options: ['critical', 'warning', 'info'],
 *       optionLabels: { critical: 'Critical', warning: 'Warning', info: 'Info' }
 *     }
 *   ],
 *   activeFilters: { severity: ['critical', 'warning'] },
 *   onFilterChange: (filters) => console.log('Filters changed:', filters),
 *   enableSearch: true,
 *   searchQuery: '',
 *   onSearchChange: (query) => console.log('Search:', query)
 * };
 */
export interface IFilterPanelProps {
  readonly filters: IFilterDefinition[];
  readonly activeFilters: Record<string, string[]>;
  readonly onFilterChange: (filters: Record<string, string[]>) => void;
  readonly enableSearch?: boolean;
  readonly searchQuery?: string;
  readonly onSearchChange?: (query: string) => void;
  readonly className?: string;
}

/**
 * Definition of a single filter in the filter panel.
 *
 * @example
 * const filterDef: IFilterDefinition = {
 *   id: 'severity',
 *   label: 'Severity',
 *   options: ['critical', 'warning', 'info'],
 *   optionLabels: { critical: 'Critical', warning: 'Warning', info: 'Info' }
 * };
 */
export interface IFilterDefinition {
  readonly id: string;
  readonly label: string;
  readonly options: string[];
  readonly optionLabels?: Record<string, string>;
}
