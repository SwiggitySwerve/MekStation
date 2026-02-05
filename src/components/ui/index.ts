/**
 * UI Components Index
 * Centralized exports for all reusable UI components.
 */

// Badge
export { Badge, TechBaseBadge, WeightClassBadge } from './Badge';
export type {} from './Badge';

// Breadcrumb
export { Breadcrumb } from './Breadcrumb';
export type { BreadcrumbItem, BreadcrumbProps } from './Breadcrumb';

// Button
export { Button, PaginationButtons } from './Button';

// Card
export { Card, CardSection } from './Card';
export type { CardAccentColor } from './Card';

// CategoryCard
export { CategoryCard } from './CategoryCard';
export type { AccentColor } from './CategoryCard';

// Input
export { Input, Select, SearchInput, Textarea } from './Input';

// PageLayout
export { PageLayout, PageLoading, PageError, EmptyState } from './PageLayout';

// StatDisplay
export {
  StatRow,
  StatList,
  StatCard,
  StatGrid,
  SimpleStatCard,
} from './StatDisplay';

// ViewModeToggle
export { ViewModeToggle } from './ViewModeToggle';
export type { ViewMode } from './ViewModeToggle';

// Toast
export { ToastProvider, useToast, useToastSafe } from './Toast';
export type { Toast, ToastVariant, ToastOptions } from './Toast';
