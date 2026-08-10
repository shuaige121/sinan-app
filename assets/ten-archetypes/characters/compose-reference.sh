#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 OUTPUT.png CHARACTER_A.png CHARACTER_B.png [CHARACTER_C.png ...]" >&2
  exit 2
fi

output=$1
shift

if [[ -e "$output" ]]; then
  echo "Refusing to overwrite existing file: $output" >&2
  exit 2
fi

for input in "$@"; do
  if [[ ! -f "$input" ]]; then
    echo "Missing input: $input" >&2
    exit 2
  fi
done

magick "$@" \
  -resize '600x900>' \
  -background '#f7e8cc' \
  -gravity center \
  -extent 648x948 \
  +append \
  "$output"

echo "$output"
