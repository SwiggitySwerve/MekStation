/**
 * ExportButton Component
 * Dropdown button for exporting events in various formats.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

import { type IBaseEvent } from '@/types/events';
import { logger } from '@/utils/logger';

// =============================================================================
// Constants
// =============================================================================

const COPY_FEEDBACK_DURATION_MS = 2000;

// =============================================================================
// Types
// =============================================================================

export interface ExportButtonProps {
  /** Events to export */
  events: readonly IBaseEvent[];
  /** Optional filename prefix */
  filename?: string;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

const ExportIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path
      fillRule="evenodd"
      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
      clipRule="evenodd"
    />
  </svg>
);

const JsonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path
      fillRule="evenodd"
      d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
      clipRule="evenodd"
    />
  </svg>
);

const CsvIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path
      fillRule="evenodd"
      d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm4 3a.75.75 0 0 0 0 1.5h10a.75.75 0 0 0 0-1.5H5Zm0 3a.75.75 0 0 0 0 1.5h10a.75.75 0 0 0 0-1.5H5Z"
      clipRule="evenodd"
    />
  </svg>
);

const ClipboardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path
      fillRule="evenodd"
      d="M13.887 3.182c.396.037.79.08 1.183.128C16.194 3.45 17 4.414 17 5.517V16.75A2.25 2.25 0 0 1 14.75 19h-9.5A2.25 2.25 0 0 1 3 16.75V5.517c0-1.103.806-2.068 1.93-2.207.393-.048.787-.09 1.183-.128A3.001 3.001 0 0 1 9 1h2c1.373 0 2.531.923 2.887 2.182ZM7.5 4A1.5 1.5 0 0 1 9 2.5h2A1.5 1.5 0 0 1 12.5 4v.5h-5V4Z"
      clipRule="evenodd"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
      clipRule="evenodd"
    />
  </svg>
);

// =============================================================================
// Export Functions
// =============================================================================

function generateFilename(prefix: string, extension: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}-${date}.${extension}`;
}

function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function eventsToJson(events: readonly IBaseEvent[]): string {
  return JSON.stringify(events, null, 2);
}

function eventsToCsv(events: readonly IBaseEvent[]): string {
  if (events.length === 0) return '';

  // Define CSV columns
  const headers = [
    'id',
    'sequence',
    'timestamp',
    'category',
    'type',
    'context.campaignId',
    'context.gameId',
    'context.pilotId',
    'context.unitId',
    'causedBy.eventId',
    'causedBy.relationship',
    'payload',
  ];

  // Build rows
  const rows = events.map((event) => {
    const values = [
      event.id,
      event.sequence.toString(),
      event.timestamp,
      event.category,
      event.type,
      event.context?.campaignId || '',
      event.context?.gameId || '',
      event.context?.pilotId || '',
      event.context?.unitId || '',
      event.causedBy?.eventId || '',
      event.causedBy?.relationship || '',
      JSON.stringify(event.payload),
    ];

    // Escape CSV values
    return values
      .map((v) => {
        const str = String(v);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// =============================================================================
// Component
// =============================================================================

export function ExportButton({
  events,
  filename = 'events-export',
  className = '',
}: ExportButtonProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const eventCount = events.length;
  const isDisabled = eventCount === 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset copied state after delay
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(
        () => setCopied(false),
        COPY_FEEDBACK_DURATION_MS,
      );
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Toggle dropdown
  const handleToggle = useCallback(() => {
    if (!isDisabled) {
      setIsOpen((prev) => !prev);
    }
  }, [isDisabled]);

  // Export as JSON
  const handleExportJson = useCallback(() => {
    const json = eventsToJson(events);
    downloadFile(json, generateFilename(filename, 'json'), 'application/json');
    setIsOpen(false);
  }, [events, filename]);

  // Export as CSV
  const handleExportCsv = useCallback(() => {
    const csv = eventsToCsv(events);
    downloadFile(csv, generateFilename(filename, 'csv'), 'text/csv');
    setIsOpen(false);
  }, [events, filename]);

  // Copy to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    try {
      const json = eventsToJson(events);
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setIsOpen(false);
    } catch (err) {
      logger.error('Failed to copy to clipboard:', err);
    }
  }, [events]);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={isDisabled}
        className={`bg-surface-raised hover:bg-border-theme border-border-theme inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isOpen ? 'ring-accent/30 ring-2' : ''} `}
      >
        <ExportIcon />
        Export ({eventCount})
        <ChevronDownIcon />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="bg-surface-raised/95 border-border-theme animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-50 mt-2 min-w-[200px] rounded-lg border py-1 shadow-xl backdrop-blur-md duration-150"
        >
          {/* JSON Export */}
          <button
            onClick={handleExportJson}
            className="text-text-theme-secondary hover:bg-surface-base/60 hover:text-text-theme-primary flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100"
          >
            <JsonIcon />
            <span className="flex-1 text-left">Export as JSON</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCsv}
            className="text-text-theme-secondary hover:bg-surface-base/60 hover:text-text-theme-primary flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100"
          >
            <CsvIcon />
            <span className="flex-1 text-left">Export as CSV</span>
          </button>

          {/* Divider */}
          <div className="border-border-theme-subtle my-1 border-t" />

          {/* Copy to Clipboard */}
          <button
            onClick={handleCopyToClipboard}
            className="text-text-theme-secondary hover:bg-surface-base/60 hover:text-text-theme-primary flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100"
          >
            {copied ? (
              <>
                <CheckIcon />
                <span className="flex-1 text-left text-emerald-400">
                  Copied!
                </span>
              </>
            ) : (
              <>
                <ClipboardIcon />
                <span className="flex-1 text-left">Copy to Clipboard</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportButton;
