import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { getBuildStatusSummary } from '@/components/customizer/shared/buildStatusSummary';
import { CriticalSlotOverflowValidation } from '@/services/validation/rules/universal/CriticalSlotOverflowValidation';
import { UnitValidationOrchestrator } from '@/services/validation/UnitValidationOrchestrator';
import { UnitValidationRegistry } from '@/services/validation/UnitValidationRegistry';
import { MechLocation } from '@/types/construction';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { TechBase } from '@/types/enums';
import { Era, RulesLevel } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { UnitValidationSeverity } from '@/types/validation/UnitValidationInterfaces';
import { countValidationIssuesByTab } from '@/utils/validation/validationNavigation';

import { getEquipmentSlotIssues, getSlotPlacementSummary } from '../placement';

function mounted(
  instanceId: string,
  criticalSlots: number,
  placement?: { location: MechLocation; slots: number[] },
): IMountedEquipmentInstance {
  return {
    instanceId,
    equipmentId: instanceId,
    name: instanceId,
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 1,
    criticalSlots,
    heat: 0,
    techBase: TechBase.INNER_SPHERE,
    isRearMounted: false,
    isRemovable: true,
    isOmniPodMounted: false,
    ...placement,
  };
}

describe('getSlotPlacementSummary', () => {
  it('reports nothing for an empty loadout', () => {
    expect(getSlotPlacementSummary([])).toEqual({
      placedSlots: 0,
      pendingSlots: 0,
      unplacedItems: 0,
    });
  });

  it('splits slots into placed and pending by complete slot assignment', () => {
    const placed = mounted('large-laser', 2, {
      location: MechLocation.RIGHT_ARM,
      slots: [4, 5],
    });
    const unplaced = mounted('ppc', 3);
    expect(getSlotPlacementSummary([placed, unplaced])).toEqual({
      placedSlots: 2,
      pendingSlots: 3,
      unplacedItems: 1,
    });
  });

  it('treats a located item with an incomplete slot list as pending', () => {
    const partial = mounted('ppc', 3, {
      location: MechLocation.LEFT_ARM,
      slots: [4],
    });
    expect(getSlotPlacementSummary([partial])).toEqual({
      placedSlots: 0,
      pendingSlots: 3,
      unplacedItems: 1,
    });
  });

  it('counts a slotless item as placed once it has a location', () => {
    const slotless = mounted('targeting-computer-link', 0, {
      location: MechLocation.CENTER_TORSO,
      slots: [],
    });
    expect(getSlotPlacementSummary([slotless])).toEqual({
      placedSlots: 0,
      pendingSlots: 0,
      unplacedItems: 0,
    });
  });
});

describe('getEquipmentSlotIssues placement legality', () => {
  const issuesFor = (item: IMountedEquipmentInstance) =>
    getEquipmentSlotIssues(
      [item],
      MechConfiguration.BIPED,
      EngineType.STANDARD,
      GyroType.STANDARD,
    );

  it('reports equipment without a location as an error', () => {
    expect(issuesFor(mounted('PPC', 3))).toEqual([
      expect.objectContaining({
        instanceId: 'PPC',
        message: 'PPC needs a location.',
        severity: UnitValidationSeverity.ERROR,
      }),
    ]);
  });

  it.each([{ slots: [] }, { slots: [4] }])(
    'reports an incomplete assignment $slots as an error',
    ({ slots }) => {
      const issues = issuesFor(
        mounted('PPC', 3, { location: MechLocation.RIGHT_ARM, slots }),
      );
      expect(issues).toEqual([
        expect.objectContaining({
          message: 'PPC in Right Arm needs 3 distinct critical slots.',
          severity: UnitValidationSeverity.ERROR,
        }),
      ]);
    },
  );

  it('clears the placement error once all critical slots are assigned', () => {
    expect(
      issuesFor(
        mounted('PPC', 3, {
          location: MechLocation.RIGHT_ARM,
          slots: [4, 5, 6],
        }),
      ),
    ).toEqual([]);
  });

  it('makes an otherwise legal unit not legal and marks Critical Slots as an error until placed', () => {
    const registry = new UnitValidationRegistry();
    registry.registerUniversalRule(CriticalSlotOverflowValidation);
    const validator = new UnitValidationOrchestrator(registry);
    const unit = {
      id: 'placement-only',
      name: 'Placement only',
      unitType: UnitType.BATTLEMECH,
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.STANDARD,
      introductionYear: 3025,
      era: Era.LATE_SUCCESSION_WARS,
      weight: 100,
      cost: 0,
      battleValue: 0,
      slotsByLocation: {
        'Right Arm': { used: 4, max: 12, displayName: 'Right Arm' },
      },
      equipmentSlotIssues: issuesFor(mounted('PPC', 3)),
    };
    const result = validator.validate(unit);
    expect(result.isValid).toBe(false);
    expect(result.hasCriticalErrors).toBe(false);
    expect(result.errorCount).toBe(1);
    expect(result.warningCount).toBe(0);
    expect(result.results[0].errors[0]).toMatchObject({
      field: 'criticalSlots.PPC',
      severity: UnitValidationSeverity.ERROR,
    });
    expect(getBuildStatusSummary(result, []).panelHeading).toBe(
      'Not Legal · 1 error',
    );
    expect(countValidationIssuesByTab(result).criticals).toEqual({
      errors: 1,
      warnings: 0,
      infos: 0,
    });
    const placed = validator.validate({
      ...unit,
      equipmentSlotIssues: issuesFor(
        mounted('PPC', 3, {
          location: MechLocation.RIGHT_ARM,
          slots: [4, 5, 6],
        }),
      ),
    });
    expect(placed.isValid).toBe(true);
    expect(placed.errorCount).toBe(0);
  });
});
