/**
 * Diagram Style Selector
 * 
 * Compact inline selector for switching armor diagram variants.
 * Changes are immediately persisted to sync with settings page.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAppSettingsStore, ArmorDiagramVariant } from '@/stores/useAppSettingsStore';

const VARIANT_LABELS: Record<ArmorDiagramVariant, { name: string; icon: string }> = {
  'clean-tech': { name: 'Clean Tech', icon: '◯' },
  'neon-operator': { name: 'Neon', icon: '◈' },
  'tactical-hud': { name: 'Tactical', icon: '▣' },
  'premium-material': { name: 'Premium', icon: '◆' },
  'megamek': { name: 'MegaMek', icon: '▤' },
};

const VARIANTS: ArmorDiagramVariant[] = [
  'clean-tech',
  'neon-operator',
  'tactical-hud',
  'premium-material',
  'megamek',
];

interface DiagramStyleSelectorProps {
  className?: string;
}

export function DiagramStyleSelector({ className = '' }: DiagramStyleSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const armorDiagramVariant = useAppSettingsStore((s) => s.armorDiagramVariant);
  const setArmorDiagramVariant = useAppSettingsStore((s) => s.setArmorDiagramVariant);
  
  const currentVariant = VARIANT_LABELS[armorDiagramVariant];

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
    setArmorDiagramVariant(variant);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-raised/50 hover:bg-surface-raised border border-border-theme-subtle hover:border-border-theme rounded-md transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-text-theme-secondary">{currentVariant.icon}</span>
        <span className="text-text-theme-primary">{currentVariant.name}</span>
        <svg 
          className={`w-4 h-4 text-text-theme-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 w-48 bg-surface-base border border-border-theme rounded-lg shadow-xl z-50 overflow-hidden"
          role="listbox"
        >
          {VARIANTS.map((variant) => {
            const info = VARIANT_LABELS[variant];
            const isSelected = armorDiagramVariant === variant;
            
            return (
              <button
                key={variant}
                onClick={() => handleSelect(variant)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  isSelected 
                    ? 'bg-accent/20 text-accent' 
                    : 'text-text-theme-primary hover:bg-surface-raised'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <span className={isSelected ? 'text-accent' : 'text-text-theme-secondary'}>
                  {info.icon}
                </span>
                <span className="text-sm">{info.name}</span>
                {isSelected && (
                  <svg className="w-4 h-4 ml-auto text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
