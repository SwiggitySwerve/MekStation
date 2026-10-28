import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { useDeviceType } from '@/hooks/useDeviceType';

import {
  BrowserDraftStatus,
  DRAFT_LABEL,
  DRAFT_SHORT_LABEL,
  useBrowserDraftState,
  useDraftSavePulse,
  type DraftState,
} from './BrowserDraftStatus';
import { ToolbarHint } from './ToolbarHint';
import {
  libraryNeedsSave,
  librarySaveExplanation,
  librarySaveLabel,
  useLibrarySaveState,
  type LibrarySaveState,
} from './UnitSaveStatus';

/** What a browser draft is and how it reaches the library, in plain words. */
export const SAVE_STATE_EXPLANATION =
  'Your changes are kept in this browser. Use Save to add the unit to your library or update its library copy.';

/** Visible name of the save action on every surface that shows words. */
export const SAVE_ACTION_LABEL = 'Save to Library';

/**
 * The visible save-state words, shared by the header, the phone band and the
 * status panel. A written draft that the library does not hold yet reads as
 * two parts ("Draft Saved" / "Not in Library" or "Changed Since v3"); a unit
 * that matches its library copy reads "In Library v3" alone.
 */
export interface UnitSaveLines {
  /** First line, e.g. "Draft Saved" or "In Library v3". */
  first: string;
  /** Library line under a draft line, e.g. "Not in Library"; else null. */
  second: string | null;
  /** The first line is settled work (written draft or library match). */
  settled: boolean;
}

export function unitSaveLines(
  draft: DraftState,
  library: LibrarySaveState,
): UnitSaveLines {
  const libraryLabel = librarySaveLabel(library.state, library.version);
  if (library.state === 'matched')
    return { first: libraryLabel, second: null, settled: true };
  if (draft === 'saved')
    return {
      first: DRAFT_SHORT_LABEL.saved,
      second: libraryLabel,
      settled: true,
    };
  return { first: libraryLabel, second: null, settled: false };
}

export interface UnitSaveState {
  draft: DraftState;
  library: LibrarySaveState;
  /** Library wording shared by every save surface, e.g. "Changed Since v3". */
  label: string;
  /** Visible words for the save state (see `unitSaveLines`). */
  lines: UnitSaveLines;
  /** The last browser-draft write failed; this outranks the library state. */
  failed: boolean;
  /** Never saved or edited since: Save is the primary action. */
  needsSave: boolean;
}

/** One reading of a unit's save state for every save surface. */
export function useUnitSaveState(unitId: string): UnitSaveState {
  const draft = useBrowserDraftState(unitId);
  const library = useLibrarySaveState(unitId);
  return {
    draft,
    library,
    label: librarySaveLabel(library.state, library.version),
    lines: unitSaveLines(draft, library),
    failed: draft === 'failed',
    needsSave: libraryNeedsSave(library.state),
  };
}

/**
 * The one-line save state: the library words first, because they are what
 * Save changes, then "Draft Saved" once the browser copy is written
 * ("Not in Library · Draft Saved"). The long wording is in the tooltip.
 */
export function unitSaveLine({ first, second }: UnitSaveLines): string {
  return second ? `${second} · ${DRAFT_SHORT_LABEL.saved}` : first;
}

function saveStateTitle({ library, draft }: UnitSaveState): string {
  const draftNote = draft === 'saved' ? ` ${DRAFT_LABEL.saved}.` : '';
  return `${librarySaveExplanation(library.state, library.version)}${draftNote} ${SAVE_STATE_EXPLANATION}`;
}

function SettledCheck(): React.ReactElement {
  return (
    <AppIcon
      name="check"
      size="inline"
      className="h-3.5 w-3.5 shrink-0 text-emerald-400"
    />
  );
}

