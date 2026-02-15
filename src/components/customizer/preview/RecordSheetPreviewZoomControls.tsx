import React from 'react';

interface RecordSheetPreviewZoomControlsProps {
  readonly zoom: number;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFitToWidth: () => void;
  readonly onFitToHeight: () => void;
}

interface ZoomControlButtonProps {
  readonly title: string;
  readonly icon: string;
  readonly onClick: () => void;
  readonly fontSize: string;
  readonly fontWeight?: 'bold';
}

function ZoomControlButton({
  title,
  icon,
  onClick,
  fontSize,
  fontWeight,
}: ZoomControlButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '36px',
        height: '36px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize,
        fontWeight,
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
      {icon}
    </button>
  );
}

export function RecordSheetPreviewZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitToWidth,
  onFitToHeight,
}: RecordSheetPreviewZoomControlsProps): React.ReactElement {
  return (
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
      <ZoomControlButton
        onClick={onZoomIn}
        title="Zoom In"
        icon="+"
        fontSize="18px"
        fontWeight="bold"
      />

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

      <ZoomControlButton
        onClick={onZoomOut}
        title="Zoom Out"
        icon="−"
        fontSize="18px"
        fontWeight="bold"
      />

      <div
        style={{
          height: '1px',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          margin: '4px 0',
        }}
      />

      <ZoomControlButton
        onClick={onFitToWidth}
        title="Fit to Width"
        icon="↔"
        fontSize="14px"
      />

      <ZoomControlButton
        onClick={onFitToHeight}
        title="Fit to Height"
        icon="↕"
        fontSize="14px"
      />
    </div>
  );
}
