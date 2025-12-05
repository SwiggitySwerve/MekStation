/**
 * Record Sheet Preview Component
 * 
 * Renders a live preview of the BattleMech record sheet on a canvas.
 * Updates automatically when unit configuration changes.
 * 
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { recordSheetService } from '@/services/printing/RecordSheetService';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EquipmentCategory } from '@/types/equipment';

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
      setZoom(Math.min(fitScale, 2.0)); // Cap at 200%
    }
  }, [paperSize]);

  // Fit to width on initial load and when container resizes
  useEffect(() => {
    fitToWidth();
    
    const resizeObserver = new ResizeObserver(() => {
      // Only auto-fit if current zoom is close to a "fit" value
      // This prevents overriding manual zoom adjustments
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, [fitToWidth]);
  
  // Zoom controls
  const zoomIn = () => setZoom(z => Math.min(z + 0.1, 3.0));
  const zoomOut = () => setZoom(z => Math.max(z - 0.1, 0.3));
  const resetZoom = () => setZoom(1.0);
  
  // Get unit state from store
  const name = useUnitStore((s) => s.name);
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
   * Convert equipment to record sheet format
   * Note: Damage and range data would need to come from the equipment database
   * For now, we use placeholder values - the equipment rendering will show '-' for unknown values
   */
  const convertEquipment = useCallback(() => {
    return equipment.map(eq => ({
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
    
    // Initialize empty arrays for each location
    locations.forEach(loc => {
      const slotCount = loc === MechLocation.HEAD || loc === MechLocation.LEFT_LEG || loc === MechLocation.RIGHT_LEG ? 6 : 12;
      result[loc] = new Array(slotCount).fill(null);
    });
    
    // Fill in equipment from the equipment list
    equipment.forEach(eq => {
      const loc = eq.location;
      if (loc && eq.slots && eq.slots.length > 0) {
        eq.slots.forEach(slotIndex => {
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
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Build unit config from store state
    const unitConfig = {
      id: 'preview',
      name: name,
      chassis: name.split(' ')[0] || 'Unknown',
      model: name.split(' ').slice(1).join(' ') || 'Custom',
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
      equipment: convertEquipment(),
      criticalSlots: buildCriticalSlots(),
      enhancements: enhancement ? [enhancement] : [],
    };

    try {
      // Extract record sheet data
      const data = recordSheetService.extractData(unitConfig);
      
      // Try SVG rendering first (MegaMekLab-style), fall back to canvas
      recordSheetService.renderSVGPreview(canvas, data, paperSize).catch((svgError) => {
        console.warn('SVG rendering failed, using canvas fallback:', svgError);
        recordSheetService.renderPreview(canvas, data, paperSize);
      });
    } catch (error) {
      console.error('Error rendering record sheet preview:', error);
      
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
    name, tonnage, techBase, rulesLevel, year, configuration,
    engineType, engineRating, gyroType, internalStructureType,
    armorType, armorAllocation, heatSinkType, heatSinkCount,
    enhancement, walkMP, runMP, jumpMP,
    convertEquipment, buildCriticalSlots, paperSize
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
    <div className={`record-sheet-preview ${className}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Zoom Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        padding: '8px',
        backgroundColor: '#333',
        borderBottom: '1px solid #444',
      }}>
        <button
          onClick={zoomOut}
          style={{
            padding: '4px 12px',
            backgroundColor: '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          −
        </button>
        <span style={{ color: '#fff', fontSize: '14px', minWidth: '60px', textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          style={{
            padding: '4px 12px',
            backgroundColor: '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          +
        </button>
        <button
          onClick={resetZoom}
          style={{
            padding: '4px 12px',
            backgroundColor: '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            marginLeft: '8px',
          }}
        >
          100%
        </button>
        <button
          onClick={fitToWidth}
          style={{
            padding: '4px 12px',
            backgroundColor: '#4a7c59',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            marginLeft: '8px',
          }}
        >
          Fit Width
        </button>
      </div>
      
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
          backgroundColor: '#f0f0f0',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: displayWidth,
            height: displayHeight,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            backgroundColor: '#fff',
          }}
        />
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

