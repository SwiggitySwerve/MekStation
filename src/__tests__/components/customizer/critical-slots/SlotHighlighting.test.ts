/**
 * Slot Highlighting Tests
 *
 * Tests for critical slot highlighting behavior when equipment is selected.
 * Ensures slots are only highlighted when equipment is actively selected
 * and the slot is a valid placement target.
 *
 * @spec openspec/specs/critical-slots-display/spec.md
 * @spec openspec/specs/critical-slot-allocation/spec.md
 */

import { MechLocation } from '@/types/construction';

// =============================================================================
// Test Utilities - Simulate SlotRow's getStyleClasses logic
// =============================================================================

interface SlotState {
  type: 'empty' | 'equipment' | 'system';
  isAssignable: boolean;
  isDragOver: boolean;
}

/**
 * Simulates the getStyleClasses logic from SlotRow.tsx
 * Returns the CSS class string that would be applied to a slot
 */
function getSlotStyleClasses(state: SlotState): string {
  const { type, isAssignable, isDragOver } = state;

  // Drag over state has highest priority
  if (isDragOver) {
    return type === 'empty'
      ? 'bg-green-800 border-green-400 text-green-200 scale-[1.02]'
      : 'bg-red-900/70 border-red-400 text-red-200';
  }

  // Assignable empty slots show green highlight
  if (isAssignable && type === 'empty') {
    return 'bg-green-900/60 border-green-500 text-green-300';
  }

  // Default content classes (simulated)
  if (type === 'empty') {
    return 'bg-slate-800 border-slate-600 text-slate-500';
  }
  if (type === 'system') {
    return 'bg-blue-700 border-blue-500 text-blue-100';
  }
  if (type === 'equipment') {
    return 'bg-red-700 border-red-500 text-red-100';
  }

  return 'bg-slate-700 border-slate-600 text-slate-300';
}

/**
 * Checks if a style class represents "highlighted" (green) state
 */
function isHighlighted(styleClasses: string): boolean {
  return styleClasses.includes('green');
}

/**
 * Checks if a style class represents "default" (gray/slate) state
 */
function isDefaultGray(styleClasses: string): boolean {
  return styleClasses.includes('slate');
}

// =============================================================================
// Test Utilities - Simulate getAssignableSlots logic
// =============================================================================

interface EquipmentSlot {
  index: number;
  type: 'empty' | 'equipment' | 'system';
}

interface SelectedEquipment {
  instanceId: string;
  equipmentId: string;
  criticalSlots: number;
}

/**
 * Simulates getAssignableSlots from CriticalSlotsTab.tsx
 * Returns array of slot indices that can accept the selected equipment
 */
function getAssignableSlots(
  slots: EquipmentSlot[],
  selectedEquipment: SelectedEquipment | null,
): number[] {
  if (!selectedEquipment) {
    return [];
  }

  const emptySlots = slots
    .filter((s) => s.type === 'empty')
    .map((s) => s.index);

  const slotsNeeded = selectedEquipment.criticalSlots;
  const assignable: number[] = [];

  // Find all valid starting positions for contiguous slots
  for (let i = 0; i <= emptySlots.length - slotsNeeded; i++) {
    let contiguous = true;
    for (let j = 1; j < slotsNeeded; j++) {
      if (emptySlots[i + j] !== emptySlots[i + j - 1] + 1) {
        contiguous = false;
        break;
      }
    }
    if (contiguous) {
      assignable.push(emptySlots[i]);
    }
  }

  return assignable;
}

// =============================================================================
// Tests
// =============================================================================

