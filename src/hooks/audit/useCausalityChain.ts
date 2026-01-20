/**
 * Causality Chain Hook
 * Traverses causedBy links to build cause-effect relationships.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import { useState, useCallback, useMemo } from 'react';
import { IBaseEvent, ICausedBy } from '@/types/events';
import { EventStoreService, getEventStore } from '@/services/events';

// =============================================================================
// Types
// =============================================================================

/**
 * A node in the causality graph.
 */
export interface ICausalityNode {
  /** The event this node represents */
  event: IBaseEvent;
  /** Depth in the causality tree (0 = root, 1 = direct causes, etc.) */
  depth: number;
  /** Events that this event caused */
  effects: readonly ICausalityNode[];
  /** The event that caused this event (if any) */
  cause: ICausalityNode | null;
  /** Relationship type to parent */
  relationship: ICausedBy['relationship'] | null;
}

/**
 * Statistics about a causality chain.
 */
export interface ICausalityStats {
  /** Total number of events in chain */
  totalEvents: number;
  /** Maximum depth of the chain */
  maxDepth: number;
  /** Number of root events (no cause) */
  rootCount: number;
  /** Number of leaf events (no effects) */
  leafCount: number;
  /** Breakdown by relationship type */
  byRelationship: Record<ICausedBy['relationship'], number>;
}

/**
 * Direction to traverse the causality chain.
 */
export type TraversalDirection = 'causes' | 'effects' | 'both';

/**
 * Complete causality chain result.
 */
export interface ICausalityChain {
  /** The focus event */
  focusEvent: IBaseEvent;
  /** Root of the chain (the original cause) */
  root: ICausalityNode;
  /** All nodes in the chain (flat list) */
  allNodes: readonly ICausalityNode[];
  /** Chain statistics */
  stats: ICausalityStats;
}

/**
 * Return type for useCausalityChain hook.
 */
export interface IUseCausalityChainReturn {
  /** The computed causality chain (null if not computed) */
  chain: ICausalityChain | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Compute causality chain for an event */
  computeChain: (eventId: string, direction?: TraversalDirection, maxDepth?: number) => void;
  /** Clear the current chain */
  clear: () => void;
  /** Get the path from root to a specific node */
  getPathToNode: (nodeId: string) => readonly ICausalityNode[];
  /** Check if an event is in the current chain */
  isInChain: (eventId: string) => boolean;
}

/**
 * Options for useCausalityChain hook.
 */
