import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Read-only portable reader. It never writes, invokes Git, runs source code,
// contacts a service, or changes the captured task/status objects.
const root = fileURLToPath(new URL('.', import.meta.url));
const index = JSON.parse(fs.readFileSync(`${root}/ARCHIVE-INDEX.json`, 'utf8'));
const name = process.argv[2] ?? '--summary';
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
if (name === '--summary') {
  console.log(JSON.stringify({
    status: index.status,
    archives: index.archives,
    sourceQualification: index.sourceQualification,
    historicalCore: index.historicalCore,
    localOnlyIndex: index.localOnlyIndex,
    laterParentSlots: index.laterParentSlots,
  }, null, 2));
} else {
  const archive = index.archives.find((item) => item.name === name);
  assert.ok(archive, 'Use p2, history, current, or --summary.');
  const chunks = Array.from({ length: archive.parts }, (_, ordinal) => {
    const file = `chunk-${String(ordinal).padStart(archive.ordinalDigits, '0')}.json`;
    const chunk = JSON.parse(fs.readFileSync(`${root}/${archive.directory}/${file}`, 'utf8'));
    assert.equal(chunk.ordinal, ordinal);
    const bytes = Buffer.from(name === 'p2' ? chunk.gzipBase64Chunk : chunk.brotliBase64Lines.join(''), 'base64');
    assert.equal(bytes.length, chunk.compressedBytes);
    assert.equal(sha(bytes), chunk.compressedSHA256);
    return bytes;
  });
  const compressed = Buffer.concat(chunks);
  assert.equal(compressed.length, archive.compressed.bytes);
  assert.equal(sha(compressed), archive.compressed.sha256);
  const decoded = name === 'p2' ? zlib.gunzipSync(compressed) : zlib.brotliDecompressSync(compressed);
  assert.equal(decoded.length, archive.decoded.bytes);
  assert.equal(sha(decoded), archive.decoded.sha256);
  let members;
  let memberData;
  if (name === 'p2') {
    const value = JSON.parse(decoded);
    members = [value.originalManifest, ...value.authoredFiles, value.generatedEvidence, ...value.receipts];
  } else {
    const headerLength = Number(decoded.readBigUInt64LE(0));
    const header = JSON.parse(decoded.subarray(8, 8 + headerLength));
    members = header.members;
    memberData = decoded.subarray(8 + headerLength);
    let offset = 0;
    for (const member of members) {
      assert.equal(member.offset, offset);
      offset += member.bytes;
    }
    assert.equal(memberData.length, offset);
    assert.equal(header.originalMemberBytes, offset);
    if (name === 'history') {
      const manifest = Buffer.from(members.map((member) => `${member.originalPath}\t${member.bytes}\t${member.sha256}\n`).join(''));
      assert.equal(manifest.length, index.historicalManifestLF.bytes);
      assert.equal(sha(manifest), index.historicalManifestLF.sha256);
    }
  }
  assert.equal(members.length, archive.members);
  assert.equal(members.reduce((sum, member) => sum + member.bytes, 0), archive.originalMemberBytes);
  const memberOption = process.argv.indexOf('--member');
  if (memberOption >= 0) {
    const path = process.argv[memberOption + 1];
    const matches = members.filter((member) => member.originalPath === path || member.originalRelativePath === path);
    assert.equal(matches.length, 1, 'Supply one exact originalPath (or P2 originalRelativePath) from --list.');
    const member = matches[0];
    const bytes = name === 'p2' ? Buffer.from(member.utf8, 'utf8') :
      memberData.subarray(member.offset, member.offset + member.bytes);
    assert.equal(bytes.length, member.bytes);
    assert.equal(sha(bytes), member.sha256);
    process.stdout.write(bytes);
  } else {
    assert.ok(process.argv.includes('--list'), 'Use --list or --member with one exact original path.');
    console.log(JSON.stringify(members.map(({ originalPath, originalRelativePath, captureSource, bytes, sha256, offset }) =>
      ({ originalPath, originalRelativePath, captureSource, bytes, sha256, offset })), null, 2));
  }
}
