#!/usr/bin/env bash
# release_tag.sh — plan or create the git tag v<version> for the version
# package.json names, when that version has no tag yet.
#
# A release commit on main is normally a GitHub squash-merge, created
# server-side when a PR merges, so no local hook ever runs for it. The
# release-tag workflow runs this script on every push to main instead. It
# reads the CURRENT package.json version rather than a commit subject, so the
# commit that bumps the version does not have to say so.
#
# It only ever ADDS a tag, never moves one: a moved tag would let one version
# number mean two different trees, and a consumer pinned to it would install
# something other than what it pinned. A package.json version at or behind
# the newest existing v* tag is refused rather than guessed at: that means a
# reverted bump, not a new release.
#
# Usage: tool/release_tag.sh [--create]
#   (default)  print the plan, change nothing
#   --create   create the annotated tag at HEAD — does NOT push
# Writes `tags=<the planned tag, or empty>` to $GITHUB_OUTPUT when that's set.

set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1

create=false
[ "${1:-}" = "--create" ] && create=true

# $1 <= $2, comparing dotted x.y.z numerically field by field.
ver_le() {
  [ "$1" = "$(printf '%s\n%s\n' "$1" "$2" | sort -t. -k1,1n -k2,2n -k3,3n | head -1)" ]
}

version=$(node -p 'require("./package.json").version') || exit 1

# Only plain x.y.z. A pre-release would have to answer "does 1.0.0-rc.2
# outrank 1.0.0?" and this package has never had one — refusing is honest,
# guessing an order silently is not.
if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "✘ package.json version \"$version\" is not x.y.z — refusing to guess how it orders" >&2
  exit 1
fi

tag="v${version}"
planned_tag=""

if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  echo "✔ $version — already tagged"
else
  newest=$(git tag -l 'v*' | sed 's/^v//' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' |
    sort -t. -k1,1n -k2,2n -k3,3n | tail -1)

  if [ -n "$newest" ] && ver_le "$version" "$newest"; then
    echo "✘ package.json is at $version, but v${newest} is already tagged
  → bump package.json above the newest tag" >&2
    exit 1
  fi

  planned_tag="$tag"
  echo "→ $version — ${newest:+newer than $newest, }will tag $tag"

  if [ "$create" = true ]; then
    git tag -a "$tag" -m "$version

Created automatically by the release-tag workflow from package.json." || exit 1
    echo "  tagged $tag at $(git rev-parse --short HEAD)"
  fi
fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "tags=$planned_tag" >>"$GITHUB_OUTPUT"
fi

echo
if [ -n "$planned_tag" ]; then
  word=created
  [ "$create" = true ] || word="to create"
  echo "$planned_tag $word"
else
  echo "nothing to tag"
fi
