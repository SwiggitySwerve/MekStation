/**
 * Reader gate for campaign bodies (S1b). Pure: scans a body for the contract
 * rules level it needs and judges a caller's declared reader level against it.
 * The routes in `campaignLifecycleGate.ts` turn a verdict into a response.
 *
 * All version arithmetic lives in `ContractLifecycleRules.ts`; this module
 * only reads the stored value and hands it over.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import {
  LIFECYCLE_RULES_READER_MAX,
  LIFECYCLE_RULES_REQUEST_HEADER,
  SHIPPED_LIFECYCLE_READER,
  requiredLifecycleReaderVersion,
} from '@/types/campaign/ContractLifecycleRules';

export interface ILifecycleScan {
  /** Highest readable rules level any contract in the body needs (>= 1). */
  readonly required: number;
  /** True when some contract holds a version value nobody can read. */
  readonly unreadable: boolean;
}

export type LifecycleGateSource = 'stored' | 'incoming';

export const LIFECYCLE_UNSUPPORTED_CODE =
  'CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED';
export const LIFECYCLE_UNREADABLE_CODE = 'CAMPAIGN_LIFECYCLE_RULES_UNREADABLE';
export const LIFECYCLE_UNREADABLE_DIAGNOSTIC = 'unreadable-contract-version';

export type LifecycleGateVerdict =
  | { readonly kind: 'allow' }
  | {
      readonly kind: 'allow-read-only';
      readonly diagnostic: typeof LIFECYCLE_UNREADABLE_DIAGNOSTIC;
    }
  | {
      readonly kind: 'refuse';
      readonly status: 426 | 422;
      readonly code:
        | typeof LIFECYCLE_UNSUPPORTED_CODE
        | typeof LIFECYCLE_UNREADABLE_CODE;
      readonly reason:
        | 'lifecycle-rules-unsupported'
        | 'lifecycle-rules-unreadable';
      /** `null` when the value is unreadable by every reader. */
      readonly requiredLifecycleRules: number | null;
      readonly readerLifecycleRules: number;
      readonly source: LifecycleGateSource;
    };

function contractVersions(body: unknown): unknown[] {
  if (typeof body !== 'object' || body === null) return [];
  const { missions, contractMarket } = body as {
    missions?: unknown;
    contractMarket?: { offers?: unknown } | null;
  };
  const records: unknown[] = [];
  if (Array.isArray(missions)) {
    for (const entry of missions) {
      records.push(Array.isArray(entry) ? entry[1] : undefined);
    }
  }
  const offers = contractMarket?.offers;
  if (Array.isArray(offers)) records.push(...offers);
  const versions: unknown[] = [];
  for (const record of records) {
    if (
      typeof record === 'object' &&
      record !== null &&
      Object.prototype.hasOwnProperty.call(record, 'lifecycleRulesVersion')
    ) {
      versions.push(
        (record as { lifecycleRulesVersion?: unknown }).lifecycleRulesVersion,
      );
    }
  }
  return versions;
}

/** The rules level a campaign body (`missions` + `contractMarket.offers`) needs. */
export function scanLifecycleRequirement(body: unknown): ILifecycleScan {
  let required = SHIPPED_LIFECYCLE_READER;
  let unreadable = false;
  for (const version of contractVersions(body)) {
    const needed = requiredLifecycleReaderVersion(version);
    if (needed === null) unreadable = true;
    else if (needed > required) required = needed;
  }
  return { required, unreadable };
}

/** The header a client sends on every request that serves or accepts a campaign body. */
export function lifecycleRulesRequestHeaders(): Record<string, string> {
  return {
    [LIFECYCLE_RULES_REQUEST_HEADER]: String(LIFECYCLE_RULES_READER_MAX),
  };
}

/** Whether a refusal `code` is one of the two reader-gate refusals. */
export function isLifecycleRefusalCode(code: unknown): boolean {
  return (
    code === LIFECYCLE_UNSUPPORTED_CODE || code === LIFECYCLE_UNREADABLE_CODE
  );
}

export type LifecycleRefusal = Extract<
  LifecycleGateVerdict,
  { kind: 'refuse' }
>;

/**
 * How a person updates, closing the 426 sentence. The server writes the browser
 * form: it cannot tell the desktop shell from a tab, and a reload there serves
 * the same embedded build, so the desktop client swaps in the second form
 * (`lifecycleRefusalMessageFor`).
 */
export const LIFECYCLE_UPDATE_GUIDANCE_BROWSER =
  'Reload this page to update, then try again.';
