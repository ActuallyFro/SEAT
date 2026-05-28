#!/usr/bin/env bash
# =============================================================================
# build.sh — Bundle SEAT into a single self-contained HTML file
#
# All <script src="..."> and <link rel="stylesheet" href="..."> references
# are replaced with inline <script> and <style> blocks.
# The result is a fully portable, zero-dependency HTML file.
#
# Usage:
#   ./build.sh                    → outputs  SEAT_bundle.html  (same directory)
#   ./build.sh path/to/out.html   → write to a custom path
#
# Requirements: python3 (stdlib only — no pip packages needed)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-"${SCRIPT_DIR}/SEAT_bundle.html"}"

cd "$SCRIPT_DIR"

echo "Building SEAT bundle..."
echo "  Source : index.html"
echo "  Output : ${OUT}"
echo ""

python3 - "$OUT" <<'PYEOF'
import re, sys
from pathlib import Path

out_path = Path(sys.argv[1])
src      = Path('index.html').read_text(encoding='utf-8')


def read_file(rel_path):
    """Read a file relative to CWD; print a warning and return None if missing."""
    p = Path(rel_path)
    if p.exists():
        return p.read_text(encoding='utf-8')
    print(f"  WARNING: '{rel_path}' not found — left as external reference.", file=sys.stderr)
    return None


# ── Inline <link rel="stylesheet" href="..."> ─────────────────────────────────
def inline_css(match):
    # Capture the href regardless of attribute order
    tag  = match.group(0)
    href = re.search(r'href=["\']([^"\']+)["\']', tag)
    if not href:
        return tag
    content = read_file(href.group(1))
    if content is None:
        return tag
    # Escape any literal </style> inside CSS (rare but possible in content values)
    content = content.replace('</style>', r'<\/style>')
    print(f"  CSS  ← {href.group(1)}")
    return f'<style>\n/* ===== {href.group(1)} ===== */\n{content}\n</style>'

src = re.sub(
    r'<link\b[^>]*\brel=["\']stylesheet["\'][^>]*/?>',
    inline_css, src, flags=re.IGNORECASE
)


# ── Inline <script src="..."></script> ────────────────────────────────────────
def inline_js(match):
    tag      = match.group(0)
    src_attr = re.search(r'\bsrc=["\']([^"\']+)["\']', tag)
    if not src_attr:
        return tag
    content = read_file(src_attr.group(1))
    if content is None:
        return tag
    # Critical: escape </script> inside JS strings so the HTML parser
    # doesn't end the <script> block prematurely.
    content = content.replace('</script>', r'<\/script>')
    print(f"  JS   ← {src_attr.group(1)}")
    return f'<script>\n/* ===== {src_attr.group(1)} ===== */\n{content}\n</script>'

# Match <script ...src="..."> tags (with optional type attribute, closed by </script>)
src = re.sub(
    r'<script\b[^>]*\bsrc=["\'][^"\']+["\'][^>]*>\s*</script>',
    inline_js, src, flags=re.IGNORECASE | re.DOTALL
)


# ── Write output ──────────────────────────────────────────────────────────────
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(src, encoding='utf-8')

size_kb = out_path.stat().st_size / 1024
print(f"\n  ✓  Wrote {out_path}  ({size_kb:,.1f} KB)")
PYEOF

echo ""
echo "Done."
