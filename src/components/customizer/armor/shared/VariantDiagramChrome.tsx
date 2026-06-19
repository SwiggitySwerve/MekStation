import React from 'react';

import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import { getLocationCenter, type LocationPosition } from './MechSilhouette';
import { getVariantStyle, TargetingReticle } from './VariantStyles';

interface VariantDiagramHeaderProps {
  style: ReturnType<typeof getVariantStyle>;
  title: string;
}

export function VariantDiagramHeader({
  style,
  title,
}: VariantDiagramHeaderProps): React.ReactElement {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h3 className={style.headerTextClass} style={style.headerTextStyle}>
          {title}
        </h3>
        <ArmorDiagramQuickSettings />
      </div>
    </div>
  );
}

interface VariantDiagramContainerProps extends VariantDiagramHeaderProps {
  className: string;
  children: React.ReactNode;
}

export function VariantDiagramContainer({
  style,
  title,
  className,
  children,
}: VariantDiagramContainerProps): React.ReactElement {
  return (
    <div
      className={`${style.containerBg} rounded-lg border ${style.containerBorder} p-4 ${className}`}
    >
      <VariantDiagramHeader style={style} title={title} />
      {children}
    </div>
  );
}

interface VariantTargetingReticleProps {
  position?: LocationPosition | null;
  visible?: boolean;
}

export function VariantTargetingReticle({
  position,
  visible,
}: VariantTargetingReticleProps): React.ReactElement | null {
  if (!visible || !position) return null;

  const center = getLocationCenter(position);

  return <TargetingReticle cx={center.x} cy={center.y} visible={true} />;
}
