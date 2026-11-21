import unittest
from unittest.mock import Mock, patch

from src.llm.provider import LLMProvider, ProviderResponseError, custom_endpoint


class CustomEndpointTests(unittest.TestCase):
    def test_base_and_completion_urls_resolve_to_the_same_endpoint(self):
        base = "https://models.example/v1"
        for suffix in ("", "/", "/chat/completions", "/chat/completions/"):
            self.assertEqual(custom_endpoint(base + suffix), base)
        self.assertEqual(custom_endpoint("http://localhost:8001/v1"), "http://localhost:8001/v1")

    def test_invalid_endpoints_rejected_before_sending_a_key(self):
        for endpoint in ("", "http://remote.example", "https://user:pass@models.example",
                         "https://models.example/v1?key=test"):
            with self.subTest(endpoint=endpoint), self.assertRaises(ValueError):
                custom_endpoint(endpoint)

    @patch("src.llm.provider.OpenAI")
    def test_user_model_and_response(self, client):
        provider = LLMProvider("dummy", "https://models.example/v1", "user-model")
        create = client.return_value.chat.completions.create
        create.return_value = Mock(choices=[Mock(message=Mock(content=" Answer "))])
        self.assertEqual(provider.generate("Hello"), "Answer")
        self.assertEqual(create.call_args.kwargs["model"], "user-model")
        create.return_value = Mock(choices=[])
        with self.assertRaises(ProviderResponseError):
            provider.generate("Hello")
