from unittest.mock import patch
from fastapi.testclient import TestClient
from src.api.main import app

def test_errors_have_typed_envelope_and_correlation_id():
    with TestClient(app) as client:
        response = client.post("/ask", json={})
    assert response.status_code == 422
    assert set(response.json()) == {"code", "message", "request_id"}
    assert response.headers["X-Request-ID"] == response.json()["request_id"]

def test_connector_write_is_idempotent():
    connector = {"id":"x","name":"X","category":"custom","description":"x","auth_type":"api_key","built_in":False,"connected":True,"enabled":True,"status":"connected","account_label":"","tool_count":0,"tools":[],"fields":[]}
    with patch("src.api.routes.connector_manager.connect", return_value=connector) as connect, TestClient(app) as client:
        headers = {"Idempotency-Key":"same-operation"}
        first = client.post("/connectors/connect", json={"id":"x","credentials":{}}, headers=headers)
        second = client.post("/connectors/connect", json={"id":"x","credentials":{}}, headers=headers)
    assert first.status_code == second.status_code == 200
    assert connect.call_count == 1
