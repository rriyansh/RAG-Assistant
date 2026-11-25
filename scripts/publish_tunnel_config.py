#!/usr/bin/env python3
"""Publish the current Cloudflare Quick Tunnel URL to an existing public Gist."""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from urllib.request import Request, urlopen


gist_id = os.environ.get("GH_GIST_ID", "").strip()
token = os.environ.get("GH_GIST_TOKEN", "").strip()
backend_url = sys.argv[1].strip() if len(sys.argv) > 1 else ""

if not gist_id or not token:
    print("Auto-sync not published: set GH_GIST_ID and GH_GIST_TOKEN in local .env.")
    raise SystemExit(0)

if not backend_url.startswith("https://") or not backend_url.endswith(".trycloudflare.com"):
    raise SystemExit("Refusing to publish a non-Cloudflare Quick Tunnel URL.")

content = json.dumps(
    {"backend_url": backend_url, "updated_at": datetime.now(timezone.utc).isoformat()},
    separators=(",", ":"),
)
request = Request(
    f"https://api.github.com/gists/{gist_id}",
    data=json.dumps({"files": {"reso-backend.json": {"content": content}}}).encode(),
    headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "Resso-Agent-local-dev",
        "X-GitHub-Api-Version": "2022-11-28",
    },
    method="PATCH",
)

try:
    with urlopen(request, timeout=15) as response:
        result = json.load(response)
except Exception as error:
    raise SystemExit(f"Could not update the backend discovery Gist: {error}") from error

raw_url = result.get("files", {}).get("reso-backend.json", {}).get("raw_url", "")
stable_raw_url = re.sub(r"/raw/[0-9a-f]{20,64}/", "/raw/", raw_url)
print(f"Updated backend discovery Gist: {stable_raw_url}")
