/**
 * Fluff form primitives
 *
 * Shared field pieces for the Fluff tab cards: label, auto-growing textarea,
 * plain text field, and the name + value row used by the Manufacturing card.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { customizerStyles as cs } from '@/components/customizer/styles';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';

/** Stable DOM id for a field name or label. */
export function fieldId(name: string): string {
  return `fluff-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;
}

/**
 * System names arrive as data keys (often all caps, e.g. "CHASSIS"). Show
 * them as ordinary field labels; the stored key is never changed. Short
 * all-caps tokens (ECM, CASE) stay as acronyms.
 */
export function formatSystemLabel(system: string): string {
  if (system !== system.toUpperCase()) return system;
  return system
    .split(' ')
    .map((word) =>
      word.length <= 3 ? word : word.charAt(0) + word.slice(1).toLowerCase(),
    )
    .join(' ');
}

export function disabledClasses(disabled: boolean): string {
  return disabled ? 'cursor-not-allowed opacity-60' : '';
}

const OPTIONAL_TAG = 'text-text-theme-muted text-sm';

/**
 * Field label with a muted "Optional" tag while an optional field is empty.
 * `section` uses the small-caps section-label style the rest of the
 * customizer uses for sub-section headings.
 */
export function FieldLabel({
  htmlFor,
  label,
  showOptional,
  variant = 'plain',
}: {
  htmlFor: string;
  label: string;
  showOptional: boolean;
  variant?: 'plain' | 'section';
}): React.ReactElement {
  return (
    <div className="mb-1.5 flex items-baseline gap-2">
      <label
        className={variant === 'section' ? cs.text.subsection : cs.text.label}
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {showOptional && <span className={OPTIONAL_TAG}>Optional</span>}
    </div>
  );
}

/**
 * Grow to the responsive line cap, with an explicit expansion control for
 * longer text. Measure again after edits and width changes (re-wrapping).
 */
export function AutoSizeTextarea({
  fieldLabel,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  fieldLabel: string;
}): React.ReactElement {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const resize = useCallback((): void => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const styles = getComputedStyle(textarea);
    const lines = Number.parseFloat(
      styles.getPropertyValue('--fluff-line-cap'),
    );
    const cap =
      lines * Number.parseFloat(styles.lineHeight) +
      Number.parseFloat(styles.paddingTop) +
      Number.parseFloat(styles.paddingBottom);
    const borders = textarea.offsetHeight - textarea.clientHeight;
    const fullHeight = textarea.scrollHeight;
    const isLong = Number.isFinite(cap) && fullHeight > cap + 1;
    setOverflows(isLong);
    textarea.style.height = `${(isLong && !expanded ? cap : fullHeight) + borders}px`;
  }, [expanded]);

  useLayoutEffect(resize, [props.value, resize]);

  useEffect(() => {
    const textarea = ref.current;
    if (!textarea || typeof ResizeObserver === 'undefined') return undefined;
    let width = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth === width) return;
      width = textarea.clientWidth;
      resize();
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [resize]);

  return (
    <>
      <textarea ref={ref} {...props} />
      {overflows && (
        <div className="mt-1 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-controls={props.id}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? 'Show less' : 'Show all'}
            <span className="sr-only"> {fieldLabel}</span>
          </Button>
        </div>
      )}
    </>
  );
}

const INPUT_CLASSES = `${cs.input.full} placeholder:text-text-theme-muted min-h-11 placeholder:italic`;

/** Label above a single-line input. */
export function TextField({
  id,
  label,
  placeholder,
  value,
  disabled,
  onChange,
}: {
  id?: string;
  label: string;
  placeholder?: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}): React.ReactElement {
  const inputId = id ?? fieldId(label);
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={inputId} label={label} showOptional={false} />
      <input
        id={inputId}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${INPUT_CLASSES} ${disabledClasses(disabled)}`}
      />
    </div>
  );
}

/**
 * Remove button for a row. On fine hover pointers it stays invisible until
 * the row is hovered or holds focus; on coarse pointers it is always visible.
 * It keeps its 44px target and sits inside the input's trailing edge.
 */
const REMOVE_BUTTON = [
  'text-text-theme-muted focus-visible:text-text-theme-primary focus-visible:ring-accent',
  'absolute top-0 right-0 flex h-11 w-11 items-center justify-center rounded-r transition-[opacity,color,background-color]',
  'hover:bg-red-950 hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none',
  '[@media(hover:hover)_and_(pointer:fine)]:opacity-0',
  '[@media(hover:hover)_and_(pointer:fine)]:group-focus-within/row:opacity-100',
  '[@media(hover:hover)_and_(pointer:fine)]:group-hover/row:opacity-100',
].join(' ');

/** One "name | value" row of the Manufacturing list. */
export function NameValueRow({
  id,
  label,
  optional = false,
  value,
  disabled,
  onChange,
  onRemove,
  removeLabel,
  removeTitle,
}: {
  id: string;
  label: string;
  /** Show an "Optional" tag while the value is empty. */
  optional?: boolean;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onRemove?: () => void;
  removeLabel?: string;
  removeTitle?: string;
}): React.ReactElement {
  const showOptional = optional && !disabled && value === '';
  return (
    <div className="group/row grid grid-cols-[minmax(5.5rem,7.5rem)_minmax(0,1fr)] items-center gap-x-3">
      <div className="min-w-0">
        <label htmlFor={id} className={`${cs.text.label} break-words`}>
          {label}
        </label>
        {showOptional && (
          <span className={`${OPTIONAL_TAG} block`}>Optional</span>
        )}
      </div>
      <div className="relative min-w-0">
        <input
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`${INPUT_CLASSES} ${onRemove ? 'pr-11' : ''} ${disabledClasses(disabled)}`}
        />
        {onRemove && (
          <button
            type="button"
            aria-label={removeLabel}
            title={removeTitle}
            onClick={onRemove}
            className={REMOVE_BUTTON}
          >
            <AppIcon name="trash" size="inline" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
