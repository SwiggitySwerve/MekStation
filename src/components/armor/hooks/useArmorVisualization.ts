import { useMemo } from 'react';

export interface ArmorVisualizationData {
  fillColor: string;
  strokeColor: string;
  coverageClass: string;
  coverageLabel: string;
}

export function useArmorVisualization(
  coverage: number,
  isSelected: boolean = false,
  isHovered: boolean = false
): ArmorVisualizationData {
  return useMemo(() => {
    // Determine fill color based on coverage
    let fillColor: string;
    let coverageClass: string;
    let coverageLabel: string;

    if (coverage >= 90) {
      fillColor = '#10b981'; // green-500
      coverageClass = 'armor-high';
      coverageLabel = 'Excellent';
    } else if (coverage >= 60) {
      fillColor = '#eab308'; // yellow-500
      coverageClass = 'armor-medium';
      coverageLabel = 'Good';
    } else if (coverage >= 20) {
      fillColor = '#f97316'; // orange-500
      coverageClass = 'armor-low';
      coverageLabel = 'Poor';
    } else {
      fillColor = '#ef4444'; // red-500
      coverageClass = 'armor-critical';
      coverageLabel = 'Critical';
    }

    // Determine stroke color based on state
    let strokeColor: string;
    if (isSelected) {
      strokeColor = '#3b82f6'; // blue-500
    } else if (isHovered) {
      strokeColor = '#60a5fa'; // blue-400
    } else {
      strokeColor = '#4b5563'; // gray-600
    }

    return {
      fillColor,
      strokeColor,
      coverageClass,
      coverageLabel,
    };
  }, [coverage, isSelected, isHovered]);
}

export function getArmorCoverageColor(coverage: number): string {
  if (coverage >= 90) return '#10b981'; // green-500
  if (coverage >= 60) return '#eab308'; // yellow-500
  if (coverage >= 20) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

export function getArmorCoverageLabel(coverage: number): string {
  if (coverage >= 90) return 'Excellent';
  if (coverage >= 60) return 'Good';
  if (coverage >= 20) return 'Poor';
  return 'Critical';
}

export function getArmorPercentageDisplay(current: number, max: number): string {
  if (max === 0) return '0%';
  const percentage = Math.round((current / max) * 100);
  return `${percentage}%`;
}
