/**
 * Tests for useCausalityChain Hook
 *
 * @module hooks/audit/__tests__/useCausalityChain.test
 */

import { renderHook, act, waitFor } from '@testing-library/react';

import { EventStoreService } from '@/services/events';
import { EventCategory, IBaseEvent, ICausedBy } from '@/types/events';

import {
  useCausalityChain,
  getAncestors,
  getDescendants,
  getSiblings,
  filterByRelationship,
  getNodesAtDepth,
  ICausalityNode,
} from '../useCausalityChain';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockEvent(
  id: string,
  sequence: number,
  causedBy?: ICausedBy,
): IBaseEvent {
  return {
    id,
    sequence,
    timestamp: new Date().toISOString(),
    category: EventCategory.Game,
    type: `event-${id}`,
    payload: {},
    context: { gameId: 'game-1' },
    causedBy,
  };
}

function createMockEventStore(events: IBaseEvent[] = []): EventStoreService {
  const store = new EventStoreService();
  for (const event of events) {
    store.append(event);
  }
  return store;
}

// =============================================================================
// Tests
// =============================================================================

describe('useCausalityChain', () => {
  describe('basic functionality', () => {
    it('should start with null chain', () => {
      const eventStore = createMockEventStore([]);
      const { result } = renderHook(() => useCausalityChain({ eventStore }));

      expect(result.current.chain).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should compute chain for single event', async () => {
      const events = [createMockEvent('event-1', 1)];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() => useCausalityChain({ eventStore }));

      act(() => {
        result.current.computeChain('event-1');
      });

      await waitFor(() => {
        expect(result.current.chain).not.toBeNull();
      });

      expect(result.current.chain?.focusEvent.id).toBe('event-1');
      expect(result.current.chain?.root.event.id).toBe('event-1');
      expect(result.current.chain?.allNodes.length).toBe(1);
    });

    it('should handle event not found', async () => {
      const eventStore = createMockEventStore([]);

      const { result } = renderHook(() => useCausalityChain({ eventStore }));

      act(() => {
        result.current.computeChain('nonexistent');
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toContain('not found');
      expect(result.current.chain).toBeNull();
    });
  });

  describe('chain traversal', () => {
    it('should build chain with cause and effects', async () => {
      // Event tree:
      // root (seq 1)
      //   ├── child-1 (seq 2) triggered by root
      //   └── child-2 (seq 3) triggered by root
      //       └── grandchild (seq 4) triggered by child-2
      const events = [
        createMockEvent('root', 1),
        createMockEvent('child-1', 2, {
          eventId: 'root',
          relationship: 'triggered',
        }),
        createMockEvent('child-2', 3, {
          eventId: 'root',
          relationship: 'triggered',
        }),
        createMockEvent('grandchild', 4, {
          eventId: 'child-2',
          relationship: 'derived',
        }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() => useCausalityChain({ eventStore }));

      act(() => {
        result.current.computeChain('grandchild', 'both');
      });

      await waitFor(() => {
        expect(result.current.chain).not.toBeNull();
      });

      // Root should be 'root'
      expect(result.current.chain?.root.event.id).toBe('root');

      // All 4 events should be in chain
      expect(result.current.chain?.allNodes.length).toBe(4);

      // Stats
      expect(result.current.chain?.stats.totalEvents).toBe(4);
      expect(result.current.chain?.stats.maxDepth).toBeGreaterThanOrEqual(2);
    });

    it('should respect maxDepth', async () => {
      const events = [
        createMockEvent('root', 1),
        createMockEvent('child', 2, {
          eventId: 'root',
          relationship: 'triggered',
        }),
        createMockEvent('grandchild', 3, {
          eventId: 'child',
          relationship: 'triggered',
        }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() => useCausalityChain({ eventStore }));

      act(() => {
        result.current.computeChain('root', 'effects', 1);
      });

      await waitFor(() => {
        expect(result.current.chain).not.toBeNull();
      });

      // With maxDepth=1, should only have root and child (not grandchild)
      expect(result.current.chain?.allNodes.length).toBe(2);
    });

    it('should traverse only causes direction', async () => {
      const events = [
        createMockEvent('root', 1),
        createMockEvent('child', 2, {
          eventId: 'root',
          relationship: 'triggered',
        }),
        createMockEvent('grandchild', 3, {
          eventId: 'child',
          relationship: 'triggered',
        }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() => useCausalityChain({ eventStore }));

      act(() => {
        result.current.computeChain('grandchild', 'causes');
      });

      await waitFor(() => {
        expect(result.current.chain).not.toBeNull();
      });

      // When traversing causes, we find the root and build from there
      // But with 'causes' direction, we don't traverse effects
      expect(result.current.chain?.root.event.id).toBe('root');
    });

    it('should traverse only effects direction', async () => {
      const events = [
        createMockEvent('root', 1),
        createMockEvent('child-1', 2, {
          eventId: 'root',
          relationship: 'triggered',
        }),
        createMockEvent('child-2', 3, {
          eventId: 'root',
          relationship: 'triggered',
        }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() => useCausalityChain({ eventStore }));

      act(() => {
        result.current.computeChain('root', 'effects');
      });

      await waitFor(() => {
        expect(result.current.chain).not.toBeNull();
      });

      expect(result.current.chain?.root.event.id).toBe('root');
      expect(result.current.chain?.root.effects.length).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should compute correct statistics', async () => {
      const events = [
        createMockEvent('root', 1),
        createMockEvent('child-1', 2, {
          eventId: 'root',
          relationship: 'triggered',
        }),
        createMockEvent('child-2', 3, {
          eventId: 'root',
          relationship: 'derived',
        }),
        createMockEvent('grandchild', 4, {
          eventId: 'child-1',
          relationship: 'triggered',
        }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() => useCausalityChain({ eventStore }));

      act(() => {
        result.current.computeChain('root', 'both');
      });

      await waitFor(() => {
        expect(result.current.chain).not.toBeNull();
      });

      const stats = result.current.chain?.stats;
      expect(stats?.totalEvents).toBe(4);
      expect(stats?.rootCount).toBe(1);
      expect(stats?.leafCount).toBe(2); // grandchild and child-2
      expect(stats?.byRelationship.triggered).toBe(2);
      expect(stats?.byRelationship.derived).toBe(1);
    });
  });

  describe('utility methods', () => {
    it('should check if event is in chain', async () => {
      const events = [
        createMockEvent('root', 1),
        createMockEvent('child', 2, {
          eventId: 'root',
          relationship: 'triggered',
        }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() => useCausalityChain({ eventStore }));

      act(() => {
        result.current.computeChain('root');
      });

      await waitFor(() => {
        expect(result.current.chain).not.toBeNull();
      });

      expect(result.current.isInChain('root')).toBe(true);
      expect(result.current.isInChain('child')).toBe(true);
      expect(result.current.isInChain('nonexistent')).toBe(false);
    });

    it('should get path to node', async () => {
      const events = [
        createMockEvent('root', 1),
        createMockEvent('child', 2, {
          eventId: 'root',
          relationship: 'triggered',
        }),
        createMockEvent('grandchild', 3, {
          eventId: 'child',
          relationship: 'triggered',
        }),
      ];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() => useCausalityChain({ eventStore }));

      act(() => {
        result.current.computeChain('grandchild', 'both');
      });

      await waitFor(() => {
        expect(result.current.chain).not.toBeNull();
      });

      const path = result.current.getPathToNode('grandchild');
      expect(path.length).toBe(3);
      expect(path[0].event.id).toBe('root');
      expect(path[1].event.id).toBe('child');
      expect(path[2].event.id).toBe('grandchild');
    });
  });

  describe('clear', () => {
    it('should clear chain state', async () => {
      const events = [createMockEvent('event-1', 1)];
      const eventStore = createMockEventStore(events);

      const { result } = renderHook(() => useCausalityChain({ eventStore }));

      act(() => {
        result.current.computeChain('event-1');
      });

      await waitFor(() => {
        expect(result.current.chain).not.toBeNull();
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.chain).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});

describe('utility functions', () => {
  // Create mock nodes for utility function tests
  const createMockNode = (
    id: string,
    depth: number,
    relationship: ICausedBy['relationship'] | null = null,
  ): ICausalityNode => ({
    event: createMockEvent(id, depth + 1),
    depth,
    effects: [],
    cause: null,
    relationship,
  });

  describe('getAncestors', () => {
    it('should return empty for root node', () => {
      const root = createMockNode('root', 0);
      expect(getAncestors(root)).toEqual([]);
    });

    it('should return ancestors in order', () => {
      const root = createMockNode('root', 0);
      const child = { ...createMockNode('child', 1), cause: root };
      const grandchild = { ...createMockNode('grandchild', 2), cause: child };

      const ancestors = getAncestors(grandchild);
      expect(ancestors.length).toBe(2);
      expect(ancestors[0].event.id).toBe('child');
      expect(ancestors[1].event.id).toBe('root');
    });
  });

  describe('getDescendants', () => {
    it('should return empty for leaf node', () => {
      const leaf = createMockNode('leaf', 0);
      expect(getDescendants(leaf)).toEqual([]);
    });

    it('should return all descendants', () => {
      const grandchild = createMockNode('grandchild', 2);
      const child: ICausalityNode = {
        ...createMockNode('child', 1),
        effects: [grandchild],
      };
      const root: ICausalityNode = {
        ...createMockNode('root', 0),
        effects: [child],
      };

      const descendants = getDescendants(root);
      expect(descendants.length).toBe(2);
    });
  });

  describe('getSiblings', () => {
    it('should return empty for root node', () => {
      const root = createMockNode('root', 0);
      expect(getSiblings(root)).toEqual([]);
    });

    it('should return sibling nodes', () => {
      const child1 = createMockNode('child-1', 1);
      const child2 = createMockNode('child-2', 1);
      const root: ICausalityNode = {
        ...createMockNode('root', 0),
        effects: [child1, child2],
      };
      (child1 as ICausalityNode).cause = root;
      (child2 as ICausalityNode).cause = root;

      const siblings = getSiblings(child1);
      expect(siblings.length).toBe(1);
      expect(siblings[0].event.id).toBe('child-2');
    });
  });

  describe('filterByRelationship', () => {
    it('should filter nodes by relationship', () => {
      const nodes: ICausalityNode[] = [
        createMockNode('event-1', 1, 'triggered'),
        createMockNode('event-2', 2, 'derived'),
        createMockNode('event-3', 3, 'triggered'),
      ];

      const triggered = filterByRelationship(nodes, 'triggered');
      expect(triggered.length).toBe(2);
    });
  });

  describe('getNodesAtDepth', () => {
    it('should return nodes at specific depth', () => {
      const nodes: ICausalityNode[] = [
        createMockNode('root', 0),
        createMockNode('child-1', 1),
        createMockNode('child-2', 1),
        createMockNode('grandchild', 2),
      ];

      const depth1 = getNodesAtDepth(nodes, 1);
      expect(depth1.length).toBe(2);
    });
  });
});
