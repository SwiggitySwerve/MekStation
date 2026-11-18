/** Escape an inline value without changing the existing CI report format. */
export const markdownCell = (value) =>
  String(value)
    .replaceAll('|', '\\|')
    .replace(/[\r\n]/g, ' ')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
