/**
 * Armor Diagram Quick Settings
 *
 * Compact dropdown for quickly changing armor diagram variant.
 * Uses immediate persistence to sync with settings page.
 */

import React, { useState, useRef, useEffect } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import {
  resolveArmorDiagramVariant,
  useCustomizerSettingsStore,
  ArmorDiagramVariant,
} from '@/stores/useCustomizerSettingsStore';

import {
  ALL_VARIANTS,
  DEFAULT_VARIANT,
  getVariantName,
} from './shared/VariantConstants';

interface QuickSettingsProps {
  className?: string;
}

export function ArmorDiagramQuickSettings({
  className = '',
}: QuickSettingsProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Track hydration to avoid SSR mismatch (server doesn't have localStorage values)
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Subscribe to the effective value itself so consecutive draft selections
  // update the label without relying on unrelated local state changes.
  const storedEffectiveVariant = useCustomizerSettingsStore(
    (s) => s.draftCustomizer?.armorDiagramVariant ?? s.armorDiagramVariant,
  );
  const setArmorDiagramVariant = useCustomizerSettingsStore(
    (s) => s.setArmorDiagramVariant,
  );
  const revertCustomizer = useCustomizerSettingsStore(
    (s) => s.revertCustomizer,
  );

  // Use default on server, actual value after mount to avoid hydration mismatch
  const effectiveVariant = hasMounted
    ? resolveArmorDiagramVariant(storedEffectiveVariant)
    : DEFAULT_VARIANT;
  const currentLabel = getVariantName(effectiveVariant);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
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
        className="bg-surface-raised/50 hover:bg-surface-raised border-border-theme-subtle hover:border-border-theme flex min-h-11 items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-text-theme-secondary">Silhouette:</span>
        <span className="text-text-theme-primary font-medium">
          {currentLabel}
        </span>
        <AppIcon
          name="chevron-down"
          size="inline"
          aria-hidden="true"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="bg-surface-base border-border-theme absolute top-full left-0 z-50 mt-1 w-36 overflow-hidden rounded-lg border shadow-xl"
          role="listbox"
        >
          {ALL_VARIANTS.map((variant) => {
            const isSelected = effectiveVariant === variant;

            return (
              <button
                key={variant}
                onClick={() => handleSelect(variant)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-accent/20 text-accent'
                    : 'text-text-theme-primary hover:bg-surface-raised'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <span>{getVariantName(variant)}</span>
                {isSelected && (
                  <AppIcon
                    name="check"
                    size="inline"
                    aria-hidden="true"
                    className="text-accent"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
