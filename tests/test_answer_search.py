"""Exercise search decisions without a provider key or network connection."""
import asyncio
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest

from src.api.routes import _answer
from src.api.schemas import AskRequest
from src.utils.workspace import api_mode


@pytest.mark.parametrize("answers,results,expected_sources", [
    (["Direct answer"], [], 0),
    (["SEARCH_PUBLIC: public version", "Verified answer"],
     [{"title": "Release", "url": "https://example.org/release", "snippet": "Version two"}], 1),
    (["SEARCH_PUBLIC: public version", "Could not verify"], TimeoutError(), 0),
])
def test_chat_search(answers, results, expected_sources):
    model = Mock()
    model.generate.side_effect = answers
    search = Mock()
    if isinstance(results, Exception):
        search.side_effect = results
    else:
        search.return_value = results
    manager = Mock()
    manager.registry.get.return_value = SimpleNamespace(handler=search)
    token = api_mode.set("chat")
    try:
        with patch("src.api.routes.create_llm", return_value=model):
            response = asyncio.run(_answer(AskRequest(question="A question"), manager))
    finally:
        api_mode.reset(token)
    assert response.answer == answers[-1]
    assert len(response.sources) == expected_sources
    assert search.call_count == len(answers) - 1
    if search.called:
        search.assert_called_once_with(query="public version")
