import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export function staticImportClosure(
  entry,
  { root = process.cwd(), inspectSpecifier = () => {} } = {},
) {
  const visited = new Set();
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(path.resolve(root, file), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    assert.deepEqual(source.parseDiagnostics, [], `Cannot parse ${file}`);
    function inspect(node) {
      const specifier =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isCallExpression(node) &&
              (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                (ts.isIdentifier(node.expression) &&
                  node.expression.text === 'require'))
            ? node.arguments[0]
            : undefined;
      if (specifier && ts.isStringLiteralLike(specifier)) {
        inspectSpecifier(specifier.text, file);
        if (specifier.text.startsWith('.'))
          visit(path.posix.join(path.posix.dirname(file), specifier.text));
      }
      ts.forEachChild(node, inspect);
    }
    inspect(source);
  }
  visit(entry);
  return visited;
}
