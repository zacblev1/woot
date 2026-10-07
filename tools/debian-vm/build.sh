#!/usr/bin/env bash
# Build the in-browser Debian VM and assemble the deployable directory.
#
#   tools/debian-vm/build.sh [OUT_DIR]      (default: public/vm)
#
# Needs: docker (with linux/386 support, native on x86_64), node, zstd.
# Output is self-consistent: emulator JS + wasm + BIOS + snapshot all come from
# the pinned v86 below (a snapshot only restores on the build that made it),
# and every file except manifest.json is content-hashed (cache immutable).
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
OUT="$(realpath -m "${1:-$ROOT/public/vm}")"
WORK="$DIR/.work"
IMAGE=local/woot-debian-v86
MEMORY_MB=256

# Upstream v86 files not shipped in the npm package, pinned by commit + sha256.
V86_COMMIT=6db8b157974dbaf1b54d2c2ec12dd71ddc1891e9
UPSTREAM=(
  "bios/seabios.bin 73e3f359102e3a9982c35fce98eb7cd08f18303ac7f1ba6ebfbe6cdc1c244d98"
  "bios/vgabios.bin a4bc0d80cc3ca028c73dafa8fee396b8d054ce87ebd8abfbd31b06b437607880"
  "tools/fs2json.py 546b0ce7d0b172fa855587209318a8d473bce6de23fa327ceeb5b6c115fda23f"
  "tools/copy-to-sha256.py 7bfb94736afbb9753b6deea922184eec2f9b205be0214bc5f9866cf990bfa77c"
)

log() { printf '\n==> %s\n' "$*"; }

log "Installing pinned v86"
(cd "$DIR" && npm ci --no-audit --no-fund --silent)

log "Fetching pinned upstream files"
mkdir -p "$WORK/upstream/bios" "$WORK/upstream/tools"
for entry in "${UPSTREAM[@]}"; do
  read -r path sum <<<"$entry"
  dest="$WORK/upstream/$path"
  if ! echo "$sum  $dest" | sha256sum -c --status 2>/dev/null; then
    curl -fsSL "https://raw.githubusercontent.com/copy/v86/$V86_COMMIT/$path" -o "$dest"
    echo "$sum  $dest" | sha256sum -c --quiet
  fi
done

log "Building Debian image"
docker build --platform linux/386 -t "$IMAGE" "$DIR"
docker rm -f woot-debian-export >/dev/null 2>&1 || true
docker create --platform linux/386 --name woot-debian-export "$IMAGE" >/dev/null
docker export woot-debian-export > "$WORK/rootfs-raw.tar"
docker rm woot-debian-export >/dev/null

log "Converting to v86 9p filesystem (slow: ~10 min)"
rm -rf "$WORK/fs" && mkdir -p "$WORK/fs/flat"
docker run --rm -u "$(id -u):$(id -g)" \
  -v "$WORK/upstream/tools:/tools:ro" -v "$DIR:/src:ro" -v "$WORK:/work" \
  python:3.12-slim sh -ec '
    pip install -q --target /tmp/pp zstandard 2>/dev/null
    export PYTHONPATH=/tmp/pp
    python3 /src/fix-rootfs.py /work/rootfs-raw.tar /work/rootfs.tar /src/overlay
    python3 /tools/fs2json.py --zstd --out /work/fs/debian-base-fs.json /work/rootfs.tar
    python3 /tools/copy-to-sha256.py --zstd /work/rootfs.tar /work/fs/flat 2>/dev/null'

log "Booting headless and snapshotting"
node "$DIR/build-state.mjs" "$DIR/node_modules/v86" "$WORK/upstream/bios" "$WORK/fs" "$MEMORY_MB"

log "Assembling $OUT"
hashed() {  # hashed <src> <stem> <ext> -> copies to OUT, prints the published name
  local h; h="$(sha256sum "$1" | cut -c1-12)"
  cp "$1" "$OUT/$2-$h.$3"; echo "$2-$h.$3"
}
STAGE="$OUT.new"; rm -rf "$STAGE"; mkdir -p "$STAGE"
mv "$WORK/fs/flat" "$STAGE/flat"
OUT_FINAL="$OUT"; OUT="$STAGE"
LIB=$(hashed "$DIR/node_modules/v86/build/libv86.js" libv86 js)
WASM=$(hashed "$DIR/node_modules/v86/build/v86.wasm" v86 wasm)
BIOS=$(hashed "$WORK/upstream/bios/seabios.bin" seabios bin)
VGABIOS=$(hashed "$WORK/upstream/bios/vgabios.bin" vgabios bin)
FSJSON=$(hashed "$WORK/fs/debian-base-fs.json" debian-base-fs json)
STATE=$(hashed "$WORK/fs/debian-state.bin.zst" debian-state bin.zst)
V86_VERSION=$(node -p "require('$DIR/node_modules/v86/package.json').version")
cat > "$OUT/manifest.json" <<EOF
{
  "format": 1,
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "v86": "$V86_VERSION",
  "memoryMb": $MEMORY_MB,
  "libv86": "$LIB",
  "wasm": "$WASM",
  "bios": "$BIOS",
  "vgaBios": "$VGABIOS",
  "fsIndex": "$FSJSON",
  "fsBase": "flat/",
  "state": "$STATE",
  "downloadBytes": $(stat -c %s "$OUT/$LIB" "$OUT/$WASM" "$OUT/$BIOS" "$OUT/$VGABIOS" "$OUT/$FSJSON" "$OUT/$STATE" | awk '{s+=$1} END {print s}')
}
EOF
rm -rf "$OUT_FINAL.old"; [ -e "$OUT_FINAL" ] && mv "$OUT_FINAL" "$OUT_FINAL.old"
mv "$STAGE" "$OUT_FINAL"; rm -rf "$OUT_FINAL.old"

log "Done: $OUT_FINAL ($(du -sh "$OUT_FINAL" | cut -f1); first visit downloads $(( $(node -p "require('$OUT_FINAL/manifest.json').downloadBytes") / 1000000 )) MB)"
