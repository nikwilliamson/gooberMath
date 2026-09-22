#!/usr/bin/env bash
#
# Fetch the offline speech model, repack it for grammar mode, and put it in
# public/voice/, where the site serves it from its own origin. Never committed:
# tens of MB of binary have no place in git.
#
#   npm run voice:model
#
# CI runs this before every deploy (cached). Locally, run it once before
# `npm run dev` if you want voice to work in development.
#
# Integrity: the zip's sha256 is pinned in scripts/voice-model.sha256. The first
# run on a machine with no pin writes one and says so. Commit it, and every
# later run (CI included) fails loudly if the download ever changes.
#
set -euo pipefail

NAME="vosk-model-small-en-us-0.15"
URL="https://alphacephei.com/vosk/models/${NAME}.zip"
# What the app serves: the model repacked for grammar mode (see below). The
# suffix is part of the URL, and the URL is the on-device cache key, so a
# change to the repack needs a new suffix.
SERVED="${NAME}-grammar"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/public/voice"
PIN="${ROOT}/scripts/voice-model.sha256"
ARCHIVE="${OUT}/${SERVED}.tar.gz"
MANIFEST="${OUT}/model.json"

# The URL the app loads is the model's IndexedDB cache key on every device. It
# must never change for the same model, or each device keeps the old 68MB copy
# forever alongside the new one. A new model gets a new NAME, deliberately.
if [[ -f "${ARCHIVE}" && -f "${MANIFEST}" ]]; then
  echo "voice model: ${SERVED} already present"
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

# VOICE_MODEL_ZIP points at a local copy instead (offline machines, tests).
if [[ -n "${VOICE_MODEL_ZIP:-}" ]]; then
  echo "voice model: using ${VOICE_MODEL_ZIP}"
  cp "${VOICE_MODEL_ZIP}" "${TMP}/model.zip"
else
  echo "voice model: downloading ${URL}"
  curl -fL --retry 3 --retry-delay 2 -o "${TMP}/model.zip" "${URL}"
fi

SHA="$(shasum -a 256 "${TMP}/model.zip" | cut -d' ' -f1)"
if [[ -f "${PIN}" ]]; then
  EXPECTED="$(tr -d '[:space:]' < "${PIN}")"
  if [[ "${SHA}" != "${EXPECTED}" ]]; then
    echo "voice model: sha256 mismatch" >&2
    echo "  expected ${EXPECTED}" >&2
    echo "  got      ${SHA}" >&2
    exit 1
  fi
  echo "voice model: sha256 verified"
fi

unzip -q "${TMP}/model.zip" -d "${TMP}"
MODEL="${TMP}/${NAME}"
[[ -f "${MODEL}/am/final.mdl" ]] || { echo "voice model: ${NAME}/am/final.mdl missing — unexpected layout" >&2; exit 1; }

# Two things happen in one pass over graph/Gr.fst, the model's language model:
#
# 1. Every number word the grammar uses must be in the model's vocabulary, or
#    Vosk silently drops it and that number can never be heard. The official
#    small model keeps the vocabulary only in the symbol table inside Gr.fst
#    (int32 length, bytes, int64 key per entry). Keep the list in sync with
#    src/voice/numbers.ts.
#
# 2. The game only ever decodes with a runtime grammar (numbers 0-100), and in
#    grammar mode Vosk builds its own small graph and never reads Gr.fst's
#    200k-word n-gram model — but it still loads all 24MB of it. So Gr.fst is
#    replaced with a one-state stub that carries only the symbol table, which
#    Vosk does still read from it. Measured in the real worker: identical
#    decoding, 41MB -> 28MB download, ~50MB less memory once loaded.
#    (OpenFst binary layout: FstHeader, then the symbol tables the flags
#    announce, then VectorFst states.)
VOCAB="$(node - "${MODEL}" <<'JS'
const fs = require('fs')
const path = require('path')
const dir = process.argv[2]
const WORDS = ('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen ' +
  'fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred').split(' ')