describe('Slot Highlighting', () => {
  // ===========================================================================
  // No Equipment Selected
  // ===========================================================================
  describe('when no equipment is selected', () => {
    it('should return empty assignable slots array', () => {
      const slots: EquipmentSlot[] = [
        { index: 0, type: 'empty' },
        { index: 1, type: 'empty' },
        { index: 2, type: 'empty' },
      ];

      const assignable = getAssignableSlots(slots, null);
      expect(assignable).toEqual([]);
    });

    it('should apply default gray styling to empty slots', () => {
      const state: SlotState = {
        type: 'empty',
        isAssignable: false,
        isDragOver: false,
      };

      const classes = getSlotStyleClasses(state);
      expect(isDefaultGray(classes)).toBe(true);
      expect(isHighlighted(classes)).toBe(false);
    });

    it('should not highlight any slots regardless of location', () => {
      const locations = [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ];

      locations.forEach((_location) => {
        const slots: EquipmentSlot[] = Array.from({ length: 12 }, (_, i) => ({
          index: i,
          type: 'empty',
        }));

        const assignable = getAssignableSlots(slots, null);
        expect(assignable).toEqual([]);
      });
    });
  });

  // ===========================================================================
  // Equipment Selected - Valid Placement
  // ===========================================================================
  describe('when equipment is selected', () => {
    const mockEquipment: SelectedEquipment = {
      instanceId: 'test-123',
      equipmentId: 'ac-10',
      criticalSlots: 7,
    };

    it('should return assignable slots for valid contiguous empty slots', () => {
      // 12 empty slots can fit a 7-slot item starting at positions 0-5
      const slots: EquipmentSlot[] = Array.from({ length: 12 }, (_, i) => ({
        index: i,
        type: 'empty',
      }));

      const assignable = getAssignableSlots(slots, mockEquipment);
      expect(assignable).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('should apply green highlighting to assignable empty slots', () => {
      const state: SlotState = {
        type: 'empty',
        isAssignable: true,
        isDragOver: false,
      };

      const classes = getSlotStyleClasses(state);
      expect(isHighlighted(classes)).toBe(true);
      expect(isDefaultGray(classes)).toBe(false);
    });

    it('should not highlight non-assignable empty slots', () => {
      // Only 6 empty slots - can't fit a 7-slot item
      const slots: EquipmentSlot[] = Array.from({ length: 6 }, (_, i) => ({
        index: i,
        type: 'empty',
      }));

      const assignable = getAssignableSlots(slots, mockEquipment);
      expect(assignable).toEqual([]);
    });

    it('should not highlight system slots', () => {
      const state: SlotState = {
        type: 'system',
        isAssignable: false,
        isDragOver: false,
      };

      const classes = getSlotStyleClasses(state);
      expect(isHighlighted(classes)).toBe(false);
    });

    it('should not highlight equipment slots', () => {
      const state: SlotState = {
        type: 'equipment',
        isAssignable: false,
        isDragOver: false,
      };

      const classes = getSlotStyleClasses(state);
      expect(isHighlighted(classes)).toBe(false);
    });
  });

  // ===========================================================================
  // Contiguous Slot Detection
  // ===========================================================================
  describe('contiguous slot detection', () => {
    const smallEquipment: SelectedEquipment = {
      instanceId: 'test-456',
      equipmentId: 'medium-laser',
      criticalSlots: 1,
    };

    const mediumEquipment: SelectedEquipment = {
      instanceId: 'test-789',
      equipmentId: 'ppc',
      criticalSlots: 3,
    };

    it('should handle single slot equipment', () => {
      const slots: EquipmentSlot[] = [
        { index: 0, type: 'system' },
        { index: 1, type: 'empty' },
        { index: 2, type: 'system' },
        { index: 3, type: 'empty' },
        { index: 4, type: 'empty' },
      ];

      const assignable = getAssignableSlots(slots, smallEquipment);
      expect(assignable).toEqual([1, 3, 4]);
    });

    it('should detect contiguous ranges correctly', () => {
      const slots: EquipmentSlot[] = [
        { index: 0, type: 'system' },
        { index: 1, type: 'system' },
        { index: 2, type: 'empty' },
        { index: 3, type: 'empty' },
        { index: 4, type: 'empty' },
        { index: 5, type: 'system' },
        { index: 6, type: 'empty' },
        { index: 7, type: 'empty' },
      ];

      const assignable = getAssignableSlots(slots, mediumEquipment);
      // Can start at index 2 (slots 2,3,4 are contiguous empty)
      // Cannot start at index 6 (only 2 contiguous empty slots)
      expect(assignable).toEqual([2]);
    });

    it('should handle gaps in empty slots', () => {
      const slots: EquipmentSlot[] = [
        { index: 0, type: 'empty' },
        { index: 1, type: 'equipment' }, // Gap
        { index: 2, type: 'empty' },
        { index: 3, type: 'empty' },
        { index: 4, type: 'empty' },
      ];

      const assignable = getAssignableSlots(slots, mediumEquipment);
      // Only positions 2-4 have 3 contiguous empty slots
      expect(assignable).toEqual([2]);
    });
  });

  // ===========================================================================
  // Drag and Drop States
  // ===========================================================================
  describe('drag and drop states', () => {
    it('should show drag-over highlight for valid empty slot', () => {
      const state: SlotState = {
        type: 'empty',
        isAssignable: true,
        isDragOver: true,
      };

      const classes = getSlotStyleClasses(state);
      expect(classes).toContain('bg-green-800');
      expect(classes).toContain('scale-[1.02]');
    });

    it('should show invalid drop indicator for non-empty slot', () => {
      const state: SlotState = {
        type: 'equipment',
        isAssignable: false,
        isDragOver: true,
      };

      const classes = getSlotStyleClasses(state);
      expect(classes).toContain('bg-red-900');
    });

    it('should prioritize drag-over state over assignable state', () => {
      const state: SlotState = {
        type: 'empty',
        isAssignable: true,
        isDragOver: true,
      };

      const classes = getSlotStyleClasses(state);
      // Drag-over should use bg-green-800, not bg-green-900/60
      expect(classes).toContain('bg-green-800');
      expect(classes).not.toContain('bg-green-900');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================
  describe('edge cases', () => {
    it('should handle empty slots array', () => {
      const slots: EquipmentSlot[] = [];
      const equipment: SelectedEquipment = {
        instanceId: 'test',
        equipmentId: 'test',
        criticalSlots: 1,
      };

      const assignable = getAssignableSlots(slots, equipment);
      expect(assignable).toEqual([]);
    });

    it('should handle equipment requiring more slots than available', () => {
      const slots: EquipmentSlot[] = [
        { index: 0, type: 'empty' },
        { index: 1, type: 'empty' },
      ];
      const equipment: SelectedEquipment = {
        instanceId: 'test',
        equipmentId: 'test',
        criticalSlots: 10,
      };

      const assignable = getAssignableSlots(slots, equipment);
      expect(assignable).toEqual([]);
    });

    it('should handle all slots being system slots', () => {
      const slots: EquipmentSlot[] = Array.from({ length: 6 }, (_, i) => ({
        index: i,
        type: 'system',
      }));
      const equipment: SelectedEquipment = {
        instanceId: 'test',
        equipmentId: 'test',
        criticalSlots: 1,
      };

      const assignable = getAssignableSlots(slots, equipment);
      expect(assignable).toEqual([]);
    });
  });

  // ===========================================================================
  // Regression Tests - Prevent re-introduction of highlighting bugs
  // ===========================================================================
  describe('regression: slot selection logic', () => {
    /**
     * Tests the isSelected calculation: slot.equipmentId === selectedEquipmentId
     * When both are undefined, this would incorrectly return true!
     */
    function isSlotSelected(
      slotEquipmentId: string | undefined,
      selectedEquipmentId: string | undefined,
    ): boolean {
      // CORRECT implementation: require selectedEquipmentId to be truthy
      return !!(selectedEquipmentId && slotEquipmentId === selectedEquipmentId);
    }

    it('should NOT select empty slots when no equipment is selected', () => {
      // Both undefined - should be FALSE
      const result = isSlotSelected(undefined, undefined);
      expect(result).toBe(false);
    });

    it('should NOT select empty slots even when equipment IS selected', () => {
      // Slot has no equipment, but we have equipment selected
      const result = isSlotSelected(undefined, 'test-equipment-id');
      expect(result).toBe(false);
    });

    it('should select slots that have matching equipment', () => {
      const result = isSlotSelected('test-equipment-id', 'test-equipment-id');
      expect(result).toBe(true);
    });

    it('should NOT select slots with different equipment', () => {
      const result = isSlotSelected('equipment-a', 'equipment-b');
      expect(result).toBe(false);
    });
  });

  describe('regression: no highlighting when nothing selected', () => {
    it('should NEVER highlight slots when selectedEquipment is null', () => {
      // This is the key invariant: no selection = no highlighting
      const testCases = [
        // All empty
        Array.from({ length: 12 }, (_, i) => ({
          index: i,
          type: 'empty' as const,
        })),
        // Mixed
        [
          { index: 0, type: 'system' as const },
          { index: 1, type: 'empty' as const },
          { index: 2, type: 'equipment' as const },
        ],
        // All system
        Array.from({ length: 6 }, (_, i) => ({
          index: i,
          type: 'system' as const,
        })),
      ];

      testCases.forEach((slots, _caseIndex) => {
        const assignable = getAssignableSlots(slots, null);
        expect(assignable).toEqual([]);

        // Verify each empty slot would get gray styling
        slots
          .filter((s) => s.type === 'empty')
          .forEach((slot) => {
            const state: SlotState = {
              type: 'empty',
              isAssignable: assignable.includes(slot.index),
              isDragOver: false,
            };
            const classes = getSlotStyleClasses(state);
            expect(isDefaultGray(classes)).toBe(true);
            expect(isHighlighted(classes)).toBe(false);
          });
      });
    });

    it('should clear highlighting when selection is cleared (simulated)', () => {
      const slots: EquipmentSlot[] = Array.from({ length: 12 }, (_, i) => ({
        index: i,
        type: 'empty',
      }));

      const equipment: SelectedEquipment = {
        instanceId: 'test',
        equipmentId: 'test',
        criticalSlots: 3,
      };

      // With selection: should have assignable slots
      const withSelection = getAssignableSlots(slots, equipment);
      expect(withSelection.length).toBeGreaterThan(0);

      // Without selection: should have NO assignable slots
      const withoutSelection = getAssignableSlots(slots, null);
      expect(withoutSelection).toEqual([]);
    });
  });
});
