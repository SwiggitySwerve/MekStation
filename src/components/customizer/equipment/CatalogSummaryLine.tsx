/**
 * Catalog summary line: the at-limit warning note first, so the cause reads
 * before the counts, then the result count and free capacity.
 *
 * @spec openspec/specs/equipment-browser/spec.md
 */
import React from 'react';

import type { ICatalogCapacityNotice } from './EquipmentBrowser.model';

import workbenchStyles from '../CustomizerWorkbench.module.css';
import {
  BUILD_STATUS_KIND_TEXT_CLASS,
  BUILD_STATE_TINT_CLASS,
  SeverityIcon,
} from '../shared/BuildStatusLabel';

export function CatalogSummaryLine({
  resultSummary,
  capacity,
  limitNoteId,
}: {
  resultSummary?: string;
  capacity?: ICatalogCapacityNotice;
  limitNoteId?: string;
}): React.ReactElement {
  return (
    <div className={workbenchStyles.catalogSummary}>
      {/* A full unit is legal, but every add overweights it: a plain
          warning note (icon and text, no box) leads the line, with the same
          wording on every width. The reason follows on wider screens; phones
          keep it for assistive tech only. The Add buttons reference it. */}
      {capacity?.limitText && (
        <p
          id={limitNoteId}
          data-testid="equipment-catalog-limit"
          className={`${workbenchStyles.catalogLimitNote} ${BUILD_STATUS_KIND_TEXT_CLASS.warning}`}
        >
          <SeverityIcon kind="warning" />
          <span>
            {capacity.limitText}
            {capacity.limitReason && (
              <span
                className="sr-only sm:not-sr-only"
                data-testid="equipment-catalog-limit-reason"
              >
                {` — ${capacity.limitReason}`}
              </span>
            )}
          </span>
        </p>
      )}
      <p className="m-0 min-w-0">
        {resultSummary && <span aria-live="polite">{resultSummary}</span>}
        {capacity && ' · '}
        {capacity && (
          <span
            data-testid="equipment-catalog-capacity"
            data-capacity-state={capacity.state}
            className={
              capacity.state === 'over'
                ? `${workbenchStyles.catalogCapacityWarning} ${BUILD_STATUS_KIND_TEXT_CLASS.error} ${BUILD_STATE_TINT_CLASS.error}`
                : undefined
            }
          >
            {capacity.state === 'over' && <SeverityIcon kind="error" />}
            <span>
              <span>
                {capacity.compactWeightText === capacity.weightText ? (
                  capacity.weightText
                ) : (
                  <>
                    <span className="sm:hidden">
                      {capacity.compactWeightText}
                    </span>
                    <span className="hidden sm:inline">
                      {capacity.weightText}
                    </span>
                  </>
                )}
              </span>
              {/* With a notice, phones drop the slot count to stay on one row. */}
              <span
                className={capacity.state === 'free' ? '' : 'hidden sm:inline'}
              >
                {' · '}
                {capacity.slotsText}
              </span>
            </span>
          </span>
        )}
      </p>
    </div>
  );
}
