/**
 * Shared Template Record Sheet Renderer
 *
 * The unit-type-agnostic core of the canonical-template rendering
 * pipeline. Owns asset loading, DOM parsing, text injection, off-screen
 * mounting, and SVG serialization — but knows nothing about any
 * particular unit family.
 *
 * The mech renderer (`SVGRecordSheetRenderer`) and the Wave-1 non-mech
 * families (vehicle / aerospace / protomech) both consume this core, so
 * the proven mech rendering substrate is shared rather than forked.
 *
 * It reuses `parseSVGTemplate` from `template.ts` (the proven mech
 * parse + validation) and `renderToCanvasHighDPI` from `canvas.ts`
 * verbatim, and resolves templates through `MmDataAssetService.loadSVG`
 * so the three-source fallback chain applies — no fork of the proven
 * mech logic.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Shared Template Record Sheet Renderer)
 */

import { getMmDataAssetService } from '@/services/assets/MmDataAssetService';

import { renderToCanvasHighDPI } from './canvas';
import { parseSVGTemplate } from './template';

/**
 * A map of template element ID → text value to inject.
 * Keys are canonical template `id=` attribute values.
 */
export type TextBindings = Readonly<Record<string, string>>;

/**
 * A pip-fill instruction: a template pip-group element ID paired with
 * the number of pips to lay out inside that group's region geometry.
 * Consumed by the shared pip engine via `applyPips`.
 */
export interface PipFill {
  /** Template pip-group element ID (e.g. `armorPipsFR`, `armorPipsNOS`). */
  readonly groupId: string;
  /** Number of pip elements to render. */
  readonly count: number;
  /** Optional CSS class applied to each rendered pip. */
  readonly className?: string;
  /** Whether the pip group uses the alternate clustered layout. */
  readonly grouped?: boolean;
}

/** A function that lays out one `PipFill` against a resolved group element. */
export type PipApplicator = (
  svgDoc: Document,
  group: Element,
  fill: PipFill,
) => void;

/**
 * Shared, unit-type-agnostic record-sheet template renderer.
 *
 * Lifecycle:
 *   1. `loadTemplate(path)` — fetch + parse the canonical template SVG.
 *   2. `mount()` — attach the SVG to an off-screen DOM container so
 *      geometry measurement (`getBBox()`) and web-font-aware text
 *      measurement work. Idempotent.
 *   3. `applyBindings(texts)` — inject text by element ID.
 *   4. `applyPips(fills, applicator)` — lay out pip groups.
 *   5. `getSVGString()` — serialize; also unmounts the off-screen node.
 */
export class TemplateRecordSheetRenderer {
  private svgDoc: Document | null = null;
  private svgRoot: SVGSVGElement | null = null;
  /** The off-screen container holding the mounted SVG, when mounted. */
  private mountContainer: HTMLElement | null = null;

  /**
   * Load and parse a canonical template SVG.
   *
   * Resolves the template through `MmDataAssetService.loadSVG`, so the
   * three-source fallback chain (local bundled → jsDelivr CDN → GitHub
   * raw) and the asset cache both apply — a missing local asset
   * degrades to CDN / raw rather than failing. The fetched markup is
   * then validated and parsed by `parseSVGTemplate`, the same parse +
   * validation the mech `loadSVGTemplate` path uses.
   */
  loadTemplate = async (templatePath: string): Promise<void> => {
    const svgText = await getMmDataAssetService().loadSVG(templatePath);
    const { svgDoc, svgRoot } = parseSVGTemplate(svgText, templatePath);
    this.svgDoc = svgDoc;
    this.svgRoot = svgRoot;
  };

  /** The parsed template document. Throws if no template is loaded. */
  get document(): Document {
    if (!this.svgDoc) {
      throw new Error('Template not loaded. Call loadTemplate() first.');
    }
    return this.svgDoc;
  }

  /** The parsed template root element. Throws if no template is loaded. */
  get root(): SVGSVGElement {
    if (!this.svgRoot) {
      throw new Error('Template not loaded. Call loadTemplate() first.');
    }
    return this.svgRoot;
  }

  /** Whether the SVG is currently attached to the off-screen container. */
  get isMounted(): boolean {
    return this.mountContainer !== null;
  }

  /**
   * Mount the parsed SVG into an off-screen DOM container.
   *
   * The shared pip engine measures template region `<rect>` geometry;
   * when a region is measured via `getBBox()` the element MUST be
   * attached to a rendered document or the bounds come back zeroed.
   * Web-font-aware text auto-shrink has the same live-DOM requirement.
   * The container is absolutely positioned far off-viewport and made
   * invisible so it never affects layout or paints.
   *
   * Idempotent — a second call while already mounted is a no-op. Safe
   * to call in non-DOM environments: when `document` is unavailable the
   * method returns without mounting (attribute-based geometry still
   * works for callers that do not need `getBBox()`).
   */
  mount = (): void => {
    if (this.mountContainer) {
      return;
    }
    if (typeof document === 'undefined' || !this.svgRoot) {
      return;
    }
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'absolute';
    container.style.left = '-99999px';
    container.style.top = '-99999px';
    container.style.width = '0';
    container.style.height = '0';
    container.style.overflow = 'hidden';
    container.style.visibility = 'hidden';
    container.appendChild(this.svgRoot);
    document.body.appendChild(container);
    this.mountContainer = container;
  };

