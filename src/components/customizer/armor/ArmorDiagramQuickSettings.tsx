/**
 * Armor Diagram Quick Settings
 *
 * Compact dropdown for quickly changing armor diagram variant.
 * Uses immediate persistence to sync with settings page.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAppSettingsStore, ArmorDiagramVariant } from '@/stores/useAppSettingsStore';
import { DIAGRAM_VARIANT_INFO } from './ArmorDiagramPreview';

const VARIANTS: ArmorDiagramVariant[] = [
  'clean-tech',
  'neon-operator',
  'tactical-hud',
  'premium-material',
  'megamek',
  'megamek-classic',
];

interface QuickSettingsProps {
  className?: string;
}

export function ArmorDiagramQuickSettings({ className = '' }: QuickSettingsProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use effective variant (respects draft if exists) for display
  const getEffectiveArmorDiagramVariant = useAppSettingsStore((s) => s.getEffectiveArmorDiagramVariant);
  const setArmorDiagramVariant = useAppSettingsStore((s) => s.setArmorDiagramVariant);
  const revertCustomizer = useAppSettingsStore((s) => s.revertCustomizer);

  const effectiveVariant = getEffectiveArmorDiagramVariant();
  const currentLabel = DIAGRAM_VARIANT_INFO[effectiveVariant].name;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = (variant: ArmorDiagramVariant) => {
    // Clear any draft state from settings page to avoid conflicts
    revertCustomizer();
    // Set the persisted value directly
    setArmorDiagramVariant(variant);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs bg-surface-raised/50 hover:bg-surface-raised border border-border-theme-subtle hover:border-border-theme rounded transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-text-theme-secondary">Silhouette:</span>
        <span className="text-text-theme-primary font-medium">{currentLabel}</span>
        <svg
          className={`w-3 h-3 text-text-theme-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 w-36 bg-surface-base border border-border-theme rounded-lg shadow-xl z-50 overflow-hidden"
          role="listbox"
        >
          {VARIANTS.map((variant) => {
            const isSelected = effectiveVariant === variant;

            return (
              <button
                key={variant}
                onClick={() => handleSelect(variant)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-accent/20 text-accent'
                    : 'text-text-theme-primary hover:bg-surface-raised'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <span>{DIAGRAM_VARIANT_INFO[variant].name}</span>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
