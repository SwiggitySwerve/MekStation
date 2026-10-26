import { PaperSize } from '@/types/printing';

/** Short paper name for the sheet caption and the phone toolbar's paper control. */
export const PAPER_SHORT_LABEL: Record<PaperSize, string> = {
  [PaperSize.LETTER]: 'Letter',
  [PaperSize.A4]: 'A4',
};
