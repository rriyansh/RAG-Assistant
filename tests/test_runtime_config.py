from types import SimpleNamespace

from src.llm import factory
from src.retrieval import web_search


def test_saved_provider_key_overrides_unconfigured_env_provider(tmp_path, monkeypatch):
    settings = SimpleNamespace(
        llm_provider="groq",
        groq_api_key="",
        groq_model="",
        groq_base_url="",
        openrouter_api_key="",
        openrouter_model="",
        openrouter_base_url="",
    )
    monkeypatch.setattr(factory, "CONFIG_PATH", tmp_path / "config.json")
    monkeypatch.setattr(factory, "get_settings", lambda: settings)
    monkeypatch.setattr(
        factory,
        "get_key",
        lambda provider: {"api_key": "test-key"} if provider == "openrouter" else {},
    )
    monkeypatch.setattr(factory, "list_keys", lambda: {"openrouter": {"configured": True}})

    class CapturedProvider:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    monkeypatch.setattr(factory, "LLMProvider", CapturedProvider)

    provider = factory.create_llm()

    assert provider.kwargs["api_key"] == "test-key"
    assert provider.kwargs["base_url"] == "https://openrouter.ai/api/v1"
    assert provider.kwargs["model"] == "openrouter/free"


def test_free_web_search_falls_back_when_metasearch_has_no_results(monkeypatch):
    monkeypatch.setattr(
        web_search,
        "get_settings",
        lambda: SimpleNamespace(web_search_enabled=True, web_search_max_results=4),
    )
    monkeypatch.setattr(web_search, "_search_metasearch", lambda query, limit: [])
    fallback = [web_search.WebResult("Python", "https://example.test", "Free result")]
    monkeypatch.setattr(web_search, "_search_wikipedia", lambda query, limit: fallback)

    assert web_search.web_search("Python", max_results=1) == fallback
