#!/bin/bash

# Fail on error
set -e

# Function to show help
show_help() {
    cat << EOF
Usage: $0 [OPTION]

Generate or check version hash based on Git-tracked files.

Options:
  --check, --check-version    Check current version without updating files
  --help                      Show this help message

With no options, generates new version files (Version.md and scripts/SEAT-Version.js).

The version is calculated from a SHA256 hash of all Git-tracked files,
excluding Version.md and scripts/SEAT-Version.js to avoid circular dependencies.
EOF
}

# Function to calculate version hash
calculate_version() {
    # Temporary file to hold file SHAs and paths
    local tmp_file=$(mktemp)
    
    # Step 1: Get Git-tracked files and filter out version files
    git ls-files -s | grep -v -E '\s(Version\.md|scripts/SEAT-Version\.js)$' | awk '{print $2, $4}' | sort > "$tmp_file"
    
    # Step 2: Hash the content using SHA256
    local version_hash=$(sha256sum "$tmp_file" | awk '{print $1}')
    
    # Step 3: Truncate to 7 characters
    local version_short=${version_hash:0:7}
    
    # Cleanup
    rm "$tmp_file"
    
    echo "$version_short"
}

# Parse command line arguments
case "${1:-}" in
    --help)
        show_help
        exit 0
        ;;
    --check|--check-version)
        # Calculate current version without updating files
        current_version=$(calculate_version)
        echo "Current calculated version: $current_version"
        
        # Check if Version.md exists and compare
        if [[ -f "Version.md" ]]; then
            file_version=$(grep "^Version:" Version.md | cut -d' ' -f2)
            echo "Version in Version.md: $file_version"
            if [[ "$current_version" == "$file_version" ]]; then
                echo "✓ Versions match"
                exit 0
            else
                echo "✗ Versions do not match"
                exit 1
            fi
        else
            echo "Version.md not found"
            exit 1
        fi
        ;;
    "")
        # Default behavior: generate version files
        version_short=$(calculate_version)
        
        # Step 4: Write the version to Version.md and create JavaScript version file
        echo "Version: $version_short" > Version.md
        
        # Step 5: Create JavaScript version file
        cat > "scripts/SEAT-Version.js" << EOF
const versionDataString = \`{
  "version": "Version: $version_short"
}\`;
EOF
        
        echo "Wrote version $version_short to Version.md and scripts/SEAT-Version.js"
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information."
        exit 1
        ;;
esac
