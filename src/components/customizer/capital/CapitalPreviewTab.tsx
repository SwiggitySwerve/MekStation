import Image from 'next/image';
import React, { useContext, useEffect, useState } from 'react';

import type { ICapitalShipView } from '@/services/units/unitLoaderService/capitalShipView';

import { type ICapitalRecordSheetData } from '@/services/printing/recordsheet/dataExtractors.capital';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { PaperSize, PAPER_DIMENSIONS } from '@/types/printing';

import { PreviewTabFrame } from '../preview/PreviewTabFrame';
import { RecordSheetPreviewZoomContext } from '../preview/useRecordSheetPreviewZoom';

function CapitalPages({
  pages,
  name,
  paperSize,
  children,
}: {
  children?: React.ReactNode;
  pages: string[];
  name: string;
  paperSize: PaperSize;
}) {
  const zoom = useContext(RecordSheetPreviewZoomContext);
  return (
    <div
      ref={zoom?.containerRef}
      className="h-full min-h-0 overflow-auto"
      data-testid="capital-record-sheet-pages"
    >
      {children}
      <div className="mx-auto flex w-max min-w-full flex-col items-center gap-4 p-2">
        {pages.map((svg, index) => (
          <Image
            className="bg-white shadow-lg"
            width={PAPER_DIMENSIONS[paperSize].width}
            height={PAPER_DIMENSIONS[paperSize].height}
            key={index}
            alt={`${name} record sheet page ${index + 1}`}
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
            style={{
              width: PAPER_DIMENSIONS[paperSize].width * (zoom?.zoom ?? 1),
              height: 'auto',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Capital views remain immutable; preview and exports share one sheet payload. */
export function CapitalPreviewTab({
  view,
  paperSize: forcedPaper,
  className = '',
}: {
  view: ICapitalShipView | null;
  paperSize?: PaperSize;
  className?: string;
}): React.ReactElement {
  const [selectedPaper, setPaperSize] = useState(PaperSize.LETTER);
  const paperSize = forcedPaper ?? selectedPaper;
  const key = `${view?.sourceDefinition?.source ?? 'canonical'}:${view?.sourceDefinition?.id ?? view?.sourceId}:${view?.sourceDefinition?.version ?? ''}:${paperSize}`;
  const [result, setResult] = useState<{
    key: string;
    data?: ICapitalRecordSheetData;
    pages?: string[];
    error?: string;
  }>({ key: '' });
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!view)
          throw new Error('Open this capital ship again from the library.');
        const loaded = await loadUnitDefinition(
          'capital',
          view.sourceDefinition?.id ?? view.sourceId,
          view.sourceDefinition?.source ?? 'canonical',
        );
        if (!loaded.success) throw new Error(loaded.error);
        const data = getRecordSheetService().extractCapitalData(
          loaded.definition,
        );
        const pages = await getRecordSheetService().getSVGPages(
          data,
          paperSize,
        );
        if (active) setResult({ key, data, pages });
      } catch (error) {
        if (active)
          setResult({
            key,
            error: error instanceof Error ? error.message : String(error),
          });
      }
    })();
    return () => {
      active = false;
    };
  }, [key, paperSize, view]);
  const current = result.key === key ? result : undefined;
  const ready = () => {
    if (!current?.data)
      throw new Error(
        current?.error ?? 'The capital record sheet is still loading.',
      );
    return current.data;
  };
  return (
    <PreviewTabFrame
      className={className}
      testId="capital-preview-tab"
      pageCount={current?.pages?.length ?? 0}
      toolbarActions={{
        paperSize,
        onPaperSizeChange: setPaperSize,
        onExportPDF: async () =>
          getRecordSheetService().exportPDF(ready(), {
            paperSize,
            includePilotData: false,
          }),
        onPrint: async () =>
          getRecordSheetService().printRecordSheet(ready(), paperSize),
      }}
    >
      <CapitalPages
        pages={current?.pages ?? []}
        name={view?.name ?? 'Capital ship'}
        paperSize={paperSize}
      >
        {current?.error ? (
          <p role="alert" className="text-warning p-4">
            Capital record sheet unavailable: {current.error}
          </p>
        ) : !current?.pages ? (
          <p role="status" className="text-text-theme-secondary p-4">
            Loading capital record sheet...
          </p>
        ) : null}
      </CapitalPages>
    </PreviewTabFrame>
  );
}
