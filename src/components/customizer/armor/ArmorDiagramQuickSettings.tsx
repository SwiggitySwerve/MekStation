/**
 * Armor Diagram Quick Settings
 *
 * Inline popup for quickly changing armor diagram variant
 * without navigating to the settings page.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAppSettingsStore, ArmorDiagramVariant } from '@/stores/useAppSettingsStore';
import { DIAGRAM_VARIANT_INFO } from './ArmorDiagramPreview';

interface QuickSettingsProps {
  className?: string;
}

/**
 * Gear icon button with popup for armor diagram settings
 */
export function ArmorDiagramQuickSettings({ className = '' }: QuickSettingsProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const armorDiagramVariant = useAppSettingsStore((s) => s.armorDiagramVariant);
  const setArmorDiagramVariant = useAppSettingsStore((s) => s.setArmorDiagramVariant);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
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

  const variants: ArmorDiagramVariant[] = [
    'clean-tech',
    'neon-operator',
    'tactical-hud',
    'premium-material',
  ];

  const handleSelectVariant = (variant: ArmorDiagramVariant) => {
    setArmorDiagramVariant(variant);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Gear Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-lg transition-colors ${
          isOpen
            ? 'bg-amber-500/20 text-amber-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
        title="Change diagram style"
        aria-label="Diagram style settings"
        aria-expanded={isOpen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Popup */}
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute right-0 top-full mt-2 w-72 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-50"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700">
            <h4 className="text-sm font-semibold text-white">Diagram Style</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose how the armor diagram looks
            </p>
          </div>

          {/* Variant Options */}
          <div className="p-2">
            {variants.map((variant) => {
              const info = DIAGRAM_VARIANT_INFO[variant];
              const isSelected = armorDiagramVariant === variant;

              return (
                <button
                  key={variant}
                  onClick={() => handleSelectVariant(variant)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{info.name}</span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-amber-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{info.description}</p>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50 rounded-b-lg">
            <p className="text-xs text-slate-500">
              More options in{' '}
              <a href="/settings" className="text-amber-400 hover:underline">
                Settings
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
