#!/bin/bash

# Fail on error
set -e

# Temporary file to hold file SHAs and paths
tmp_file=$(mktemp)

# Step 1: Get Git-tracked files and filter out Version.md
git ls-files -s | grep -v ' Version.md$' | awk '{print $2, $4}' | sort > "$tmp_file"

# Step 2: Hash the content using SHA256
version_hash=$(sha256sum "$tmp_file" | awk '{print $1}')

# Step 3: Truncate to 7 characters
version_short=${version_hash:0:7}

# Step 4: Write the version to Version.md
echo "Version: $version_short" > Version.md
echo "Wrote version $version_short to Version.md"

# Cleanup
rm "$tmp_file"
