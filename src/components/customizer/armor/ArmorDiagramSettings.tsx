/**
 * Armor Diagram Settings
 *
 * Split-panel layout for selecting armor diagram variant.
 * Left: list with thumbnails, Right: large preview.
 * Uses draft/save pattern for consistency with appearance settings.
 */

import React, { useEffect } from 'react';
import { useAppSettingsStore, ArmorDiagramVariant } from '@/stores/useAppSettingsStore';
import { VariantThumbnail } from './VariantThumbnail';
import { ArmorDiagramPreview, DIAGRAM_VARIANT_INFO } from './ArmorDiagramPreview';

interface ArmorDiagramSettingsProps {
  className?: string;
}

export function ArmorDiagramSettings({ className = '' }: ArmorDiagramSettingsProps): React.ReactElement {
  const initDraftCustomizer = useAppSettingsStore((s) => s.initDraftCustomizer);
  const saveCustomizer = useAppSettingsStore((s) => s.saveCustomizer);
  const hasUnsavedCustomizer = useAppSettingsStore((s) => s.hasUnsavedCustomizer);
  const setDraftArmorDiagramVariant = useAppSettingsStore((s) => s.setDraftArmorDiagramVariant);
  const getEffectiveArmorDiagramVariant = useAppSettingsStore((s) => s.getEffectiveArmorDiagramVariant);

  const effectiveVariant = getEffectiveArmorDiagramVariant();

  // Initialize draft on mount
  useEffect(() => {
    initDraftCustomizer();
  }, [initDraftCustomizer]);

  const variants: ArmorDiagramVariant[] = [
    'clean-tech',
    'neon-operator',
    'tactical-hud',
    'premium-material',
    'megamek',
  ];

  return (
    <div className={className}>
      <div className="flex gap-4">
        {/* Left: Variant list */}
        <div className="w-48 space-y-1">
          {variants.map((variant) => {
            const info = DIAGRAM_VARIANT_INFO[variant];
            const isSelected = effectiveVariant === variant;

            return (
              <button
                key={variant}
                onClick={() => setDraftArmorDiagramVariant(variant)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isSelected
                    ? 'bg-accent/20 border border-accent'
                    : 'bg-surface-raised/30 border border-transparent hover:bg-surface-raised hover:border-border-theme'
                }`}
              >
                <VariantThumbnail variant={variant} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isSelected ? 'text-accent' : 'text-text-theme-primary'}`}>
                    {info.name}
                  </div>
                  <div className="text-xs text-text-theme-secondary truncate">
                    {info.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Large preview */}
        <div className="flex-1">
          <ArmorDiagramPreview variant={effectiveVariant} />
        </div>
      </div>

      {/* Save indicator */}
      {hasUnsavedCustomizer && (
        <div className="flex items-center justify-between mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-sm text-amber-200">
              Diagram style preview active — save to keep changes
            </span>
          </div>
          <button
            onClick={saveCustomizer}
            className="px-3 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors"
          >
            Save Diagram Style
          </button>
        </div>
      )}
    </div>
  );
}
