/**
 * SPAPickerModal — thin modal wrapper around `<SPAPicker>`.
 *
 * Phase 5 Wave 2a (add-pilot-spa-editor-integration). Reuses the
 * project-standard `ModalOverlay` so focus trap + Escape + click-outside
 * behavior matches every other dialog in the app, then delegates the
 * picker UX entirely to the Wave 1 component.
 *
 * Why a thin wrapper instead of inlining the picker into every consumer:
 *   - Each Phase 5 entry point (pilot editor today, the wizard later)
 *     needs the same chrome (header, padding, close button) and the
 *     same selection-side semantics. A wrapper keeps the picker pure.
 *   - The picker emits `onSelect(spa, designation?)` directly — the
 *     wrapper turns that into a "select then close" flow, which is what
 *     consumers want 100% of the time. Consumers that want
 *     "select-without-close" can drop down to `<SPAPicker>` directly.
 */

import React from 'react';

import type { ISPADefinition, SPASource } from '@/types/spa/SPADefinition';

import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';

import type { SPADesignation, SPAPickerMode } from './SPAPicker/types';

import { SPAPicker } from './SPAPicker';

export interface SPAPickerModalProps {
  /** Open / closed state — controlled by the parent. */
  isOpen: boolean;
  /** Called when the modal is dismissed (close button, Escape, backdrop). */
  onClose: () => void;
  /** Fires after the user picks an SPA. Wrapper closes the modal first
   *  so consumers don't have to remember to call `onClose` themselves. */
  onSelect: (spa: ISPADefinition, designation?: SPADesignation) => void;
  /** Pilot's currently-owned SPA ids — disable rows in the picker. */
  excludedIds?: readonly string[];
  /** Pilot's available XP — controls affordability filtering. */
  availableXP?: number;
  /** Optional source whitelist (campaign legality filter). */
  allowedSources?: readonly SPASource[];
  /** Picker mode — `purchase` hides unaffordable rows. */
  mode?: SPAPickerMode;
  /** Optional title override. Defaults to "Add Special Ability". */
  title?: string;
}

/**
 * Modal-hosted picker. Selection emits to the parent and closes the
 * modal in one step.
 */
export function SPAPickerModal({
  isOpen,
  onClose,
  onSelect,
  excludedIds,
  availableXP,
  allowedSources,
  mode = 'purchase',
  title = 'Add Special Ability',
}: SPAPickerModalProps): React.ReactElement | null {
  const handleSelect = (
    spa: ISPADefinition,
    designation?: SPADesignation,
  ): void => {
    // Emit first so the parent can stage the purchase before the modal
    // tears down — keeps any error toast visible against the panel.
    onSelect(spa, designation);
    onClose();
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      className="max-h-[85vh] w-[760px] overflow-hidden"
    >
      <div className="flex h-full max-h-[85vh] flex-col">
        {/* Header — standard close-button pattern used across modals. */}
        <div className="border-border-theme-subtle bg-surface-deep/50 flex flex-shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-text-theme-primary text-xl font-bold">
              {title}
            </h2>
            <p className="text-text-theme-secondary text-sm">
              {availableXP !== undefined
                ? `${availableXP} XP available — pick an ability to add`
                : 'Browse the unified SPA catalog'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised rounded-lg p-2 transition-colors"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Picker body — keep the modal scrollable but avoid double-scrolling. */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <SPAPicker
            onSelect={handleSelect}
            onCancel={onClose}
            excludedIds={excludedIds}
            availableXP={availableXP}
            allowedSources={allowedSources}
            mode={mode}
          />
        </div>
      </div>
    </ModalOverlay>
  );
}

export default SPAPickerModal;
