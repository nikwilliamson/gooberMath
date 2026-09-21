#!/usr/bin/env bash
#
# Fetch the offline speech model into public/voice/, where the site serves it
# from its own origin. Never committed: 40MB of binary has no place in git.
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

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/public/voice"
PIN="${ROOT}/scripts/voice-model.sha256"
ARCHIVE="${OUT}/${NAME}.tar.gz"
MANIFEST="${OUT}/model.json"

# The URL the app loads is the model's IndexedDB cache key on every device. It
# must never change for the same model, or each device keeps the old 68MB copy
# forever alongside the new one. A new model gets a new NAME, deliberately.
if [[ -f "${ARCHIVE}" && -f "${MANIFEST}" ]]; then
  echo "voice model: ${NAME} already present"
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

# Every number word the grammar uses must be in the model's vocabulary, or
# Vosk silently drops it and that number can never be heard. Some builds ship
# graph/words.txt; the official small model keeps the vocabulary only in the
# symbol table inside graph/Gr.fst (int32 length, bytes, int64 key per entry).
# Node reads either: it is guaranteed wherever `npm run` works.
# Keep the list in sync with src/voice/numbers.ts.
VOCAB="$(node - "${MODEL}" <<'JS'
const fs = require('fs')
const path = require('path')
const dir = process.argv[2]
const WORDS = ('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen ' +
  'fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred').split(' ')
const txt = path.join(dir, 'graph/words.txt')
const gr = path.join(dir, 'graph/Gr.fst')
let has
if (fs.existsSync(txt)) {
  const vocab = new Set(fs.readFileSync(txt, 'utf8').split('\n').map((l) => l.split(/\s/)[0]))
  has = (w) => vocab.has(w)
} else if (fs.existsSync(gr)) {
  const buf = fs.readFileSync(gr)
  has = (w) => {
    const needle = Buffer.alloc(4 + w.length)
    needle.writeInt32LE(w.length, 0)
    needle.write(w, 4)
    return buf.includes(needle)
  }
} else {
  console.error('voice model: no vocabulary found (graph/words.txt or graph/Gr.fst)')
  process.exit(1)
}
const missing = WORDS.filter((w) => !has(w))
if (missing.length) {
  console.error('voice model: missing number words: ' + missing.join(' '))
  process.exit(1)
}
// [unk] lets noise land somewhere other than the nearest number. Only offer
// it in the grammar when the model actually has it.
console.log(has('[unk]') ? 'true' : 'false')
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
mkdir -p "${OUT}"
tar -C "${TMP}" -czf "${ARCHIVE}" "${NAME}"
BYTES="$(wc -c < "${ARCHIVE}" | tr -d ' ')"

cat > "${MANIFEST}" <<JSON
{
  "name": "${NAME}",
  "file": "${NAME}.tar.gz",
  "bytes": ${BYTES},
  "hasUnk": ${HAS_UNK},
  "sha256": "${SHA}"
}
JSON

echo "voice model: ${NAME} ready (${BYTES} bytes, [unk]: ${HAS_UNK})"
