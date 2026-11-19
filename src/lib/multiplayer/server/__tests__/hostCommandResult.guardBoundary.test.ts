import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/** This unused compatibility API appends to the live session before the store
 * guard. A production caller must first move acceptance before that append. */
it('has no production reference to publishHostCommandResult', () => {
  const references: string[] = [];
  function scan(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '__tests__' || entry.name === '__mocks__') continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        scan(file);
        continue;
      }
      if (!/\.[jt]sx?$/.test(file) || /\.(test|spec)\.[jt]sx?$/.test(file))
        continue;
      const source = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      function visit(node: ts.Node): void {
        if (
          (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) &&
          node.text === 'publishHostCommandResult'
        ) {
          const parent = node.parent;
          const declaration =
            (ts.isMethodDeclaration(parent) ||
              ts.isPropertyDeclaration(parent)) &&
            parent.name === node;
          if (!declaration) {
            const { line } = source.getLineAndCharacterOfPosition(
              node.getStart(source),
            );
            references.push(
              `${path.relative(process.cwd(), file)}:${line + 1}`,
            );
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  scan(path.join(process.cwd(), 'src'));
  expect(references).toEqual([]);
});