/** The save-state words in one of three shapes; a failed draft is red with Retry. */
function UnitSaveLinesView({
  unitId,
  state,
  layout,
}: {
  unitId: string;
  state: UnitSaveState;
  layout: 'stacked' | 'inline' | 'panel';
}): React.ReactElement {
  const pulse = useDraftSavePulse(unitId);
  if (state.failed)
    return <BrowserDraftStatus unitId={unitId} compact={layout !== 'panel'} />;
  const { first, second, settled } = state.lines;
  // Each automatic save lands here instead of in a toast: "Draft Saved" and
  // its check brighten to the OK green for a moment, then settle back. The
  // check stays at rest so the flash never shifts the line.
  if (layout === 'inline')
    return (
      <span
        data-save-lines
        className="text-text-theme-secondary inline-flex min-w-0 items-center gap-1 whitespace-nowrap"
      >
        <span className="min-w-0 truncate">
          {second ? (
            <>
              {second}
              {' · '}
              <span
                data-draft-pulse={pulse || undefined}
                className={`transition-colors duration-300 motion-reduce:transition-none ${pulse ? 'text-emerald-300' : ''}`}
              >
                <AppIcon
                  name="check"
                  size="inline"
                  aria-hidden="true"
                  className={`mr-1 transition-colors duration-300 motion-reduce:transition-none ${pulse ? 'text-green-400' : ''}`}
                />
                {DRAFT_SHORT_LABEL.saved}
              </span>
            </>
          ) : (
            first
          )}
        </span>
      </span>
    );
  // Beside Save, the library words are what Save changes, so they read in
  // primary text at 13px; a settled draft line above them stays secondary.
  const panel = layout === 'panel';
  return (
    <span
      data-save-lines
      className={`flex min-w-0 flex-col ${panel ? 'gap-0.5 text-sm' : 'text-[13px] leading-[18px] whitespace-nowrap'}`}
    >
      <span
        className={`inline-flex min-w-0 items-center gap-1 ${panel || !second ? 'text-text-theme-primary' : 'text-text-theme-secondary'} ${panel ? 'font-medium' : ''}`}
      >
        {settled && <SettledCheck />}
        <span className="min-w-0 truncate">{first}</span>
      </span>
      {second && (
        <span
          className={`min-w-0 truncate ${panel ? 'text-text-theme-secondary' : 'text-text-theme-primary'} ${settled ? 'pl-[18px]' : ''}`}
        >
          {second}
        </span>
      )}
    </span>
  );
}

/**
 * One-line save state beside the desktop Save button: "Not in Library ·
 * Draft Saved" / "Changed Since v3 · Draft Saved", or "In Library v3"
 * alone, or a red "Browser Draft Not Saved · Retry". The words repeat the
 * Save button's description, so they are hidden from assistive tech; the
 * failure keeps its own status and Retry. Phones show the words in the
 * status panel (and the 640px+ section band) instead.
 */
export function UnitSaveLabel({
  unitId,
  className = '',
}: {
  unitId: string;
  className?: string;
}): React.ReactElement | null {
  const { isMobile } = useDeviceType();
  const state = useUnitSaveState(unitId);
  if (isMobile) return null;
  if (state.failed)
    return (
      <span className={`min-w-0 text-[13px] leading-5 ${className}`}>
        <UnitSaveLinesView unitId={unitId} state={state} layout="stacked" />
      </span>
    );
  return (
    <span
      aria-hidden="true"
      data-testid="unit-save-label"
      data-state={state.library.state}
      title={saveStateTitle(state)}
      // 1px down: at 13px the caps otherwise render a pixel above the Save
      // label's 14px caps, so both now share the button's midline.
      className={`relative top-px max-w-56 min-w-0 text-[13px] leading-5 ${className}`}
    >
      <UnitSaveLinesView unitId={unitId} state={state} layout="inline" />
    </span>
  );
}

/**
 * The header save action: the save-state words (desktop) and the Save
 * button. Save is the primary action while the unit is not in the library
 * or has changed since; once it matches its library copy the button turns
 * quiet. The accessible name stays "Save active unit to library" and the
 * state is its description.
 */
/**
 * Below 1024px Save is icon-only: a needed save is an amber outline with an
 * amber icon rather than a solid 44px fill, so it is not the heaviest object
 * in the header; a unit that matches its library copy shows a plain icon, so
 * the two stay distinct.
 */
const ICON_ONLY_OUTLINE_PRIMARY =
  'max-lg:!border max-lg:!border-accent max-lg:!bg-transparent max-lg:!text-accent';

