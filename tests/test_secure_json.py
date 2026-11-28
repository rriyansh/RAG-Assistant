import json
import stat

from src.api.routes import _write_json


def test_write_json_is_atomic_and_owner_only(tmp_path, monkeypatch):
    target = tmp_path / "keys.json"
    target.write_text('{"old": true}', encoding="utf-8")

    _write_json(target, {"provider": {"api_key": "secret"}})

    assert json.loads(target.read_text(encoding="utf-8"))["provider"]["api_key"] == "secret"
    assert stat.S_IMODE(target.stat().st_mode) == 0o600
    assert list(tmp_path.glob("*.tmp")) == []
