import { IDiffEntry, DiffChangeType } from '@/hooks/audit';

// =============================================================================
// Types
// =============================================================================

export interface NestedDiffProps {
  /** Array of diff entries to display */
  entries: IDiffEntry[];
  /** Whether to group entries by top-level path */
  groupByPath?: boolean;
  /** Whether sections are expanded by default */
  defaultExpanded?: boolean;
  /** Optional additional className */
  className?: string;
}

interface DiffTreeNode {
  /** The path segment name */
  name: string;
  /** Full path to this node */
  fullPath: string;
  /** Child nodes */
  children: Map<string, DiffTreeNode>;
  /** Leaf entry if this node is a value */
  entry?: IDiffEntry;
  /** Count of changes in this subtree */
  changeCount: number;
  /** Types of changes in this subtree */
  changeTypes: Set<DiffChangeType>;
}

export type { DiffTreeNode };
