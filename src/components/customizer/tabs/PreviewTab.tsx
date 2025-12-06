/**
 * Preview Tab Component
 * 
 * Displays a live record sheet preview with export options.
 * Integrates with the customizer tab system.
 * 
 * @spec openspec/specs/record-sheet-export/spec.md
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { RecordSheetPreview } from '../preview/RecordSheetPreview';
import { PreviewToolbar } from '../preview/PreviewToolbar';
import { recordSheetService } from '@/services/printing/RecordSheetService';
import { calculationService } from '@/services/construction/CalculationService';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EquipmentCategory } from '@/types/equipment';
import { TechBase } from '@/types/enums/TechBase';
import { IEditableMech, IArmorAllocation as IEditableArmorAllocation } from '@/services/construction/MechBuilderService';

// =============================================================================
// Types
// =============================================================================

interface PreviewTabProps {
  /** Read-only mode (ignored for preview) */
  _readOnly?: boolean;
  /** CSS class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Preview Tab Component
 * 
 * Provides record sheet preview and export functionality.
 */
export function PreviewTab({
  _readOnly = false,
  className = '',
}: PreviewTabProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.LETTER);
  
  // Get unit state from store
  const name = useUnitStore((s) => s.name);
  const chassis = useUnitStore((s) => s.chassis);
  const model = useUnitStore((s) => s.model);
  const tonnage = useUnitStore((s) => s.tonnage);
  const techBase = useUnitStore((s) => s.techBase);
  const rulesLevel = useUnitStore((s) => s.rulesLevel);
  const year = useUnitStore((s) => s.year);
  const configuration = useUnitStore((s) => s.configuration);
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

  /**
   * Convert store state to IEditableMech format for BV calculation
   */
  const editableMech: IEditableMech = useMemo(() => {
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
    };

    // Convert ALL equipment to IEquipmentSlot format for BV calculation
    // BV should include all equipment on the mech, whether allocated or not
    const equipmentSlots = equipment.map(eq => ({
      equipmentId: eq.equipmentId,
      location: eq.location ?? '',
      slotIndex: eq.slots?.[0] ?? 0,
    }));

    return {
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
  }, [
    name, chassis, model, tonnage, techBase, engineType, engineRating, walkMP,
    internalStructureType, gyroType, cockpitType, armorType, armorAllocation,
    heatSinkType, heatSinkCount, equipment,
  ]);

  /**
   * Calculate Battle Value using the calculation service
   */
  const battleValue = useMemo(() => {
    try {
      return calculationService.calculateBattleValue(editableMech);
    } catch (error) {
      console.warn('Failed to calculate BV:', error);
      return 0;
    }
  }, [editableMech]);

  /**
   * Calculate C-Bill cost using the calculation service
   */
  const cost = useMemo(() => {
    try {
      return calculationService.calculateCost(editableMech);
    } catch (error) {
      console.warn('Failed to calculate cost:', error);
      return 0;
    }
  }, [editableMech]);

  /**
   * Build critical slots from equipment assignments
   */
  const buildCriticalSlotsFromEquipment = useCallback(() => {
    const result: Record<string, Array<{ content: string; isSystem?: boolean; equipmentId?: string } | null>> = {};
    
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
    locations.forEach(loc => {
      const slotCount = loc === MechLocation.HEAD || loc === MechLocation.LEFT_LEG || loc === MechLocation.RIGHT_LEG ? 6 : 12;
      result[loc] = new Array<{ content: string; isSystem?: boolean; equipmentId?: string } | null>(slotCount).fill(null);
    });
    
    // Fill in equipment from the equipment list
    equipment.forEach(eq => {
      if (eq.location && eq.slots && eq.slots.length > 0) {
        eq.slots.forEach(slotIndex => {
          if (result[eq.location!] && slotIndex < result[eq.location!].length) {
            result[eq.location!][slotIndex] = {
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
   * Build unit config from store state
   */
  const buildUnitConfig = useCallback(() => {
    return {
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
      equipment: equipment.map(eq => ({
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
      })),
      criticalSlots: buildCriticalSlotsFromEquipment(),
      enhancements: enhancement ? [enhancement] : [],
      battleValue,
      cost,
    };
  }, [
    name, chassis, model, tonnage, techBase, rulesLevel, year, configuration,
    engineType, engineRating, gyroType, internalStructureType,
    armorType, armorAllocation, heatSinkType, heatSinkCount,
    enhancement, walkMP, runMP, jumpMP, equipment, battleValue, cost,
    buildCriticalSlotsFromEquipment,
  ]);

  /**
   * Handle PDF export using SVG template rendering
   */
  const handleExportPDF = useCallback(async () => {
    const unitConfig = buildUnitConfig();
    const data = recordSheetService.extractData(unitConfig);
    
    await recordSheetService.exportPDF(data, {
      paperSize,
      includePilotData: false,
    });
  }, [buildUnitConfig, paperSize]);

  /**
   * Handle print
   */
  const handlePrint = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      // Create a temporary canvas for printing
      const tempCanvas = document.createElement('canvas');
      const { width, height } = PAPER_DIMENSIONS[paperSize];
      tempCanvas.width = width;
      tempCanvas.height = height;
      
      const unitConfig = buildUnitConfig();
      const data = recordSheetService.extractData(unitConfig);
      await recordSheetService.renderPreview(tempCanvas, data, paperSize);
      recordSheetService.print(tempCanvas);
    } else {
      recordSheetService.print(canvas);
    }
  }, [buildUnitConfig, paperSize]);

  /**
   * Capture canvas ref from preview component
   */
  const handleCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  }, []);

  return (
    <div 
      className={`preview-tab ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1a1a2e',
      }}
    >
      {/* Toolbar */}
      <PreviewToolbar
        onExportPDF={handleExportPDF}
        onPrint={handlePrint}
        paperSize={paperSize}
        onPaperSizeChange={setPaperSize}
      />
      
      {/* Preview Area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <RecordSheetPreviewWithRef
          paperSize={paperSize}
          scale={0.75}
          onCanvasRef={handleCanvasRef}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Helper Component
// =============================================================================

interface RecordSheetPreviewWithRefProps {
  paperSize: PaperSize;
  scale: number;
  onCanvasRef: (canvas: HTMLCanvasElement | null) => void;
}

/**
 * RecordSheetPreview wrapper that exposes canvas ref
 */
function RecordSheetPreviewWithRef({
  paperSize,
  scale,
  onCanvasRef,
}: RecordSheetPreviewWithRefProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Extract canvas ref after render
  useEffect(() => {
    if (containerRef.current) {
      const canvas = containerRef.current.querySelector('canvas');
      onCanvasRef(canvas);
    }
    return () => onCanvasRef(null);
  }, [onCanvasRef]);

  return (
    <div ref={containerRef}>
      <RecordSheetPreview paperSize={paperSize} scale={scale} />
    </div>
  );
}

