"""Review and commit one UTF-8 file to an explicitly selected GitHub branch."""
import base64
import difflib
from urllib.parse import quote

import requests
from pydantic import BaseModel, Field


class FileChange(BaseModel):
    repo: str = Field(pattern=r"^[\w.-]+/[\w.-]+$")
    branch: str = Field(min_length=1, max_length=255)
    path: str = Field(min_length=1, max_length=500)
    content: str = Field(max_length=60000)
    message: str = Field(min_length=1, max_length=250)


class ReviewedChange(FileChange):
    expected_sha: str = Field(pattern=r"^(?:[a-f0-9]{40})?$")


def file_url(change: FileChange):
    if any(part in ("", ".", "..") for part in change.path.split("/")):
        raise ValueError("Choose a file path relative to the repository root.")
    return f"https://api.github.com/repos/{change.repo}/contents/{quote(change.path)}"


def review(token: str, change: FileChange):
    response = requests.get(file_url(change), headers={"Authorization": f"Bearer {token}"},
                            params={"ref": change.branch}, timeout=15)
    old, sha = "", ""
    if response.status_code != 404:
        response.raise_for_status()
        data = response.json()
        if data.get("type") != "file" or data.get("size", 0) > 60000:
            raise ValueError("Choose a text file smaller than 60 KB.")
        old = base64.b64decode(data["content"]).decode()
        sha = data["sha"]
    if old == change.content and sha:
        raise ValueError("The proposed content already matches the file.")
    diff = "\n".join(difflib.unified_diff(old.splitlines(), change.content.splitlines(),
                                         fromfile="before/" + change.path, tofile="after/" + change.path, lineterm=""))
    return {**change.model_dump(), "expected_sha": sha, "diff": diff}


def commit(token: str, change: ReviewedChange):
    body = {"branch": change.branch, "message": change.message,
            "content": base64.b64encode(change.content.encode()).decode()}
    if change.expected_sha:
        body["sha"] = change.expected_sha
    response = requests.put(file_url(change), headers={"Authorization": f"Bearer {token}"},
                            json=body, timeout=20)
    response.raise_for_status()
    result = response.json()["commit"]
    return {"sha": result["sha"], "url": result["html_url"]}