export function UnitSaveAction({
  unitId,
  disabledReason,
  onSave,
}: {
  unitId: string | null;
  disabledReason: string | null;
  onSave: () => void;
}): React.ReactElement {
  const { needsSave } = useUnitSaveState(unitId ?? '');
  const primary = unitId !== null && needsSave;
  return (
    // 24px to Save: the header's right group keeps one 24px gap between the
    // visible edges of these words, Save, the unit menu glyph and the panel
    // toggle glyph.
    <div className="flex min-w-0 shrink-0 items-center gap-6">
      {unitId && <UnitSaveLabel unitId={unitId} />}
      <Button
        type="button"
        size="sm"
        variant={primary ? 'primary' : 'secondary'}
        aria-label="Save active unit to library"
        aria-describedby={
          [
            disabledReason ? 'library-save-disabled-reason' : undefined,
            unitId ? 'library-save-state' : undefined,
          ]
            .filter(Boolean)
            .join(' ') || undefined
        }
        data-save-emphasis={primary ? 'primary' : 'quiet'}
        disabled={disabledReason !== null}
        // From 1024px a compact 36px labelled button with a 16px icon (44px
        // on touch screens); below that a 44px icon-only target whose glyph
        // matches the header's other 24px symbols.
        className={`group relative !h-11 !min-w-11 shrink-0 !p-0 whitespace-nowrap lg:!px-3 lg:pointer-fine:!h-9 lg:pointer-fine:!min-h-9 ${primary ? ICON_ONLY_OUTLINE_PRIMARY : '!text-text-theme-primary max-lg:!border-transparent max-lg:!bg-transparent'}`}
        onClick={onSave}
      >
        <AppIcon
          name="save"
          size="inline"
          className="max-lg:!h-6 max-lg:!w-6"
        />
        <span aria-hidden="true" className="hidden lg:inline">
          {SAVE_ACTION_LABEL}
        </span>
        {unitId && (
          <UnitSaveIndicator
            unitId={unitId}
            descriptionId="library-save-state"
            disabledReason={disabledReason}
          />
        )}
      </Button>
      {disabledReason && (
        <span id="library-save-disabled-reason" className="sr-only">
          {disabledReason}
        </span>
      )}
    </div>
  );
}

/**
 * Save state line for the phone section band (640px and up): the same
 * words as the desktop label on one line, or a red failed draft with Retry.
 * Desktop shows `UnitSaveLabel` beside Save instead, so this renders nothing
 * there unless `showOnDesktop`.
 */
export function UnitSaveSummary({
  unitId,
  className = '',
  showOnDesktop = false,
}: {
  unitId: string;
  className?: string;
  showOnDesktop?: boolean;
}): React.ReactElement | null {
  const { isMobile } = useDeviceType();
  const state = useUnitSaveState(unitId);
  if (!isMobile && !showOnDesktop) return null;
  return (
    <span
      data-testid="unit-save-summary"
      title={saveStateTitle(state)}
      className={`inline-flex min-w-0 items-center gap-1 text-[13px] leading-5 ${className}`}
    >
      <UnitSaveLinesView unitId={unitId} state={state} layout="inline" />
    </span>
  );
}

/**
 * The status panel's Saving section: the same save-state words as the
 * header, then what saving means.
 */
export function UnitSaveDetails({
  unitId,
}: {
  unitId: string;
}): React.ReactElement {
  const state = useUnitSaveState(unitId);
  return (
    <div className="flex flex-col gap-1" data-testid="unit-save-details">
      <span className="text-text-theme-secondary text-xs font-semibold tracking-wider uppercase">
        Saving
      </span>
      <UnitSaveLinesView unitId={unitId} state={state} layout="panel" />
      <span className="text-text-theme-secondary text-[13px] leading-[18px]">
        {SAVE_STATE_EXPLANATION}
      </span>
    </div>
  );
}

/**
 * Save state carried by the Save button itself: the wording as the
 * button's description (`descriptionId`) and, on desktop, an instant hint
 * that says what saving means (plus why Save is unavailable, or that the
 * browser draft failed). There is no dot; the words beside the button
 * (desktop) or in the status panel (phone) name the state.
 */
export function UnitSaveIndicator({
  unitId,
  descriptionId,
  disabledReason = null,
}: {
  unitId: string;
  descriptionId: string;
  disabledReason?: string | null;
}): React.ReactElement | null {
  const { isMobile } = useDeviceType();
  const { draft, label, failed } = useUnitSaveState(unitId);
  return (
    <>
      <span id={descriptionId} className="sr-only">
        <span>{label}</span>.
        {draft === 'saved' && (
          <>
            {' '}
            <span>{DRAFT_LABEL.saved}</span>.
          </>
        )}
      </span>
      {!isMobile && (
        <ToolbarHint>
          {disabledReason && (
            <span className="block font-semibold">{disabledReason}</span>
          )}
          {failed && (
            <span className="block font-semibold text-red-400">
              {DRAFT_LABEL.failed}
            </span>
          )}
          <span
            className={`block ${disabledReason || failed ? 'text-text-theme-secondary mt-1' : ''}`}
          >
            {SAVE_STATE_EXPLANATION}
          </span>
        </ToolbarHint>
      )}
    </>
  );
}
