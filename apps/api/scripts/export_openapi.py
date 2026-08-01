"""Regenerate openapi.json (checked in; drives the web app's generated client).

Usage: uv run python scripts/export_openapi.py
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.main import app  # noqa: E402

out_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "openapi.json"
)
with open(out_path, "w") as f:
    json.dump(app.openapi(), f, indent=2, sort_keys=True)
    f.write("\n")

print(f"Wrote {out_path}")