/**
 * The label of the Help menu item that sends `help:check-updates`. Its owner is
 * `desktop/electron/MenuManager.ts` (`createHelpMenu`); the desktop package
 * cannot be imported here, so `readSaveRefusal.desktop.test.ts` reads that file
 * and fails if the two drift.
 */
export const LIFECYCLE_UPDATE_MENU_LABEL = 'Check for Updates...';
export const LIFECYCLE_UPDATE_GUIDANCE_DESKTOP = `Choose Help > ${LIFECYCLE_UPDATE_MENU_LABEL} to update MekStation, then open this campaign again.`;

/** The sentence a client shows for a refusal; only the 426 differs by shell. */
export function lifecycleRefusalMessageFor(
  code: string,
  message: string,
  desktop: boolean,
): string {
  return desktop && code === LIFECYCLE_UNSUPPORTED_CODE
    ? message.replace(
        LIFECYCLE_UPDATE_GUIDANCE_BROWSER,
        LIFECYCLE_UPDATE_GUIDANCE_DESKTOP,
      )
    : message;
}

/** The 426/422 body. `error` is what a person reads; the rest is for code. */
export function lifecycleRefusalBody(refusal: LifecycleRefusal) {
  const { requiredLifecycleRules: required, readerLifecycleRules: reader } =
    refusal;
  const error =
    refusal.status === 422
      ? 'This campaign has contract data this copy of MekStation cannot read, so changes to it are not saved. You can still look at it. Nothing was changed.'
      : required === null
        ? `This campaign has contract data this copy of MekStation cannot read. ${LIFECYCLE_UPDATE_GUIDANCE_BROWSER} Nothing was changed.`
        : `This campaign uses contract rules newer than this copy of MekStation reads (it needs rules ${required}; this copy reads rules ${reader}). ${LIFECYCLE_UPDATE_GUIDANCE_BROWSER} Nothing was changed.`;
  return {
    kind: 'refused' as const,
    code: refusal.code,
    reason: refusal.reason,
    error,
    requiredLifecycleRules: required,
    readerLifecycleRules: reader,
    source: refusal.source,
  };
}

/** The `Upgrade` value naming the rules level a 426 needs, or null when none exists. */
export function lifecycleUpgradeValue(
  refusal: LifecycleRefusal,
): string | null {
  return refusal.status === 426 && refusal.requiredLifecycleRules !== null
    ? `MekStation-Lifecycle-Rules/${refusal.requiredLifecycleRules}`
    : null;
}

export interface ILifecycleGateInput {
  readonly operation: 'read' | 'write';
  /** `declared` is false for an absent or malformed header (an old client). */
  readonly reader: { readonly level: number; readonly declared: boolean };
  /** Checked in this order; the first body that trips the gate is the `source`. */
  readonly bodies: readonly {
    readonly source: LifecycleGateSource;
    readonly body: unknown;
  }[];
}

/**
 * Whether a caller at `reader` may be served or may write, given the bodies the
 * request touches. A version newer than the reader is a 426 for everyone who
 * cannot process it. An unreadable value is read-only for a reader that
 * declares itself (it can show an inert contract), a refused write for it, and
 * a 426 only for a reader that cannot show it.
 */
export function judgeLifecycleGate(
  input: ILifecycleGateInput,
): LifecycleGateVerdict {
  const scans = input.bodies.map((entry) => ({
    source: entry.source,
    scan: scanLifecycleRequirement(entry.body),
  }));
  const required = Math.max(
    SHIPPED_LIFECYCLE_READER,
    ...scans.map((entry) => entry.scan.required),
  );
  const refusal = (
    status: 426 | 422,
    requiredLifecycleRules: number | null,
    source: LifecycleGateSource,
  ): LifecycleGateVerdict => ({
    kind: 'refuse',
    status,
    code:
      status === 426 ? LIFECYCLE_UNSUPPORTED_CODE : LIFECYCLE_UNREADABLE_CODE,
    reason:
      status === 426
        ? 'lifecycle-rules-unsupported'
        : 'lifecycle-rules-unreadable',
    requiredLifecycleRules,
    readerLifecycleRules: input.reader.level,
    source,
  });

  if (required > input.reader.level) {
    const tripped = scans.find(
      (entry) => entry.scan.required > input.reader.level,
    );
    return refusal(426, required, tripped?.source ?? 'stored');
  }
  const unreadable = scans.find((entry) => entry.scan.unreadable);
  if (!unreadable) return { kind: 'allow' };
  if (!input.reader.declared) return refusal(426, null, unreadable.source);
  if (input.operation === 'write') return refusal(422, null, unreadable.source);
  return {
    kind: 'allow-read-only',
    diagnostic: LIFECYCLE_UNREADABLE_DIAGNOSTIC,
  };
}
