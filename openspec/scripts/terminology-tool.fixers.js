/**
 * Apply only the exact matches classified by the shared detector.
 * Later columns are replaced first, so earlier match offsets stay stable.
 */
function applyFixes(content, violations, config) {
  const lines = content.split('\n');
  let fixed = 0;
  const ordered = [...violations].sort(
    (a, b) => b.line - a.line || b.column - a.column,
  );
  for (const violation of ordered) {
    if (!violation.fixable) continue;
    const index = violation.line - 1;
    const line = lines[index];
    if (line === undefined) throw new Error('Stale violation line');
    const offset = line.indexOf(violation.found, violation.column - 1);
    if (offset < 0) throw new Error('Stale violation match');
    const replacement = replacementFor(violation, config);
    if (replacement === undefined || replacement === violation.found) continue;
    lines[index] =
      line.slice(0, offset) +
      replacement +
      line.slice(offset + violation.found.length);
    fixed++;
  }
  return { content: lines.join('\n'), fixed };
}

function replacementFor(violation, config) {
  const term = config.deprecatedTerms.find(
    (rule) => rule.id === violation.ruleId,
  );
  if (term) {
    const smart =
      term.preserveCase &&
      config.smartReplacements[term.deprecated.toLowerCase()];
    return (smart && smart[violation.found]) || term.canonical;
  }
  const property = config.propertyViolations.find(
    (rule) => rule.id === violation.ruleId,
  );
  if (property) {
    const prefix = violation.found.match(/^(?:readonly\s+)?/)[0];
    return prefix + property.canonical;
  }
  const capitalization = config.capitalizationRules.find(
    (rule) => rule.id === violation.ruleId,
  );
  if (capitalization && !capitalization.canonical.includes(' or '))
    return capitalization.canonical;
  return undefined;
}

exports.applyFixes = applyFixes;
