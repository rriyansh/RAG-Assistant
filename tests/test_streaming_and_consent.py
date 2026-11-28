import asyncio
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from src.api.main import app
from src.agent.loop import run_agent

def test_stream_emits_multiple_events():
    provider = Mock()
    provider.stream_generate.return_value = iter(["one", " two"])
    with patch("src.api.routes.create_llm", return_value=provider), patch("src.api.routes.hybrid_retrieve", return_value=[]):
        with TestClient(app) as client, client.stream("POST", "/ask/stream", json={"question":"hello"}) as response:
            lines = list(response.iter_lines())
    assert response.status_code == 200
    assert len(lines) >= 3

def test_consent_uses_tool_names():
    spec = Mock(enabled=True, requires_consent=True)
    registry = Mock()
    registry.list_for_llm.return_value = [{"type":"function","function":{"name":"send_email","parameters":{}}}]
    registry.get.return_value = spec
    llm = Mock()
    tool_call = Mock(id="1", name="send_email", arguments={"to":"a@example.com"})
    llm.chat.return_value = Mock(tool_calls=[tool_call])
    with patch("src.agent.loop.create_llm", return_value=llm):
        result = asyncio.run(run_agent("send", "Reso", registry, consent=[]))
    assert result["pending_consent"] == ["send_email"]
