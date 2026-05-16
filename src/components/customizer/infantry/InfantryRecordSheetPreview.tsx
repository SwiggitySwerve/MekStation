/**
 * InfantryRecordSheetPreview — on-canvas infantry record sheet preview
 *
 * Infantry equivalent of the mech `RecordSheetPreview`: reads ONLY the
 * infantry store, builds an `IInfantryRecordSheetUnitInput` object, and
 * renders it through `RecordSheetService.extractData` → `renderPreview`.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Record Sheet Preview Component Is Unit-Type Aware
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { useInfantryStore } from '@/stores/useInfantryStore';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';
import { logger } from '@/utils/logger';

import { buildInfantryUnitObject } from './buildInfantryUnitObject';

interface InfantryRecordSheetPreviewProps {
  /** Paper size for rendering. */
  paperSize?: PaperSize;
  /** Display scale factor. */
  scale?: number;
  /** CSS class name. */
  className?: string;
}

/**
 * Renders a live infantry record sheet onto a canvas. Mounted only inside an
 * `InfantryStoreContext`.
 */
export function InfantryRecordSheetPreview({
  paperSize = PaperSize.LETTER,
  scale = 0.75,
  className = '',
}: InfantryRecordSheetPreviewProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const id = useInfantryStore((s) => s.id);
  const name = useInfantryStore((s) => s.name);
  const chassis = useInfantryStore((s) => s.chassis);
  const model = useInfantryStore((s) => s.model);
  const techBase = useInfantryStore((s) => s.techBase);
  const rulesLevel = useInfantryStore((s) => s.rulesLevel);
  const year = useInfantryStore((s) => s.year);
  const platoonComposition = useInfantryStore((s) => s.platoonComposition);
  const infantryMotive = useInfantryStore((s) => s.infantryMotive);
  const armorKit = useInfantryStore((s) => s.armorKit);
  const primaryWeapon = useInfantryStore((s) => s.primaryWeapon);
  const primaryWeaponId = useInfantryStore((s) => s.primaryWeaponId);
  const secondaryWeapon = useInfantryStore((s) => s.secondaryWeapon);
  const secondaryWeaponId = useInfantryStore((s) => s.secondaryWeaponId);
  const secondaryWeaponCount = useInfantryStore((s) => s.secondaryWeaponCount);
  const fieldGuns = useInfantryStore((s) => s.fieldGuns);
  const specialization = useInfantryStore((s) => s.specialization);
  const hasAntiMechTraining = useInfantryStore((s) => s.hasAntiMechTraining);

  const unitObject = useMemo(
    () =>
      buildInfantryUnitObject({
        id,
        name,
        chassis,
        model,
        techBase,
        rulesLevel,
        year,
        platoonComposition,
        infantryMotive,
        armorKit,
        primaryWeapon,
        primaryWeaponId,
        secondaryWeapon,
        secondaryWeaponId,
        secondaryWeaponCount,
        fieldGuns,
        specialization,
        hasAntiMechTraining,
      }),
    [
      id,
      name,
      chassis,
      model,
      techBase,
      rulesLevel,
      year,
      platoonComposition,
      infantryMotive,
      armorKit,
      primaryWeapon,
      primaryWeaponId,
      secondaryWeapon,
      secondaryWeaponId,
      secondaryWeaponCount,
      fieldGuns,
      specialization,
      hasAntiMechTraining,
    ],
  );

  const renderPreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const data = getRecordSheetService().extractData(unitObject);
      await getRecordSheetService().renderPreview(canvas, data, paperSize);
    } catch (error) {
      logger.error('Error rendering infantry record sheet preview:', error);
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
  }, [unitObject, paperSize]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  const { width, height } = PAPER_DIMENSIONS[paperSize];

  return (
    <div
      className={`record-sheet-preview ${className}`}
      style={{
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
        data-testid="infantry-record-sheet-canvas"
        style={{
          width: width * scale,
          height: height * scale,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          backgroundColor: '#fff',
        }}
      />
    </div>
  );
}
