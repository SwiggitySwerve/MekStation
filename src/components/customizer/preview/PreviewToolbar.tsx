/**
 * Preview Toolbar Component
 * 
 * Toolbar with Download PDF and Print buttons for the record sheet preview.
 * 
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import React, { useCallback, useState } from 'react';
import { PaperSize } from '@/types/printing';
import { useAppSettingsStore } from '@/stores/useAppSettingsStore';

// =============================================================================
// Types
// =============================================================================

interface PreviewToolbarProps {
  /** Callback to export PDF */
  onExportPDF: () => Promise<void>;
  /** Callback to print */
  onPrint: () => void;
  /** Current paper size */
  paperSize: PaperSize;
  /** Callback to change paper size */
  onPaperSizeChange: (size: PaperSize) => void;
  /** Callback when pip distribution mode changes (to trigger re-render) */
  onPipModeChange?: () => void;
  /** CSS class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Preview Toolbar Component
 * 
 * Provides export and print controls for the record sheet.
 */
export function PreviewToolbar({
  onExportPDF,
  onPrint,
  paperSize,
  onPaperSizeChange,
  onPipModeChange,
  className = '',
}: PreviewToolbarProps): React.ReactElement {
  const [isExporting, setIsExporting] = useState(false);
  
  // Pip distribution mode from app settings
  const usePoissonPips = useAppSettingsStore((s) => s.usePoissonPipDistribution);
  const setUsePoissonPips = useAppSettingsStore((s) => s.setUsePoissonPipDistribution);

  const handlePipModeToggle = useCallback(() => {
    setUsePoissonPips(!usePoissonPips);
    // Notify parent to re-render preview
    onPipModeChange?.();
  }, [usePoissonPips, setUsePoissonPips, onPipModeChange]);
  
  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      await onExportPDF();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [onExportPDF]);

  const handlePrint = useCallback(() => {
    try {
      onPrint();
    } catch (error) {
      console.error('Error printing:', error);
      alert('Failed to open print dialog. Please check popup blocker settings.');
    }
  }, [onPrint]);

  return (
    <div 
      className={`preview-toolbar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 16px',
        backgroundColor: '#1a1a2e',
        borderBottom: '1px solid #333',
      }}
    >
      {/* Paper Size Select */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label 
          htmlFor="paper-size"
          style={{ 
            color: '#aaa', 
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Paper Size:
        </label>
        <select
          id="paper-size"
          value={paperSize}
          onChange={(e) => onPaperSizeChange(e.target.value as PaperSize)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #444',
            backgroundColor: '#2a2a3e',
            color: '#fff',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <option value={PaperSize.LETTER}>Letter (8.5&quot; × 11&quot;)</option>
          <option value={PaperSize.A4}>A4 (210mm × 297mm)</option>
        </select>
      </div>

      {/* Pip Distribution Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label 
          htmlFor="pip-mode"
          style={{ 
            color: '#aaa', 
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Pip Style:
        </label>
        <button
          id="pip-mode"
          onClick={handlePipModeToggle}
          title={usePoissonPips 
            ? 'Poisson: Organic blue-noise distribution' 
            : 'Legacy: MegaMekLab grid-based layout'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #444',
            backgroundColor: usePoissonPips ? '#2d4a3e' : '#2a2a3e',
            color: usePoissonPips ? '#4ade80' : '#fff',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            minWidth: '90px',
          }}
        >
          {usePoissonPips ? (
            <>
              <PoissonIcon />
              Poisson
            </>
          ) : (
            <>
              <GridIcon />
              Legacy
            </>
          )}
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Print Button */}
      <button
        onClick={handlePrint}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '6px',
          border: '1px solid #555',
          backgroundColor: '#2a2a3e',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#3a3a4e';
          e.currentTarget.style.borderColor = '#666';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#2a2a3e';
          e.currentTarget.style.borderColor = '#555';
        }}
      >
        <PrintIcon />
        Print
      </button>

      {/* Download PDF Button */}
      <button
        onClick={handleExportPDF}
        disabled={isExporting}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: isExporting ? '#4a5568' : '#3182ce',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 500,
          cursor: isExporting ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          opacity: isExporting ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isExporting) {
            e.currentTarget.style.backgroundColor = '#2c5282';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExporting) {
            e.currentTarget.style.backgroundColor = '#3182ce';
          }
        }}
      >
        <DownloadIcon />
        {isExporting ? 'Exporting...' : 'Download PDF'}
      </button>
    </div>
  );
}

// =============================================================================
// Icons
// =============================================================================

function PrintIcon(): React.ReactElement {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function DownloadIcon(): React.ReactElement {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PoissonIcon(): React.ReactElement {
  return (
    <svg 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      {/* Random-looking dots for Poisson distribution */}
      <circle cx="5" cy="8" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="19" cy="9" r="2" />
      <circle cx="7" cy="16" r="2" />
      <circle cx="15" cy="14" r="2" />
      <circle cx="11" cy="20" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

function GridIcon(): React.ReactElement {
  return (
    <svg 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      {/* Regular grid pattern */}
      <circle cx="6" cy="6" r="2" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="18" cy="12" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="12" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