export interface IUseCausalityChainOptions {
  /** Custom event store (for testing) */
  eventStore?: EventStoreService;
  /** Maximum depth to traverse (default: 10) */
  defaultMaxDepth?: number;
  /** Default traversal direction (default: 'both') */
  defaultDirection?: TraversalDirection;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_DIRECTION: TraversalDirection = 'both';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build a map of eventId -> events caused by that event.
 */
function buildEffectsMap(
  events: readonly IBaseEvent[]
): Map<string, IBaseEvent[]> {
  const map = new Map<string, IBaseEvent[]>();

  for (const event of events) {
    if (event.causedBy) {
      const causeId = event.causedBy.eventId;
      const existing = map.get(causeId) || [];
      existing.push(event);
      map.set(causeId, existing);
    }
  }

  return map;
}

/**
 * Build a map of eventId -> event.
 */
function buildEventMap(events: readonly IBaseEvent[]): Map<string, IBaseEvent> {
  const map = new Map<string, IBaseEvent>();
  for (const event of events) {
    map.set(event.id, event);
  }
  return map;
}

/**
 * Traverse up the causality chain to find root.
 */
function findRootEvent(
  event: IBaseEvent,
  eventMap: Map<string, IBaseEvent>,
  visited: Set<string> = new Set()
): IBaseEvent {
  // Prevent infinite loops
  if (visited.has(event.id)) {
    return event;
  }
  visited.add(event.id);

  if (!event.causedBy) {
    return event;
  }

  const cause = eventMap.get(event.causedBy.eventId);
  if (!cause) {
    return event;
  }

  return findRootEvent(cause, eventMap, visited);
}

/**
 * Build a causality node and its effects recursively.
 */
function buildCausalityNode(
  event: IBaseEvent,
  eventMap: Map<string, IBaseEvent>,
  effectsMap: Map<string, IBaseEvent[]>,
  depth: number,
  maxDepth: number,
  direction: TraversalDirection,
  visited: Set<string>,
  parentNode: ICausalityNode | null
): ICausalityNode {
  // Prevent infinite loops
  if (visited.has(event.id)) {
    return {
      event,
      depth,
      effects: [],
      cause: parentNode,
      relationship: event.causedBy?.relationship ?? null,
    };
  }
  visited.add(event.id);

  // Create node
  const node: ICausalityNode = {
    event,
    depth,
    effects: [],
    cause: parentNode,
    relationship: event.causedBy?.relationship ?? null,
  };

  // Build effects (children) if direction allows
  if ((direction === 'effects' || direction === 'both') && depth < maxDepth) {
    const effects = effectsMap.get(event.id) || [];
    const effectNodes = effects.map((effect) =>
      buildCausalityNode(
        effect,
        eventMap,
        effectsMap,
        depth + 1,
        maxDepth,
        direction,
        visited,
        node
      )
    );
    // Assign to mutable effects property (internal construction)
    Object.assign(node, { effects: effectNodes });
  }

  return node;
}

/**
 * Flatten a causality tree into a list of nodes.
 */
function flattenNodes(node: ICausalityNode, result: ICausalityNode[] = []): ICausalityNode[] {
  result.push(node);
  for (const effect of node.effects) {
    flattenNodes(effect, result);
  }
  return result;
}

/**
 * Compute statistics for a causality chain.
 */
function computeStats(nodes: readonly ICausalityNode[]): ICausalityStats {
  let maxDepth = 0;
  let rootCount = 0;
  let leafCount = 0;
  const byRelationship: Record<ICausedBy['relationship'], number> = {
    triggered: 0,
    derived: 0,
    undone: 0,
    superseded: 0,
  };

  for (const node of nodes) {
    maxDepth = Math.max(maxDepth, node.depth);
    if (!node.cause) rootCount++;
    if (node.effects.length === 0) leafCount++;
    if (node.relationship) {
      byRelationship[node.relationship]++;
    }
  }

  return {
    totalEvents: nodes.length,
    maxDepth,
    rootCount,
    leafCount,
    byRelationship,
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for traversing and visualizing causality chains.
 *
 * @example
 * ```tsx
 * const { chain, computeChain, isInChain } = useCausalityChain();
 *
 * // Compute chain for an event
 * computeChain('event-123', 'both', 5);
 *
 * if (chain) {
 *   console.log('Root event:', chain.root.event.type);
 *   console.log('Total events:', chain.stats.totalEvents);
 * }
 * ```
 */
export function useCausalityChain(
  options: IUseCausalityChainOptions = {}
): IUseCausalityChainReturn {
  const {
    eventStore = getEventStore(),
    defaultMaxDepth = DEFAULT_MAX_DEPTH,
    defaultDirection = DEFAULT_DIRECTION,
  } = options;

  // State
  const [chain, setChain] = useState<ICausalityChain | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoized node map for quick lookups
  const nodeMap = useMemo(() => {
    if (!chain) return new Map<string, ICausalityNode>();
    const map = new Map<string, ICausalityNode>();
    for (const node of chain.allNodes) {
      map.set(node.event.id, node);
    }
    return map;
  }, [chain]);

  // Compute causality chain
  const computeChain = useCallback(
    (
      eventId: string,
      direction: TraversalDirection = defaultDirection,
      maxDepth: number = defaultMaxDepth
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        // Get the focus event
        const focusEvent = eventStore.getEventById(eventId);
        if (!focusEvent) {
          throw new Error(`Event not found: ${eventId}`);
        }

        // Get all events for building maps
        const allEvents = eventStore.getAllEvents();
        const eventMap = buildEventMap(allEvents);
        const effectsMap = buildEffectsMap(allEvents);

        // Find root event if traversing causes
        let rootEvent = focusEvent;
        if (direction === 'causes' || direction === 'both') {
          rootEvent = findRootEvent(focusEvent, eventMap);
        }

        // Build the tree starting from root
        const visited = new Set<string>();
        const rootNode = buildCausalityNode(
          rootEvent,
          eventMap,
          effectsMap,
          0,
          maxDepth,
          direction,
          visited,
          null
        );

        // Flatten for easy access
        const allNodes = flattenNodes(rootNode);

        // Compute statistics
        const stats = computeStats(allNodes);

        setChain({
          focusEvent,
          root: rootNode,
          allNodes,
          stats,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setChain(null);
      } finally {
        setIsLoading(false);
      }
    },
    [eventStore, defaultDirection, defaultMaxDepth]
  );

  // Clear chain
  const clear = useCallback(() => {
    setChain(null);
    setError(null);
  }, []);

  // Get path from root to a specific node
  const getPathToNode = useCallback(
    (nodeId: string): readonly ICausalityNode[] => {
      const node = nodeMap.get(nodeId);
      if (!node) return [];

      const path: ICausalityNode[] = [];
      let current: ICausalityNode | null = node;
      while (current) {
        path.unshift(current);
        current = current.cause;
      }
      return path;
    },
    [nodeMap]
  );

  // Check if event is in chain
  const isInChain = useCallback(
    (eventId: string): boolean => {
      return nodeMap.has(eventId);
    },
    [nodeMap]
  );

  return {
    chain,
    isLoading,
    error,
    computeChain,
    clear,
    getPathToNode,
    isInChain,
  };
}

// =============================================================================
// Utility Functions (exported for use in components)
// =============================================================================

/**
 * Get all ancestors of a node (path to root).
 */
export function getAncestors(node: ICausalityNode): ICausalityNode[] {
  const ancestors: ICausalityNode[] = [];
  let current = node.cause;
  while (current) {
    ancestors.push(current);
    current = current.cause;
  }
  return ancestors;
}

/**
 * Get all descendants of a node (recursively).
 */
export function getDescendants(node: ICausalityNode): ICausalityNode[] {
  const descendants: ICausalityNode[] = [];
  for (const effect of node.effects) {
    descendants.push(effect);
    descendants.push(...getDescendants(effect));
  }
  return descendants;
}

/**
 * Get siblings of a node (other effects of the same cause).
 */
export function getSiblings(node: ICausalityNode): ICausalityNode[] {
  if (!node.cause) return [];
  return node.cause.effects.filter((n) => n.event.id !== node.event.id) as ICausalityNode[];
}

/**
 * Filter nodes by relationship type.
 */
export function filterByRelationship(
  nodes: readonly ICausalityNode[],
  relationship: ICausedBy['relationship']
): ICausalityNode[] {
  return nodes.filter((n) => n.relationship === relationship) as ICausalityNode[];
}

/**
 * Get nodes at a specific depth.
 */
export function getNodesAtDepth(
  nodes: readonly ICausalityNode[],
  depth: number
): ICausalityNode[] {
  return nodes.filter((n) => n.depth === depth) as ICausalityNode[];
}