const gr = path.join(dir, 'graph/Gr.fst')
if (!fs.existsSync(gr)) {
  console.error('voice model: graph/Gr.fst missing — not a lookahead model, the runtime grammar would not work')
  process.exit(1)
}
const buf = fs.readFileSync(gr)
let off = 0
const i32 = () => { const v = buf.readInt32LE(off); off += 4; return v }
const i64 = () => { const v = buf.readBigInt64LE(off); off += 8; return v }
const str = () => { const n = i32(); const v = buf.toString('utf8', off, off + n); off += n; return v }
const magic = i32()
if (magic !== 0x7eb2fdd6) { console.error('voice model: Gr.fst is not an OpenFst file'); process.exit(1) }
str(); str(); i32() // fsttype, arctype, version
const flags = i32()
off += 8 + 8 + 8 + 8 // properties, start, numstates, numarcs
const table = () => {
  const start = off
  i32(); str(); i64()
  const size = Number(i64())
  const symbols = new Set()
  for (let i = 0; i < size; i++) { symbols.add(str()); i64() }
  return { bytes: buf.subarray(start, off), symbols }
}
if (flags & 1) table() // input symbols: not needed
if (!(flags & 2)) { console.error('voice model: Gr.fst carries no output symbol table'); process.exit(1) }
const osyms = table()
const missing = WORDS.filter((w) => !osyms.symbols.has(w))
if (missing.length) {
  console.error('voice model: missing number words: ' + missing.join(' '))
  process.exit(1)
}

// The stub: a VectorFst with one final state, no arcs, and the output symbols.
const parts = []
const w32 = (v) => { const b = Buffer.alloc(4); b.writeInt32LE(v); parts.push(b) }
const w64 = (v) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(v)); parts.push(b) }
const wstr = (s) => { w32(s.length); parts.push(Buffer.from(s, 'utf8')) }
w32(0x7eb2fdd6)     // kFstMagicNumber
wstr('vector'); wstr('standard')
w32(2)              // VectorFst file version
w32(2)              // flags: kHasOSymbols
w64(0)              // properties: unknown, computed on demand
w64(0)              // start state
w64(1)              // numstates
w64(0)              // numarcs
parts.push(osyms.bytes)
parts.push(Buffer.from([0, 0, 0, 0])) // state 0 final weight: 0.0f (tropical one)
w64(0)              // no arcs
fs.writeFileSync(gr, Buffer.concat(parts))

// [unk] lets noise land somewhere other than the nearest number. Only offer
// it in the grammar when the model actually has it.
console.log(osyms.symbols.has('[unk]') ? 'true' : 'false')
JS
)"
HAS_UNK="${VOCAB}"

# Pin only now, once the download has proved to be a usable model.
if [[ ! -f "${PIN}" ]]; then
  if [[ -n "${CI:-}" ]]; then
    # Don't block a deploy of everything else on this, but make it impossible to miss.
    echo "::warning::voice model sha256 is not pinned. Run npm run voice:model locally and commit scripts/voice-model.sha256. Got ${SHA}."
  else
    echo "${SHA}" > "${PIN}"
    echo "voice model: no pin yet — wrote ${SHA} to scripts/voice-model.sha256. Commit it."
  fi
fi

# The worker strips the archive's first path component, so keep the folder.
# COPYFILE_DISABLE stops macOS tar adding ._* resource forks, which the worker
# would faithfully unpack.
rm -f "${MODEL}/README"
mv "${MODEL}" "${TMP}/${SERVED}"
mkdir -p "${OUT}"
# Earlier repacks are dead weight in dist/ and nothing serves them.
find "${OUT}" -maxdepth 1 -name 'vosk-model-*.tar.gz' ! -name "${SERVED}.tar.gz" -delete
COPYFILE_DISABLE=1 tar -C "${TMP}" -czf "${ARCHIVE}" "${SERVED}"
BYTES="$(wc -c < "${ARCHIVE}" | tr -d ' ')"

cat > "${MANIFEST}" <<JSON
{
  "name": "${SERVED}",
  "file": "${SERVED}.tar.gz",
  "bytes": ${BYTES},
  "hasUnk": ${HAS_UNK},
  "sha256": "${SHA}"
}
JSON

echo "voice model: ${SERVED} ready (${BYTES} bytes, [unk]: ${HAS_UNK})"
