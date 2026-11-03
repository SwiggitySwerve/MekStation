import { PaperSize } from '@/types/printing';

import type { ICapitalRecordSheetData } from '../recordsheet/dataExtractors.capital';

import { selectCapitalTemplate } from '../recordsheet/dataExtractors.capital';
import { bindCapital } from './capital/bindings';
import { layoutPipsInGroup } from './pipEngine';
import { TemplateRecordSheetRenderer } from './templateRecordSheetRenderer';
export { bindCapital } from './capital/bindings';

interface InventoryLine {
  text: string;
  sourceIndex?: number;
}
/** Preserve every source row and wrap prose before pagination; no numerical rules. */
export function capitalInventory(
  data: ICapitalRecordSheetData,
): InventoryLine[] {
  const lines: InventoryLine[] = [
    {
      text: `SI: ${data.structuralIntegrity ?? 'unavailable'}; Thrust: ${data.safeThrust ?? 'unavailable'}/${data.maxThrust ?? 'unavailable'}; Fuel points: ${data.fuel ?? 'unavailable'}`,
    },
    ...data.crew.map((r) => ({ text: `${r.label}: ${r.count}` })),
    ...(data.kf ?? []).map((r) => ({
      text: `${r.label}: ${r.detail ?? r.count}`,
    })),
    ...data.transport.map((r) => ({
      text: `${r.count} x ${r.label}: ${r.detail ?? ''}`,
    })),
    ...data.weaponBays.flatMap((b) => [
      {
        text: `${b.arc} - ${b.number ? `source bay ${b.number}` : 'equipment'}`,
      },
      ...b.items.map((i) => ({ text: i.name, sourceIndex: i.sourceIndex })),
    ]),
    ...(data.unresolved.length
      ? [
          {
            text: `${data.unresolved.length} unresolved mounts: weapon figures and affected arc heat unavailable.`,
          },
        ]
      : []),
  ];
  return lines.flatMap((line) => {
    const words = line.text.split(/\s+/);
    const wrapped: InventoryLine[] = [];
    let text = '';
    for (const word of words) {
      if ((text + ' ' + word).length > 65 && text) {
        wrapped.push({ ...line, text });
        text = '';
      }
      text += (text ? ' ' : '') + word;
    }
    if (text) wrapped.push({ ...line, text });
    return wrapped;
  });
}

/** Canonical front and reverse pages. Missing assets fail visibly; no fake sheet. */
export async function renderCapitalSheetPages(
  data: ICapitalRecordSheetData,
  paperSize = PaperSize.LETTER,
): Promise<string[]> {
  const key = selectCapitalTemplate(data);
  const directory =
    paperSize === PaperSize.A4 ? 'templates_iso' : 'templates_us';
  const lines = capitalInventory(data);
  const pages: string[] = [];
  let offset = 0;
  do {
    const renderer = new TemplateRecordSheetRenderer();
    try {
      try {
        await renderer.loadTemplate(
          `/record-sheets/${directory}/${pages.length ? 'advaero_reverse' : key}.svg`,
        );
      } catch (error) {
        throw new Error(
          'The capital record-sheet template could not be loaded. Reload to try again.',
          { cause: error },
        );
      }
      const region = renderer.document.getElementById('inventory');
      if (!region)
        throw new Error(
          'The capital sheet cannot be drawn with this template.',
        );
      const x = Number(region.getAttribute('x')),
        y = Number(region.getAttribute('y')),
        height = Number(region.getAttribute('height')),
        width = Number(region.getAttribute('width'));
      const capacity = Math.floor((height - 8) / 7);
      if (!(capacity > 0 && width > 0))
        throw new Error(
          'The capital sheet cannot be drawn with this template.',
        );
      const chunk = lines.slice(offset, offset + capacity);
      offset += chunk.length;
      const group = renderer.document.createElementNS(
        'http://www.w3.org/2000/svg',
        'g',
      );
      group.setAttribute('data-capital-inventory', 'true');
      region.parentNode!.appendChild(group);
      chunk.forEach((line, i) => {
        const text = renderer.document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text',
        );
        text.setAttribute('x', String(x + 2));
        text.setAttribute('y', String(y + 8 + i * 7));
        text.setAttribute('font-size', '6');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('fill', '#000');
        if (line.sourceIndex !== undefined)
          text.setAttribute('data-source-index', String(line.sourceIndex));
        text.textContent = line.text;
        group.appendChild(text);
      });
      const bindings = bindCapital(data);
      renderer.applyBindings({
        ...bindings.texts,
        title: `${bindings.texts.title}${pages.length ? ' (CONTINUED)' : ''}`,
      });
      // Unfilled demonstration names must never reach a published sheet.
      for (const element of renderer.root.querySelectorAll('text')) {
        if (element.textContent?.includes('Lorem Ipsum'))
          element.textContent = '';
        if (element.textContent?.includes('%s DATA'))
          element.textContent = `${data.shipType.toUpperCase()} DATA (Cont.)`;
        if (element.textContent?.includes('%d'))
          element.textContent = element.textContent.replace(
            '%d',
            String(new Date().getFullYear()),
          );
      }
      if (!pages.length)
        renderer.applyPips(bindings.pips, (doc, group, fill) =>
          layoutPipsInGroup(doc, group, fill.count, {
            className: fill.className,
          }),
        );
      renderer.root.setAttribute('data-template-source', 'mm-data-canonical');
      renderer.root.setAttribute(
        'data-capital-template',
        pages.length ? 'advaero_reverse' : key,
      );
      pages.push(renderer.getSVGString());
    } finally {
      renderer.unmount();
    }
  } while (offset < lines.length);
  return pages;
}
