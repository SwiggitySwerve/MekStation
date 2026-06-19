import React from 'react';

interface ArmorDiagramSvgFrameProps {
  viewBox: string;
  className?: string;
  children: React.ReactNode;
}

export function ArmorDiagramSvgFrame({
  viewBox,
  className = 'mx-auto w-full max-w-[280px]',
  children,
}: ArmorDiagramSvgFrameProps): React.ReactElement {
  return (
    <div className="relative">
      <svg viewBox={viewBox} className={className} style={{ height: 'auto' }}>
        {children}
      </svg>
    </div>
  );
}
