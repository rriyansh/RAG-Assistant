import os
from pathlib import Path
from unittest.mock import Mock, patch
from src.ingestion.cleaner import clean_text
from src.api.studio import database, STUDIO_DB
from src.llm.provider import LLMProvider

def test_cleaner_preserves_unicode_and_removes_controls():
    assert clean_text("नमस्ते\x00 दुनिया") == "नमस्ते दुनिया"

def test_studio_database_owner_only(tmp_path):
    with patch("src.api.studio.STUDIO_DB", tmp_path / "studio.sqlite3"):
        connection = database()
        connection.close()
        assert ((tmp_path / "studio.sqlite3").stat().st_mode & 0o777) == 0o600

def test_provider_retries_retryable_status(monkeypatch):
    provider = object.__new__(LLMProvider)
    completion = Mock()
    error = RuntimeError("busy")
    error.status_code = 503
    completion.create.side_effect = [error, Mock()]
    provider.client = Mock(chat=Mock(completions=completion))
    monkeypatch.setattr("src.llm.provider.time.sleep", lambda _: None)
    assert provider._completion(model="x") is not None
    assert completion.create.call_count == 2

def test_dockerfile_uses_non_root_and_pinned_digest():
    content = Path("Dockerfile").read_text()
    assert "@sha256:" in content
    assert "USER 10001:10001" in content
