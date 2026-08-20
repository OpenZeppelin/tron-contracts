#!/usr/bin/env bash

set -euo pipefail

dist_tag() {
  PACKAGE_JSON_NAME="$(jq -r .name ./package.json)"
  # A package that was never published returns E404 here; fall back so the first release can go out.
  LATEST_NPM_VERSION="$(npm info "$PACKAGE_JSON_NAME" version 2>/dev/null || echo 0.0.0)"
  PACKAGE_JSON_VERSION="$(jq -r .version ./package.json)"
  
  if [ "$PRERELEASE" = "true" ]; then
    echo "next"
  elif npx semver -r ">$LATEST_NPM_VERSION" "$PACKAGE_JSON_VERSION" > /dev/null; then
    echo "dev"
  else
    # This is a patch for an older version
    # npm can't publish without a tag
    echo "tmp"
  fi
}

cd contracts
TARBALL="$(npm pack | tee /dev/stderr | tail -1)"
echo "tarball_name=$TARBALL" >> $GITHUB_OUTPUT
echo "tarball=$(pwd)/$TARBALL" >> $GITHUB_OUTPUT
echo "tag=$(dist_tag)" >> $GITHUB_OUTPUT
cd ..
