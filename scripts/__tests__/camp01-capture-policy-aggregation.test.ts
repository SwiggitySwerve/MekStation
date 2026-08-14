import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = (relativePath: string) =>
  pathToFileURL(path.resolve(relativePath)).href;
const urls = {
  contract: moduleUrl('scripts/qc/camp01-authority-receipt.contract.mjs'),
  capture: moduleUrl('scripts/qc/camp01-capture-transaction.mjs'),
  facts: moduleUrl('scripts/qc/camp01-durable-facts.mjs'),
  schemas: moduleUrl('scripts/qc/camp01-authority-receipt.schemas.mjs'),
};

const harness = `
import fs from 'node:fs';
import { WAVE_CONTRACTS } from ${JSON.stringify(urls.contract)};
import { capturePolicyFor } from ${JSON.stringify(urls.capture)};
import {
  capturePoliciesFor,
  contextFor,
  writerContext,
} from ${JSON.stringify(urls.facts)};
import { H_TEST_IDS } from ${JSON.stringify(urls.schemas)};
const request=JSON.parse(fs.readFileSync(0,'utf8'));
const digest='sha256:'+'a'.repeat(64);
const exactSha='c'.repeat(40);
const reviewedSha='b'.repeat(40);
const attestation={fixtureAllowlistDigest:digest,barrierPolicyDigest:digest};
const receipt=(digit)=>'receipt-'+digit.repeat(16);
const runId=(digit)=>'camp01-'+digit.repeat(32);
const stub=(wave,mode,sha,digit)=>({
  wave,
  mode,
  sha,
  receiptId:receipt(digit),
  runId:runId(digit),
  row:WAVE_CONTRACTS[wave],
  manifest:{},
  manifestDigest:digest,
  artifacts:wave==='proof-02-triage'?{'proof02-triage.json':{dispositions:[]}}:{},
  command:{
    sha,
    identityRegistry:{schema:'camp01-identity-registry/v1',entities:[],refs:[]},
    captureAttestations:WAVE_CONTRACTS[wave]&&['camp-01e','camp-01h'].includes(wave)?[{...attestation}]:[],
  },
  context:{registryContext:{provenance:[]}},
});
try {
  let value;
  if(request.action==='helper'){
    const dual=capturePoliciesFor('camp-01e',[exactSha,reviewedSha],attestation);
    const none=capturePoliciesFor('camp-01a',[exactSha],attestation);
    const h=capturePoliciesFor('camp-01h',[exactSha],null);
    const policy=capturePolicyFor('camp-01h');
    value={
      dualShas:dual.map((entry)=>entry.sha),
      dualKeys:dual.map((entry)=>entry.wave+'\\0'+entry.sha),
      none,
      hLength:h.length,
      hWave:h[0]?.wave,
      hSha:h[0]?.sha,
      hDigests:[h[0]?.fixtureAllowlistDigest,h[0]?.barrierPolicyDigest],
      policyDigests:[policy.fixtureAllowlistDigest,policy.barrierPolicyDigest],
    };
  } else if(request.action==='contextFor'){
    const row=WAVE_CONTRACTS['camp-01e'];
    const reviewed=stub('camp-01e','reviewed-head',reviewedSha,'8');
    const candidate={
      wave:'camp-01e',
      row,
      mode:'exact-main',
      command:{
        mode:'exact-main',
        sha:exactSha,
        captureAttestations:[{...attestation}],
        provenance:{
          specTupleId:'tuple-'+'2'.repeat(16),
          ownedPrTupleId:'tuple-'+'3'.repeat(16),
          predecessorReceiptIds:[receipt('7')],
        },
        identityRegistry:{refs:[]},
        capProvenance:{reviewedHeadReceiptId:reviewed.receiptId},
      },
    };
    const context=contextFor(candidate,[reviewed]);
    value={
      shas:context.registryContext.capturePolicies.map((entry)=>entry.sha),
      waves:[...new Set(context.registryContext.capturePolicies.map((entry)=>entry.wave))],
      keys:context.registryContext.capturePolicies.map((entry)=>entry.wave+'\\0'+entry.sha),
    };
  } else if(request.action==='writerContext'){
    const row=WAVE_CONTRACTS['camp-01h'];
    const index={
      records:[
        stub('camp-01g','exact-main',reviewedSha,'1'),
        stub('proof-02-triage','exact-main',reviewedSha,'2'),
      ],
      cleanups:[],
      registrations:[],
    };
    const written=writerContext(
      {row,arguments:{mode:'reviewed-head',sha:exactSha,repairs:[]},provenance:{}},
      index,
      {treeSha:exactSha,capProvenance:{subject:'product-pr',headSha:exactSha}},
    );
    value={
      length:written.registryContext.capturePolicies.length,
      shas:written.registryContext.capturePolicies.map((entry)=>entry.sha),
      wave:written.registryContext.capturePolicies[0]?.wave,
    };
  } else if(request.action==='h-inventory'){
    const inventory=H_TEST_IDS['02-command-browser-quick'];
    const prefix='e2e/campaign-customizer-handoff.spec.ts::campaign customizer handoff @campaign @customizer::';
    value={
      length:inventory.length,
      sorted:JSON.stringify(inventory)===JSON.stringify([...inventory].sort()),
      missing:[
        prefix+'selects a saved custom unit at desktop and 390x844 without collapsing identities',
        prefix+'creates a saved custom unit campaign through accepted server persistence',
        prefix+'cold reloads a saved custom unit into Mech Bay without source substitution',
      ].filter((id)=>!inventory.includes(id)),
    };
  }
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error) {
  process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),name:error instanceof Error?error.name:null}));
  process.exitCode=1;
}
`;

type Result = { ok: boolean; value?: unknown; error?: string; name?: string };

function invoke(action: string): Result {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { input: JSON.stringify({ action }), encoding: 'utf8' },
  );
  return result.stdout
    ? (JSON.parse(result.stdout) as Result)
    : { ok: false, error: result.stderr };
}

describe('CAMP-01 capture policy aggregation', () => {
  it('emits both candidate and reviewed-head SHAs for a capture-owning exact-main context', () => {
    const helper = invoke('helper');
    expect(helper).toMatchObject({
      ok: true,
      value: {
        dualShas: ['b'.repeat(40), 'c'.repeat(40)],
        none: [],
        hLength: 1,
        hWave: 'camp-01h',
        hSha: 'c'.repeat(40),
      },
    });
    const value = helper.value as {
      dualKeys: string[];
      hDigests: string[];
      policyDigests: string[];
    };
    expect(value.dualKeys).toEqual(
      [...value.dualKeys].sort((a, b) => a.localeCompare(b)),
    );
    expect(value.hDigests).toEqual(value.policyDigests);
    expect(invoke('contextFor')).toMatchObject({
      ok: true,
      value: {
        shas: ['b'.repeat(40), 'c'.repeat(40)],
        waves: ['camp-01e'],
      },
    });
  });

  it('emits a non-empty camp-01h writerContext capture policy from the wave contract', () => {
    expect(invoke('writerContext')).toMatchObject({
      ok: true,
      value: {
        length: 1,
        shas: ['c'.repeat(40)],
        wave: 'camp-01h',
      },
    });
  });

  it('pins the 02-command-browser-quick inventory at 13 sorted ids', () => {
    expect(invoke('h-inventory')).toEqual({
      ok: true,
      value: { length: 13, sorted: true, missing: [] },
    });
  });
});
