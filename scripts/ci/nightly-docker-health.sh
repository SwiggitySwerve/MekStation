#!/usr/bin/env bash
# Nightly production-image check (release gate row 8, 1.0.84): build the production Dockerfile, run the image the
# way `npm run docker:run` does (port published on 127.0.0.1 only, the image's own container opt-in env, no
# override), and require /api/health to answer 200 with a healthy body. The container is always removed.
#   usage: nightly-docker-health.sh <out-dir>
# Writes <out-dir>/report.json (sha, build and health seconds, image sizes and layers, image store, HTTP code,
# verdict) plus build.log, health.json and container.log, even on failure. Exit 0 healthy, 1 otherwise.
# Image sizes: imageBytes is `docker image inspect .Size`, which on the containerd image store (the hosted runner's)
# is the compressed content size; imageBytesUncompressed is the sum of the layer sizes from `docker history`
# (VirtualSize where history gives nothing), comparable to an unpacked local figure. imageStore records which store.
# Logic from C7's proofs (build-2x/tools/docker-1092-proof.sh). No buildx GHA cache: the repo cache is at its cap.
set -uo pipefail

OUT=${1:?usage: nightly-docker-health.sh <out-dir>}
IMAGE=mekstation-nightly-health:local
NAME=mekstation-nightly-health
HOST_PORT=3600
HEALTH_URL="http://127.0.0.1:${HOST_PORT}/api/health"
# Up to HEALTH_ATTEMPTS requests, HEALTH_INTERVAL s apart, each bounded by HEALTH_REQUEST_TIMEOUT s.
HEALTH_ATTEMPTS=${HEALTH_ATTEMPTS:-60}
HEALTH_INTERVAL=${HEALTH_INTERVAL:-2}
HEALTH_REQUEST_TIMEOUT=${HEALTH_REQUEST_TIMEOUT:-5}

mkdir -p "$OUT"
sha=$(git rev-parse HEAD 2>/dev/null || echo unknown)
build_exit=null build_seconds=null image_bytes=null image_bytes_uncompressed=null layers=null
image_store=unknown
health_seconds=null http_code=none body_ok=false verdict=not-run

report() {
  printf '{"sha":"%s","verdict":"%s","buildExit":%s,"buildSeconds":%s,"imageBytes":%s,"imageBytesUncompressed":%s,"layers":%s,"imageStore":"%s","healthSeconds":%s,"httpCode":"%s","bodyOk":%s}\n' \
    "$sha" "$verdict" "$build_exit" "$build_seconds" "$image_bytes" "$image_bytes_uncompressed" \
    "$layers" "$image_store" "$health_seconds" "$http_code" "$body_ok" > "$OUT/report.json"
  local line="docker image: $verdict (build ${build_seconds} s, exit ${build_exit}; image ${image_bytes} bytes content (compressed), ${image_bytes_uncompressed} bytes uncompressed, ${layers} layers, store ${image_store}; /api/health HTTP ${http_code} after ${health_seconds} s)"
  echo "$line"
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then echo "$line" >> "$GITHUB_STEP_SUMMARY"; fi
}

cleanup() {
  if docker container inspect "$NAME" > /dev/null 2>&1; then
    docker logs "$NAME" > "$OUT/container.log" 2>&1 || true
  fi
  docker rm -f "$NAME" > /dev/null 2>&1 || true
}
trap cleanup EXIT

start=$(date -u +%s)
docker build --progress=plain -f Dockerfile -t "$IMAGE" . > "$OUT/build.log" 2>&1
build_exit=$?
build_seconds=$(( $(date -u +%s) - start ))
if [ "$build_exit" -ne 0 ]; then
  verdict=build-failed
  tail -n 40 "$OUT/build.log"
  report
  exit 1
fi
image_bytes=$(docker image inspect "$IMAGE" --format '{{.Size}}')
layers=$(docker image inspect "$IMAGE" --format '{{len .RootFS.Layers}}')
# Sizes in bytes (--human=false), one per history entry; empty lines and non-numbers are skipped.
image_bytes_uncompressed=$(docker history --human=false --no-trunc --format '{{.Size}}' "$IMAGE" 2> /dev/null |
  awk '/^[0-9]+$/ { sum += $1; seen = 1 } END { if (seen) printf "%.0f", sum }')
if [ -z "$image_bytes_uncompressed" ]; then
  image_bytes_uncompressed=$(docker image inspect "$IMAGE" --format '{{.VirtualSize}}' 2> /dev/null)
fi
case "$image_bytes_uncompressed" in '' | *[!0-9]*) image_bytes_uncompressed=null ;; esac
# For example "overlayfs [[driver-type,io.containerd.snapshotter.v1]]" (containerd store) or "overlay2 [...]".
image_store=$(docker info --format '{{.Driver}} {{json .DriverStatus}}' 2> /dev/null | tr -d '"\\' | head -c 200)
[ -n "$image_store" ] || image_store=unknown

docker rm -f "$NAME" > /dev/null 2>&1 || true
if ! docker run -d --name "$NAME" -p "127.0.0.1:${HOST_PORT}:3600" "$IMAGE" > /dev/null; then
  verdict=run-failed
  report
  exit 1
fi

start=$(date -u +%s)
for _ in $(seq 1 "$HEALTH_ATTEMPTS"); do
  http_code=$(curl -s --max-time "$HEALTH_REQUEST_TIMEOUT" -o "$OUT/health.json" -w '%{http_code}' "$HEALTH_URL") || http_code=000
  [ "$http_code" = 200 ] && break
  sleep "$HEALTH_INTERVAL"
done
health_seconds=$(( $(date -u +%s) - start ))

if [ "$http_code" = 200 ] && node -e '
  const body = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const ok = body.status === "healthy" && body.checks?.server === "ok" &&
    body.environment === "production" && typeof body.version === "string";
  process.exit(ok ? 0 : 1);
' "$OUT/health.json" 2> /dev/null; then
  body_ok=true
  verdict=healthy
else
  verdict=unhealthy
  echo "/api/health body: $(head -c 300 "$OUT/health.json" 2> /dev/null)"
fi
report
[ "$verdict" = healthy ]
