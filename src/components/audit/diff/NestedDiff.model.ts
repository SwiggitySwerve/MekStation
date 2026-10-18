import { IDiffEntry, DiffChangeType } from '@/hooks/audit';

import type { DiffTreeNode } from './NestedDiff.types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build a tree structure from flat diff entries.
 */
function buildDiffTree(entries: IDiffEntry[]): DiffTreeNode {
  const root: DiffTreeNode = {
    name: 'root',
    fullPath: '',
    children: new Map(),
    changeCount: 0,
    changeTypes: new Set(),
  };

  for (const entry of entries) {
    if (entry.changeType === 'unchanged') continue;

    // Split path into segments
    const segments = entry.path.split(/[.[\]]+/).filter(Boolean);
    let current = root;

    // Build tree path
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const fullPath = segments.slice(0, i + 1).join('.');

      if (!current.children.has(segment)) {
        current.children.set(segment, {
          name: segment,
          fullPath,
          children: new Map(),
          changeCount: 0,
          changeTypes: new Set(),
        });
      }

      current = current.children.get(segment)!;
    }

    // Set entry at leaf
    current.entry = entry;

    // Propagate change counts up the tree
    const pathSegments = entry.path.split(/[.[\]]+/).filter(Boolean);
    let walkCurrent = root;

    for (const segment of pathSegments) {
      walkCurrent.changeCount++;
      walkCurrent.changeTypes.add(entry.changeType);
      walkCurrent = walkCurrent.children.get(segment)!;
    }
    walkCurrent.changeCount++;
    walkCurrent.changeTypes.add(entry.changeType);
  }

  return root;
}

/**
 * Group entries by their top-level path segment.
 */
function groupByTopLevel(entries: IDiffEntry[]): Map<string, IDiffEntry[]> {
  const groups = new Map<string, IDiffEntry[]>();

  for (const entry of entries) {
    if (entry.changeType === 'unchanged') continue;

    const topLevel = entry.path.split(/[.[\]]/)[0] || 'root';
    if (!groups.has(topLevel)) {
      groups.set(topLevel, []);
    }
    groups.get(topLevel)!.push(entry);
  }

  return groups;
}

/**
 * Get badge variant for change type.
 */
function getChangeTypeBadgeVariant(
  changeType: DiffChangeType,
): 'emerald' | 'red' | 'amber' | 'slate' {
  switch (changeType) {
    case 'added':
      return 'emerald';
    case 'removed':
      return 'red';
    case 'modified':
      return 'amber';
    default:
      return 'slate';
  }
}

/**
 * Get summary badge variant for mixed changes.
 */
function getMixedBadgeVariant(
  types: Set<DiffChangeType>,
): 'emerald' | 'red' | 'amber' | 'violet' {
  if (types.size > 1) return 'violet';
  const type = Array.from(types)[0];
  return getChangeTypeBadgeVariant(type) as
    | 'emerald'
    | 'red'
    | 'amber'
    | 'violet';
}

export { buildDiffTree, groupByTopLevel, getMixedBadgeVariant };
