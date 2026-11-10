/** Published facts: append releases; never rewrite a shipped ruleset. */
export const R11A_RELEASE = Object.freeze({
  writer: 2,
  rules: Object.freeze({}),
});

/** C-1c 2b is the next semantic release; there is no separate 2a. */
export const C1C_2B_WITNESS = Object.freeze({
  writer: 3,
  rule: Object.freeze({ introducedIn: 3, definition: 'C-1c 2b counter rule' }),
  before: 7,
  after: 8,
});
