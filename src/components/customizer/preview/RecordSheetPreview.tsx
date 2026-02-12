/**
 * Record Sheet Preview Component
 *
 * Renders a live preview of the BattleMech record sheet on a canvas.
 * Updates automatically when unit configuration changes.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from 'react';

import {
  usePreviewValidation,
  ValidationSeverity,
} from '@/hooks/useUnitValidation';
import { calculationService } from '@/services/construction/CalculationService';
import {
  IEditableMech,
  IArmorAllocation as IEditableArmorAllocation,
} from '@/services/construction/MechBuilderService';
import { recordSheetService } from '@/services/printing/RecordSheetService';
import { useUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { logger } from '@/utils/logger';

// =============================================================================
// Types
// =============================================================================

interface RecordSheetPreviewProps {
  /** Paper size for rendering */
  paperSize?: PaperSize;
  /** Initial scale factor for display */
  scale?: number;
  /** CSS class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Record Sheet Preview Component
 *
 * Renders a canvas-based preview of the record sheet that updates
 * when unit configuration changes.
 */
export function RecordSheetPreview({
  paperSize = PaperSize.LETTER,
  scale: initialScale = 0.8,
  className = '',
}: RecordSheetPreviewProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(initialScale);

  // Calculate fit-to-width scale
  const fitToWidth = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 32; // Account for padding
      const { width } = PAPER_DIMENSIONS[paperSize];
      const fitScale = containerWidth / width;
      setZoom(Math.min(fitScale, 3.0)); // Cap at 300%
    }
  }, [paperSize]);

  // Calculate fit-to-height scale
  const fitToHeight = useCallback(() => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.clientHeight - 32; // Account for padding
      const { height } = PAPER_DIMENSIONS[paperSize];
      const fitScale = containerHeight / height;
      setZoom(Math.min(fitScale, 3.0)); // Cap at 300%
    }
  }, [paperSize]);

  // Fit to width on initial load
  useEffect(() => {
    fitToWidth();
  }, [fitToWidth]);

  // Zoom controls
  const zoomIn = () => setZoom((z) => Math.min(z + 0.15, 3.0));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.2));

  // Get unit state from store
  const name = useUnitStore((s) => s.name);
  const chassis = useUnitStore((s) => s.chassis);
  const model = useUnitStore((s) => s.model);
  const tonnage = useUnitStore((s) => s.tonnage);
  const techBase = useUnitStore((s) => s.techBase);
  const rulesLevel = useUnitStore((s) => s.rulesLevel);
  const year = useUnitStore((s) => s.year);
  const configuration = useUnitStore((s) => s.configuration);

  // Components
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const gyroType = useUnitStore((s) => s.gyroType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const cockpitType = useUnitStore((s) => s.cockpitType);
  const armorType = useUnitStore((s) => s.armorType);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const enhancement = useUnitStore((s) => s.enhancement);
  const jumpMP = useUnitStore((s) => s.jumpMP);
  const equipment = useUnitStore((s) => s.equipment);

  // Calculate movement
  const walkMP = engineRating > 0 ? Math.floor(engineRating / tonnage) : 0;
  const runMP = Math.ceil(walkMP * 1.5);

  // Get validation issues for preview context
  const validation = usePreviewValidation();

  /**
   * Calculate Battle Value and Cost using the calculation service
   */
  const { battleValue, cost } = useMemo(() => {
    try {
      // Convert armor allocation to the format expected by CalculationService
      const armorAllocationForCalc: IEditableArmorAllocation = {
        head: armorAllocation[MechLocation.HEAD],
        centerTorso: armorAllocation[MechLocation.CENTER_TORSO],
        centerTorsoRear: armorAllocation.centerTorsoRear,
        leftTorso: armorAllocation[MechLocation.LEFT_TORSO],
        leftTorsoRear: armorAllocation.leftTorsoRear,
        rightTorso: armorAllocation[MechLocation.RIGHT_TORSO],
        rightTorsoRear: armorAllocation.rightTorsoRear,
        leftArm: armorAllocation[MechLocation.LEFT_ARM],
        rightArm: armorAllocation[MechLocation.RIGHT_ARM],
        leftLeg: armorAllocation[MechLocation.LEFT_LEG],
        rightLeg: armorAllocation[MechLocation.RIGHT_LEG],
        // Quad-specific locations
        frontLeftLeg: armorAllocation[MechLocation.FRONT_LEFT_LEG] ?? 0,
        frontRightLeg: armorAllocation[MechLocation.FRONT_RIGHT_LEG] ?? 0,
        rearLeftLeg: armorAllocation[MechLocation.REAR_LEFT_LEG] ?? 0,
        rearRightLeg: armorAllocation[MechLocation.REAR_RIGHT_LEG] ?? 0,
        // Tripod-specific location
        centerLeg: armorAllocation[MechLocation.CENTER_LEG] ?? 0,
      };

      // Convert ALL equipment to IEquipmentSlot format for BV calculation
      // BV should include all equipment on the mech, whether allocated or not
      const equipmentSlots = equipment.map((eq) => ({
        equipmentId: eq.equipmentId,
        location: eq.location ?? '',
        slotIndex: eq.slots?.[0] ?? 0,
      }));

      const editableMech: IEditableMech = {
        id: 'preview',
        chassis: chassis || name.split(' ')[0] || 'Unknown',
        variant: model || name.split(' ').slice(1).join(' ') || 'Custom',
        tonnage,
        techBase: techBase as TechBase,
        engineType,
        engineRating,
        walkMP,
        structureType: internalStructureType,
        gyroType,
        cockpitType,
        armorType,
        armorAllocation: armorAllocationForCalc,
        heatSinkType,
        heatSinkCount,
        equipment: equipmentSlots,
        isDirty: false,
      };

      return {
        battleValue: calculationService.calculateBattleValue(editableMech),
        cost: calculationService.calculateCost(editableMech),
      };
    } catch (error) {
      logger.warn('Failed to calculate BV/cost:', error);
      return { battleValue: 0, cost: 0 };
    }
  }, [
    name,
    chassis,
    model,
    tonnage,
    techBase,
    engineType,
    engineRating,
    walkMP,
    internalStructureType,
    gyroType,
    cockpitType,
    armorType,
    armorAllocation,
    heatSinkType,
    heatSinkCount,
    equipment,
  ]);

  /**
   * Convert equipment to record sheet format
   * Note: Damage and range data would need to come from the equipment database
   * For now, we use placeholder values - the equipment rendering will show '-' for unknown values
   */
  const convertEquipment = useCallback(() => {
    return equipment.map((eq) => ({
      id: eq.instanceId,
      name: eq.name,
      location: (eq.location || MechLocation.CENTER_TORSO) as string,
      heat: eq.heat || 0,
      damage: '-', // Would need equipment database lookup
      ranges: undefined, // Would need equipment database lookup
      isWeapon: eq.category.toLowerCase().includes('weapon'),
      isAmmo: eq.category === EquipmentCategory.AMMUNITION,
      ammoCount: undefined,
      slots: eq.slots ? [...eq.slots] : undefined,
    }));
  }, [equipment]);

  /**
   * Build critical slots from equipment assignments
   */
  const buildCriticalSlots = useCallback(() => {
    const result: Record<
      string,
      Array<{
        content: string;
        isSystem?: boolean;
        equipmentId?: string;
      } | null>
    > = {};

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

    // Initialize empty arrays for each location with proper typing
    locations.forEach((loc) => {
      const slotCount =
        loc === MechLocation.HEAD ||
        loc === MechLocation.LEFT_LEG ||
        loc === MechLocation.RIGHT_LEG
          ? 6
          : 12;
      result[loc] = new Array<{
        content: string;
        isSystem?: boolean;
        equipmentId?: string;
      } | null>(slotCount).fill(null);
    });

    // Fill in equipment from the equipment list
    equipment.forEach((eq) => {
      const loc = eq.location;
      if (loc && eq.slots && eq.slots.length > 0) {
        eq.slots.forEach((slotIndex) => {
          if (result[loc] && slotIndex < result[loc].length) {
            result[loc][slotIndex] = {
              content: eq.name,
              isSystem: false,
              equipmentId: eq.instanceId,
            };
          }
        });
      }
    });

    return result;
  }, [equipment]);

  /**
   * Render the record sheet to canvas
   */
  const renderPreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Build unit config from store state
    const unitConfig = {
      id: 'preview',
      name: name,
      chassis: chassis || name.split(' ')[0] || 'Unknown',
      model: model || name.split(' ').slice(1).join(' ') || 'Custom',
      tonnage,
      techBase: techBase,
      rulesLevel: rulesLevel,
      era: `Year ${year}`,
      configuration: configuration,
      engine: {
        type: engineType,
        rating: engineRating,
      },
      gyro: {
        type: gyroType,
      },
      structure: {
        type: internalStructureType,
      },
      armor: {
        type: armorType,
        allocation: {
          head: armorAllocation[MechLocation.HEAD],
          centerTorso: armorAllocation[MechLocation.CENTER_TORSO],
          centerTorsoRear: armorAllocation.centerTorsoRear,
          leftTorso: armorAllocation[MechLocation.LEFT_TORSO],
          leftTorsoRear: armorAllocation.leftTorsoRear,
          rightTorso: armorAllocation[MechLocation.RIGHT_TORSO],
          rightTorsoRear: armorAllocation.rightTorsoRear,
          leftArm: armorAllocation[MechLocation.LEFT_ARM],
          rightArm: armorAllocation[MechLocation.RIGHT_ARM],
          leftLeg: armorAllocation[MechLocation.LEFT_LEG],
          rightLeg: armorAllocation[MechLocation.RIGHT_LEG],
          // Quad-specific locations
          frontLeftLeg: armorAllocation[MechLocation.FRONT_LEFT_LEG] ?? 0,
          frontRightLeg: armorAllocation[MechLocation.FRONT_RIGHT_LEG] ?? 0,
          rearLeftLeg: armorAllocation[MechLocation.REAR_LEFT_LEG] ?? 0,
          rearRightLeg: armorAllocation[MechLocation.REAR_RIGHT_LEG] ?? 0,
          // Tripod-specific location
          centerLeg: armorAllocation[MechLocation.CENTER_LEG] ?? 0,
        },
      },
      heatSinks: {
        type: heatSinkType,
        count: heatSinkCount,
      },
      movement: {
        walkMP,
        runMP,
        jumpMP,
      },
      equipment: convertEquipment(),
      criticalSlots: buildCriticalSlots(),
      enhancements: enhancement ? [enhancement] : [],
      battleValue,
      cost,
    };

    try {
      // Extract record sheet data
      const data = recordSheetService.extractData(unitConfig);

      // Render using MegaMekLab-style SVG templates
      await recordSheetService.renderPreview(canvas, data, paperSize);
    } catch (error) {
      logger.error('Error rendering record sheet preview:', error);

      // Draw error state
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const { width, height } = PAPER_DIMENSIONS[paperSize];
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#f00';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Error rendering record sheet', width / 2, height / 2);
      }
    }
  }, [
    name,
    chassis,
    model,
    tonnage,
    techBase,
    rulesLevel,
    year,
    configuration,
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    armorType,
    armorAllocation,
    heatSinkType,
    heatSinkCount,
    enhancement,
    walkMP,
    runMP,
    jumpMP,
    convertEquipment,
    buildCriticalSlots,
    paperSize,
    battleValue,
    cost,
  ]);

  // Render preview when dependencies change
  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // Calculate display dimensions
  const { width, height } = PAPER_DIMENSIONS[paperSize];
  const displayWidth = width * zoom;
  const displayHeight = height * zoom;

  return (
    <div
      className={`record-sheet-preview ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Validation Issues Banner */}
      {validation.issues.length > 0 && (
        <div
          style={{
            backgroundColor:
              validation.errorCount > 0
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(234, 179, 8, 0.15)',
            borderBottom: `1px solid ${
              validation.errorCount > 0
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(234, 179, 8, 0.3)'
            }`,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <span
            style={{
              color: validation.errorCount > 0 ? '#ef4444' : '#eab308',
              fontSize: '16px',
              marginTop: '2px',
            }}
          >
            {validation.errorCount > 0 ? '⛔' : '⚠'}
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: validation.errorCount > 0 ? '#ef4444' : '#eab308',
                fontWeight: 600,
                fontSize: '13px',
                marginBottom: '4px',
              }}
            >
              {validation.errorCount > 0
                ? 'Configuration Error'
                : 'Preview Warning'}
              {validation.issues.length > 1 ? 's' : ''}
              {validation.errorCount > 0 &&
                validation.warningCount > 0 &&
                ` (${validation.errorCount} error${validation.errorCount > 1 ? 's' : ''}, ${validation.warningCount} warning${validation.warningCount > 1 ? 's' : ''})`}
            </div>
            <ul
              style={{
                margin: 0,
                padding: '0 0 0 16px',
                fontSize: '12px',
              }}
            >
              {validation.issues.map((issue) => (
                <li
                  key={issue.id}
                  style={{
                    marginBottom: '4px',
                    color:
                      issue.severity === ValidationSeverity.ERROR
                        ? 'rgba(239, 68, 68, 0.9)'
                        : issue.severity === ValidationSeverity.WARNING
                          ? 'rgba(234, 179, 8, 0.9)'
                          : 'rgba(156, 163, 175, 0.9)',
                  }}
                >
                  <strong>{issue.message}</strong>
                  {issue.details && (
                    <span style={{ opacity: 0.8 }}> — {issue.details}</span>
                  )}
                  {issue.fix && (
                    <div
                      style={{
                        fontSize: '11px',
                        opacity: 0.7,
                        marginTop: '2px',
                      }}
                    >
                      Fix: {issue.fix}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Preview Area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflow: 'auto',
          padding: '16px',
          backgroundColor: '#2a2a3e',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: displayWidth,
            height: displayHeight,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            backgroundColor: '#fff',
          }}
        />
      </div>

      {/* Floating Zoom Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          backgroundColor: 'rgba(30, 30, 45, 0.95)',
          borderRadius: '8px',
          padding: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Zoom In */}
        <button
          onClick={zoomIn}
          title="Zoom In"
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')
          }
        >
          +
        </button>

        {/* Zoom Level Display */}
        <div
          style={{
            color: '#fff',
            fontSize: '11px',
            textAlign: 'center',
            padding: '4px 0',
            fontFamily: 'monospace',
          }}
        >
          {Math.round(zoom * 100)}%
        </div>

        {/* Zoom Out */}
        <button
          onClick={zoomOut}
          title="Zoom Out"
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')
          }
        >
          −
        </button>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            margin: '4px 0',
          }}
        />

        {/* Fit Width */}
        <button
          onClick={fitToWidth}
          title="Fit to Width"
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')
          }
        >
          ↔
        </button>

        {/* Fit Height */}
        <button
          onClick={fitToHeight}
          title="Fit to Height"
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')
          }
        >
          ↕
        </button>
      </div>
    </div>
  );
}

/**
 * Get the canvas element for export operations
 */
export function useRecordSheetCanvas(): React.RefObject<HTMLCanvasElement | null> {
  return useRef<HTMLCanvasElement | null>(null);
}