  /**
   * Remove the off-screen container from the document.
   *
   * `mount()` moves the SVG root out of the parsed template document
   * and into the container; `unmount()` restores it so the parsed
   * document is whole again — leaving the document/root relationship
   * exactly as it was before `mount()`. The container is then removed
   * from the page. Idempotent.
   */
  unmount = (): void => {
    if (!this.mountContainer) {
      return;
    }
    if (this.svgRoot && this.svgRoot.parentNode === this.mountContainer) {
      this.mountContainer.removeChild(this.svgRoot);
      // Restore the root into its original parsed document so
      // serialization of the document remains correct.
      if (this.svgDoc) {
        this.svgDoc.appendChild(this.svgRoot);
      }
    }
    if (this.mountContainer.parentNode) {
      this.mountContainer.parentNode.removeChild(this.mountContainer);
    }
    this.mountContainer = null;
  };

  /**
   * Await web-font readiness before any text-width measurement.
   *
   * If a binding field auto-shrinks to fit, measuring text width before
   * the record-sheet web font has loaded yields wrong widths and
   * inconsistent shrink. Centralizing the await here means every
   * consuming family inherits the fix. Resolves immediately in
   * environments without the Font Loading API.
   */
  awaitFontsReady = async (): Promise<void> => {
    if (
      typeof document !== 'undefined' &&
      'fonts' in document &&
      document.fonts &&
      typeof document.fonts.ready?.then === 'function'
    ) {
      await document.fonts.ready;
    }
  };

  /**
   * Resolve an element by ID within the template SVG.
   *
   * Searches the SVG ROOT subtree rather than the parsed document:
   * `mount()` detaches the root from the parsed document and re-parents
   * it under the off-screen container, after which
   * `document.getElementById` would return `null`. Searching the root
   * subtree works whether or not the renderer is currently mounted.
   *
   * `CSS.escape` guards IDs containing characters that are not bare
   * CSS-selector-safe (defensive — canonical template IDs are simple).
   */
  private elementById(id: string): Element | null {
    if (this.svgRoot && this.svgRoot.getAttribute('id') === id) {
      return this.svgRoot;
    }
    const escaped =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(id)
        : id.replace(/(["\\#.;:>~+*[\]()])/g, '\\$1');
    return this.root.querySelector(`#${escaped}`);
  }

  /**
   * Inject text bindings into the template by element ID.
   *
   * For each entry, the element is located within the SVG root subtree
   * and its `textContent` is set. Elements absent from the template are
   * silently skipped — a binding for a missing ID is a no-op, never an
   * error.
   */
  applyBindings = (texts: TextBindings): void => {
    for (const [id, value] of Object.entries(texts)) {
      const element = this.elementById(id);
      if (element) {
        element.textContent = value;
      }
    }
  };

  /**
   * Lay out pip groups using the supplied pip applicator.
   *
   * Each `PipFill` names a template pip-group element ID; the applicator
   * (the shared pip engine, injected to keep this core free of any
   * specific layout algorithm) resolves the group and lays out the
   * pips. Resolution — including the `grouped`-layout fallback — is the
   * applicator's responsibility.
   *
   * The SVG MUST be mounted (`mount()`) before this is called if the
   * applicator measures geometry via `getBBox()`.
   */
  applyPips = (fills: readonly PipFill[], applicator: PipApplicator): void => {
    // `doc` is used only to create new pip elements (createElementNS),
    // which works whether or not the root is currently mounted. Group
    // resolution goes through `elementById`, which searches the root
    // subtree and is therefore mount-safe.
    const doc = this.document;
    for (const fill of fills) {
      if (fill.count <= 0) {
        continue;
      }
      const group = this.elementById(fill.groupId);
      if (group) {
        applicator(doc, group, fill);
        continue;
      }
      // Grouped-layout fallback — retry the `<id>grouped` element.
      const grouped = this.elementById(`${fill.groupId}grouped`);
      if (grouped) {
        applicator(doc, grouped, fill);
      }
    }
  };

  /**
   * Serialize the (possibly mutated) template document to an SVG string.
   *
   * Unmounts the off-screen container FIRST — `unmount()` restores the
   * SVG root into the parsed document, so serializing the document is
   * correct whether or not the renderer was ever mounted. This keeps
   * the output byte-identical to the pre-refactor mech path (which
   * serialized `svgDoc` and never mounted).
   */
  getSVGString = (): string => {
    const doc = this.document;
    // Detach the off-screen container (restores root into doc) before
    // serializing, so no detached DOM nodes are left behind.
    this.unmount();
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  };

  /**
   * Rasterize the current template document onto a canvas at high DPI.
   * Delegates to the proven `renderToCanvasHighDPI` mech code path.
   */
  renderToCanvas = async (
    canvas: HTMLCanvasElement,
    dpiMultiplier: number,
  ): Promise<void> => {
    const svgString = this.getSVGString();
    await renderToCanvasHighDPI(svgString, canvas, dpiMultiplier);
  };
}
