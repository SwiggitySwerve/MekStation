import * as fs from 'node:fs';
import * as path from 'node:path';

import { WAVE_CONTRACTS } from './camp01-authority-receipt.contract.mjs';
import { validateReceiptDirectory } from './camp01-authority-receipt.mjs';
import {
  canonicalBytes,
  resolveReceiptRow,
} from './camp01-authority-receipt.schemas.mjs';
import { createRepairRegistry } from './camp01-repair-registry.mjs';

// prettier-ignore
const REQUIRED=['wave','run-root','expected-sha','mode'], ARGUMENTS=[...REQUIRED,'repair-registration'], CONTEXT_KEYS=['registryContext','reviewedHead','reproduction','repairDeclaration','repairSource'], SHA=/^[0-9a-f]{40}$/, DIGEST=/^sha256:[0-9a-f]{64}$/, RUN_ID=/^camp01-[0-9a-f]{32}$/;

// prettier-ignore
function parseArguments(argv) { const values={}; for (const token of argv) { const match=/^--([a-z-]+)=(.+)$/.exec(token); if (!match || !ARGUMENTS.includes(match[1]) || Object.hasOwn(values,match[1])) fail('invalid or duplicate argument'); values[match[1]]=match[2]; } if (REQUIRED.some((name)=>!Object.hasOwn(values,name))) fail('missing argument'); return values; }
// prettier-ignore
function parseContext(raw) { if (!raw) fail('validation context missing'); const value=JSON.parse(raw); if (!value || typeof value!=='object' || Array.isArray(value) || !Object.hasOwn(value,'registryContext') || !Object.hasOwn(value,'reviewedHead') || Object.keys(value).some((key)=>!CONTEXT_KEYS.includes(key))) fail('validation context drift'); return value; }
// prettier-ignore
function receiptChild(runRoot) { const entries=fs.readdirSync(runRoot,{withFileTypes:true}); if (entries.length!==1 || !entries[0].isDirectory() || entries[0].isSymbolicLink() || !RUN_ID.test(entries[0].name)) fail('run root must contain one finalized receipt child'); return entries[0].name; }

// prettier-ignore
function main() { const values=parseArguments(process.argv.slice(2)); if (!SHA.test(values['expected-sha'])) fail('invalid expected SHA'); if (!['reviewed-head','exact-main'].includes(values.mode)) fail('invalid mode'); let context=parseContext(process.env.CAMP01_VALIDATION_CONTEXT); const fixed=Object.hasOwn(WAVE_CONTRACTS,values.wave), reference=values['repair-registration']; if(fixed&&reference!==undefined||!fixed&&reference!==undefined&&!DIGEST.test(reference))fail('repair registration drift'); if(!fixed&&reference!==undefined){const initiatingRoot=process.env.CAMP01_REPAIR_REGISTRY_ROOT??process.cwd(), registration=createRepairRegistry({initiatingRoot,readOnly:true}).require(reference), supplied=[context.repairDeclaration,context.repairSource];if(registration.wave!==values.wave||supplied.some(Boolean)&&(!supplied.every(Boolean)||canonicalBytes(supplied[0])!==canonicalBytes(registration.declaration)||canonicalBytes(supplied[1])!==canonicalBytes(registration.source)))fail('repair registration drift');context={...context,repairDeclaration:registration.declaration,repairSource:registration.source};} const row=resolveReceiptRow(values.wave,context.repairDeclaration??null,context.repairSource??null), expectedRoot=row.runRootTemplate.replace('<sha>',values['expected-sha']); if (values['run-root']!==expectedRoot) fail('run root mismatch'); const root=path.resolve(values['run-root']), runId=receiptChild(root); validateReceiptDirectory(path.join(root,runId),{...context,expectedWave:row.wave,expectedSha:values['expected-sha'],expectedMode:values.mode,expectedRunId:runId}); process.stdout.write('CAMP01 receipt valid\n'); }
// prettier-ignore
function fail(message) { throw new Error(`CAMP01_VALIDATOR_INVALID: ${message}`); }

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
