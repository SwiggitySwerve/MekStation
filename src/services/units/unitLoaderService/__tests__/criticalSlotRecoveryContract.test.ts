import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

it('has an explicit dispatcher arm for every critical-entry kind and no default arm', () => {
  const directory = join(process.cwd(), 'src/services/units/unitLoaderService');
  const parse = (file: string) =>
    ts.createSourceFile(
      file,
      readFileSync(join(directory, file), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
  const types = parse('criticalSlotRecognitionTypes.ts');
  const kind = types.statements.find(
    (node): node is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(node) && node.name.text === 'CriticalEntryKind',
  );
  if (!kind || !ts.isUnionTypeNode(kind.type)) {
    throw new Error('Missing critical-entry kind union');
  }
  const kinds = kind.type.types.map((node) => {
    if (!ts.isLiteralTypeNode(node) || !ts.isStringLiteral(node.literal)) {
      throw new Error(
        'Critical-entry kinds must be explicit string identities',
      );
    }
    return node.literal.text;
  });
  const source = parse('criticalSlotEquipment.ts');
  const dispatcher = source.statements.find(
    (node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) &&
      node.name?.text === 'recoverCriticalSlotEntries',
  );
  const dispatch = dispatcher?.body?.statements.find(ts.isSwitchStatement);
  if (!dispatch) throw new Error('Missing critical-entry dispatcher switch');
  const arms = dispatch.caseBlock.clauses.map((clause) => {
    if (!ts.isCaseClause(clause) || !ts.isStringLiteral(clause.expression)) {
      throw new Error(
        'Every kind requires an explicit arm; no default allowed',
      );
    }
    return clause.expression.text;
  });
  expect(arms.sort()).toEqual(kinds.sort());
});
