# src/agent/connectors/manager.py
from __future__ import annotations

import imaplib
import json
import logging
import os
import smtplib
import urllib.parse
from dataclasses import dataclass, field
from email.header import decode_header
from email.message import EmailMessage
from email import message_from_bytes
from pathlib import Path
from typing import Any

import requests

from src.agent.connectors import github_changes
from src.agent.connectors.catalog import SERVICES
from src.agent.registry import ToolRegistry, ToolSpec, registry as global_registry

logger = logging.getLogger(__name__)

CONNECTORS_STATE_PATH = Path("data/connectors.json")


class ConnectorError(ValueError):
    """Raised when connector configuration, authentication, or execution fails."""


@dataclass
class ConnectorFieldSpec:
    key: str
    label: str
    type: str  # "text" | "password" | "url"
    placeholder: str
    required: bool = True
    helper_text: str = ""


@dataclass
class ConnectorCatalogItem:
    id: str
    name: str
    category: str  # "built_in" | "google" | "productivity" | "developer" | "custom"
    description: str
    auth_type: str  # "none" | "oauth_token" | "app_password" | "api_key" | "webhook"
    fields: list[ConnectorFieldSpec] = field(default_factory=list)
    tool_names: list[str] = field(default_factory=list)
    built_in: bool = False


CONNECTOR_CATALOG: list[ConnectorCatalogItem] = [
    ConnectorCatalogItem(
        id="pdf_rag",
        name="Local PDF Knowledge Base",
        category="built_in",
        description="Vector search across local PDF documents indexed in ChromaDB.",
        auth_type="none",
        fields=[],
        tool_names=["search_pdfs"],
        built_in=True,
    ),
    ConnectorCatalogItem(
        id="web_research",
        name="Web Search & URL Reader",
        category="built_in",
        description="Live web search (DuckDuckGo / Tavily) and full-page text extraction.",
        auth_type="none",
        fields=[],
        tool_names=["web_search", "fetch_url"],
        built_in=True,
    ),
    ConnectorCatalogItem(
        id="gmail",
        name="Gmail",
        category="google",
        description="Search inbox messages, read threads, and send emails via Gmail API or App Password.",
        auth_type="app_password",
        fields=[
            ConnectorFieldSpec(
                key="email",
                label="Gmail Address",
                type="text",
                placeholder="you@gmail.com",
                required=True,
            ),
            ConnectorFieldSpec(
                key="app_password",
                label="Google App Password or OAuth Access Token",
                type="password",
                placeholder="16-char App Password or ya29.a0...",
                required=True,
                helper_text="Use a 16-character Google App Password (IMAP/SMTP) or a Gmail OAuth2 Bearer token.",
            ),
        ],
        tool_names=["gmail_search_emails", "gmail_send_email"],
    ),
    ConnectorCatalogItem(
        id="google_drive",
        name="Google Drive",
        category="google",
        description="Search Drive files, list recent documents, and read Google Docs / plain-text file contents.",
        auth_type="oauth_token",
        fields=[
            ConnectorFieldSpec(
                key="access_token",
                label="Google Drive OAuth2 Access Token",
                type="password",
                placeholder="ya29.a0AfB_by...",
                required=True,
                helper_text="OAuth 2.0 token with https://www.googleapis.com/auth/drive.readonly scope.",
            ),
        ],
        tool_names=["gdrive_search_files", "gdrive_read_file"],
    ),
    ConnectorCatalogItem(
        id="github",
        name="GitHub",
        category="developer",
        description="Read repository files, review proposed code changes, commit approved edits, and create issues.",
        auth_type="api_key",
        fields=[
            ConnectorFieldSpec(
                key="token",
                label="Personal Access Token",
                type="password",
                placeholder="ghp_... or github_pat_...",
                required=True,
            ),
            ConnectorFieldSpec(
                key="default_owner",
                label="Default Owner / Org (optional)",
                type="text",
                placeholder="rriyansh",
                required=False,
            ),
        ],
        tool_names=["github_search_repos", "github_get_file", "github_create_issue", "github_review_change"],
    ),
    ConnectorCatalogItem(
        id="notion",
        name="Notion",
        category="productivity",
        description="Search workspace pages and databases and read block content using a Notion Internal Integration.",
        auth_type="api_key",
        fields=[
            ConnectorFieldSpec(
                key="api_key",
                label="Notion Internal Integration Secret",
                type="password",
                placeholder="secret_... or ntn_...",
                required=True,
            ),
        ],
        tool_names=["notion_search_pages", "notion_read_page"],
    ),
    ConnectorCatalogItem(
        id="slack",
        name="Slack",
        category="productivity",
        description="Post messages and alerts to Slack channels via Bot Token or Incoming Webhook.",
        auth_type="api_key",
        fields=[
            ConnectorFieldSpec(
                key="bot_token",
                label="Slack Bot User OAuth Token (or Webhook URL)",
                type="password",
                placeholder="xoxb-... or https://hooks.slack.com/services/...",
                required=True,
            ),
            ConnectorFieldSpec(
                key="default_channel",
                label="Default Channel (optional)",
                type="text",
                placeholder="#general",
                required=False,
            ),
        ],
        tool_names=["slack_post_message"],
    ),
]


for service_id, service in SERVICES.items():
    CONNECTOR_CATALOG.append(ConnectorCatalogItem(
        id=service_id, name=service.name, category=service.category,
        description=f"Read {service.resource} from {service.name}.",
        auth_type="api_key", fields=[ConnectorFieldSpec("token", "Access token", "password", "Paste your access token")],
        tool_names=[f"{service_id}_read"],
    ))


def _write_secure_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(path)
    os.chmod(path, 0o600)


def _read_secure_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        os.chmod(path, 0o600)
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception as exc:
        logger.warning("Failed to read %s: %s", path, exc)
        return {}


def _decode_mime_words(raw: str) -> str:
    if not raw:
        return ""
    parts = decode_header(raw)
    decoded: list[str] = []
    for content, enc in parts:
        if isinstance(content, bytes):
            decoded.append(content.decode(enc or "utf-8", errors="replace"))
        else:
            decoded.append(str(content))
    return "".join(decoded)


class ConnectorManager:
    def __init__(
        self,
        tool_registry: ToolRegistry = global_registry,
        state_path: Path = CONNECTORS_STATE_PATH,
    ) -> None:
        self._registry = tool_registry
        self._state_path = state_path
        self._state: dict[str, Any] = {
            "connected": {},  # connector_id -> {credentials: {...}, enabled: bool, account_label: str}
            "custom": {},     # custom_id -> {name, description, endpoint_url, method, api_key, enabled}
        }

    @property
    def registry(self) -> ToolRegistry:
        return self._registry

    def _load_state(self) -> None:
        loaded = _read_secure_json(self._state_path)
        connected = loaded.get("connected", {})
        custom = loaded.get("custom", {})
        self._state = {
            "connected": connected if isinstance(connected, dict) else {},
            "custom": custom if isinstance(custom, dict) else {},
        }

    def _save_state(self) -> None:
        _write_secure_json(self._state_path, self._state)

    async def startup(self) -> None:
        self._load_state()
        for cid, entry in list(self._state["connected"].items()):
            if not isinstance(entry, dict):
                continue
            creds = entry.get("credentials", {})
            enabled = bool(entry.get("enabled", True))
            try:
                self._register_connector_tools(cid, creds, enabled=enabled)
            except Exception as exc:
                logger.warning("Failed to restore connector '%s' tools: %s", cid, exc)

        for custom_id, cfg in list(self._state["custom"].items()):
            if not isinstance(cfg, dict):
                continue
            try:
                self._register_custom_connector_tool(custom_id, cfg)
            except Exception as exc:
                logger.warning("Failed to restore custom connector '%s': %s", custom_id, exc)

    async def shutdown(self) -> None:
        return None

    def list_connectors(self) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        public_tools = {t["name"]: t for t in self._registry.list_public()}

        for item in CONNECTOR_CATALOG:
            if item.built_in:
                tool_objs = [public_tools[n] for n in item.tool_names if n in public_tools]
                any_enabled = any(t.get("enabled", True) for t in tool_objs) if tool_objs else True
                results.append(
                    {
                        "id": item.id,
                        "name": item.name,
                        "category": item.category,
                        "description": item.description,
                        "auth_type": item.auth_type,
                        "built_in": True,
                        "connected": True,
                        "enabled": any_enabled,
                        "status": "connected" if any_enabled else "disabled",
                        "account_label": "Built-in Local Engine",
                        "tool_count": len(item.tool_names),
                        "tools": item.tool_names,
                        "fields": [],
                    }
                )
            else:
                saved = self._state["connected"].get(item.id)
                is_connected = isinstance(saved, dict) and bool(saved.get("credentials"))
                is_enabled = bool(saved.get("enabled", True)) if isinstance(saved, dict) else False
                account_label = str(saved.get("account_label", "")) if isinstance(saved, dict) else ""
                results.append(
                    {
                        "id": item.id,
                        "name": item.name,
                        "category": item.category,
                        "description": item.description,
                        "auth_type": item.auth_type,
                        "built_in": False,
                        "connected": is_connected,
                        "enabled": is_enabled if is_connected else False,
                        "status": (
                            "connected"
                            if (is_connected and is_enabled)
                            else ("disabled" if is_connected else "disconnected")
                        ),
                        "account_label": account_label,
                        "tool_count": len(item.tool_names),
                        "tools": item.tool_names,
                        "fields": [
                            {
                                "key": f.key,
                                "label": f.label,
                                "type": f.type,
                                "placeholder": f.placeholder,
                                "required": f.required,
                                "helper_text": f.helper_text,
                            }
                            for f in item.fields
                        ],
                    }
                )

        for custom_id, cfg in self._state["custom"].items():
            if not isinstance(cfg, dict):
                continue
            tool_name = f"custom_{custom_id}"
            enabled = bool(cfg.get("enabled", True))
            results.append(
                {
                    "id": custom_id,
                    "name": str(cfg.get("name") or custom_id),
                    "category": "custom",
                    "description": str(cfg.get("description") or "Custom REST Webhook Connector"),
                    "auth_type": "webhook",
                    "built_in": False,
                    "connected": True,
                    "enabled": enabled,
                    "status": "connected" if enabled else "disabled",
                    "account_label": str(cfg.get("endpoint_url", "")),
                    "tool_count": 1,
                    "tools": [tool_name],
                    "fields": [],
                }
            )

        return results

    def connect(
        self, connector_id: str, credentials: dict[str, Any]
    ) -> dict[str, Any]:
        catalog_item = next((c for c in CONNECTOR_CATALOG if c.id == connector_id), None)
        if catalog_item is None:
            raise ConnectorError(f"Unknown connector '{connector_id}'.")
        if catalog_item.built_in:
            raise ConnectorError(f"Connector '{connector_id}' is built-in and already active.")

        cleaned_creds: dict[str, str] = {}
        for field_spec in catalog_item.fields:
            val = str(credentials.get(field_spec.key, "")).strip()
            if field_spec.required and not val:
                raise ConnectorError(f"Field '{field_spec.label}' is required.")
            cleaned_creds[field_spec.key] = val

        account_label = self._verify_credentials(connector_id, cleaned_creds)

        self._registry.unregister_by_server(connector_id)
        self._register_connector_tools(connector_id, cleaned_creds, enabled=True)

        self._state["connected"][connector_id] = {
            "credentials": cleaned_creds,
            "enabled": True,
            "account_label": account_label,
        }
        self._save_state()

        return next(c for c in self.list_connectors() if c["id"] == connector_id)

    def add_custom_connector(
        self,
        connector_id: str,
        name: str,
        description: str,
        endpoint_url: str,
        method: str = "POST",
        api_key: str = "",
    ) -> dict[str, Any]:
        cid = connector_id.strip().lower().replace(" ", "_")
        if not cid:
            raise ConnectorError("Connector ID cannot be empty.")
        if any(c.id == cid for c in CONNECTOR_CATALOG) or cid in self._state["custom"]:
            raise ConnectorError(f"Connector ID '{cid}' already exists.")

        parsed = urllib.parse.urlparse(endpoint_url.strip())
        if parsed.scheme not in ("https", "http") or not parsed.netloc:
            raise ConnectorError("Endpoint URL must be a valid https:// or http://localhost URL.")
        if parsed.scheme == "http" and parsed.hostname not in ("localhost", "127.0.0.1"):
            raise ConnectorError("Custom connector HTTP URLs must use https:// unless targeting localhost.")

        cfg = {
            "id": cid,
            "name": name.strip() or cid,
            "description": description.strip() or f"Call custom endpoint {endpoint_url}",
            "endpoint_url": endpoint_url.strip(),
            "method": method.upper() if method.upper() in ("GET", "POST") else "POST",
            "api_key": api_key.strip(),
            "enabled": True,
        }
        self._register_custom_connector_tool(cid, cfg)
        self._state["custom"][cid] = cfg
        self._save_state()
        return next(c for c in self.list_connectors() if c["id"] == cid)

    def set_enabled(self, connector_id: str, enabled: bool) -> dict[str, Any]:
        catalog_item = next((c for c in CONNECTOR_CATALOG if c.id == connector_id), None)
        if catalog_item and catalog_item.built_in:
            for t_name in catalog_item.tool_names:
                self._registry.set_enabled(t_name, enabled)
            return next(c for c in self.list_connectors() if c["id"] == connector_id)

        if connector_id in self._state["connected"]:
            self._state["connected"][connector_id]["enabled"] = bool(enabled)
            self._save_state()
            if catalog_item:
                for t_name in catalog_item.tool_names:
                    self._registry.set_enabled(t_name, enabled)
            return next(c for c in self.list_connectors() if c["id"] == connector_id)

        if connector_id in self._state["custom"]:
            self._state["custom"][connector_id]["enabled"] = bool(enabled)
            self._save_state()
            self._registry.set_enabled(f"custom_{connector_id}", enabled)
            return next(c for c in self.list_connectors() if c["id"] == connector_id)

        raise ConnectorError(f"Connector '{connector_id}' is not connected.")

    def disconnect(self, connector_id: str) -> bool:
        catalog_item = next((c for c in CONNECTOR_CATALOG if c.id == connector_id), None)
        if catalog_item and catalog_item.built_in:
            raise ConnectorError("Built-in connectors cannot be deleted; toggle them off instead.")

        removed = False
        if connector_id in self._state["connected"]:
            self._state["connected"].pop(connector_id, None)
            self._registry.unregister_by_server(connector_id)
            self._save_state()
            removed = True

        if connector_id in self._state["custom"]:
            self._state["custom"].pop(connector_id, None)
            self._registry.unregister_by_server(connector_id)
            self._registry.unregister(f"custom_{connector_id}")
            self._save_state()
            removed = True

        return removed

    def _verify_credentials(self, connector_id: str, creds: dict[str, str]) -> str:
        if connector_id in SERVICES:
            service = SERVICES[connector_id]
            try:
                service.read(creds["token"])
            except (ValueError, requests.RequestException) as exc:
                raise ConnectorError(f"Could not connect to {service.name}: {exc}") from exc
            return service.name
        if connector_id == "gmail":
            email_addr = creds["email"]
            secret = creds["app_password"].replace(" ", "")
            if secret.startswith("ya29."):
                resp = requests.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                    headers={"Authorization": f"Bearer {secret}"},
                    timeout=10,
                )
                if resp.status_code != 200:
                    raise ConnectorError(f"Gmail OAuth token rejected (HTTP {resp.status_code}).")
                return resp.json().get("emailAddress", email_addr)
            try:
                with imaplib.IMAP4_SSL("imap.gmail.com", 993) as imap:
                    imap.login(email_addr, secret)
                return email_addr
            except Exception as exc:
                raise ConnectorError(f"Gmail authentication failed: {exc}") from exc

        if connector_id == "google_drive":
            token = creds["access_token"]
            resp = requests.get(
                "https://www.googleapis.com/drive/v3/about?fields=user",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            if resp.status_code != 200:
                raise ConnectorError(
                    f"Google Drive OAuth token verification failed (HTTP {resp.status_code})."
                )
            user_info = resp.json().get("user", {})
            return user_info.get("emailAddress") or user_info.get("displayName") or "Google Drive Account"

        if connector_id == "github":
            token = creds["token"]
            resp = requests.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                },
                timeout=10,
            )
            if resp.status_code != 200:
                raise ConnectorError(f"GitHub token rejected (HTTP {resp.status_code}).")
            login = resp.json().get("login", "github-user")
            return f"@{login}"

        if connector_id == "notion":
            api_key = creds["api_key"]
            resp = requests.get(
                "https://api.notion.com/v1/users/me",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Notion-Version": "2022-06-28",
                },
                timeout=10,
            )
            if resp.status_code != 200:
                raise ConnectorError(f"Notion token rejected (HTTP {resp.status_code}).")
            return resp.json().get("name") or "Notion Workspace"

        if connector_id == "slack":
            token = creds["bot_token"]
            if token.startswith("https://hooks.slack.com/"):
                return "Incoming Webhook"
            resp = requests.post(
                "https://slack.com/api/auth.test",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            data = resp.json()
            if not data.get("ok"):
                raise ConnectorError(f"Slack auth failed: {data.get('error', 'invalid_auth')}")
            return f"{data.get('team', 'Slack')} ({data.get('user', 'bot')})"

        return connector_id

    # --- Tool Registrations per Connector ---

    def _register_connector_tools(
        self, connector_id: str, creds: dict[str, str], enabled: bool = True
    ) -> None:
        if connector_id in SERVICES:
            service = SERVICES[connector_id]
            self._registry.register(ToolSpec(
                name=f"{connector_id}_read", description=f"Read {service.resource} from {service.name}.",
                input_schema={"type": "object", "properties": {}, "additionalProperties": False},
                handler=lambda: service.read(creds["token"]), requires_consent=False,
                source="connector", server_id=connector_id, enabled=enabled,
            ))
            return
        if connector_id == "gmail":
            self._register_gmail_tools(creds, enabled)
        elif connector_id == "google_drive":
            self._register_gdrive_tools(creds, enabled)
        elif connector_id == "github":
            self._register_github_tools(creds, enabled)
        elif connector_id == "notion":
            self._register_notion_tools(creds, enabled)
        elif connector_id == "slack":
            self._register_slack_tools(creds, enabled)

    def _register_gmail_tools(self, creds: dict[str, str], enabled: bool) -> None:
        email_addr = creds["email"]
        secret = creds["app_password"].replace(" ", "")

        def search_emails(query: str = "ALL", max_results: int = 5) -> list[dict[str, Any]]:
            limit = max(1, min(int(max_results), 15))
            if secret.startswith("ya29."):
                resp = requests.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                    headers={"Authorization": f"Bearer {secret}"},
                    params={"q": query, "maxResults": limit},
                    timeout=15,
                )
                resp.raise_for_status()
                messages = resp.json().get("messages", [])
                results: list[dict[str, Any]] = []
                for m in messages[:limit]:
                    detail = requests.get(
                        f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{m['id']}",
                        headers={"Authorization": f"Bearer {secret}"},
                        params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
                        timeout=10,
                    ).json()
                    headers = {
                        h["name"]: h["value"]
                        for h in detail.get("payload", {}).get("headers", [])
                    }
                    results.append(
                        {
                            "id": m["id"],
                            "from": headers.get("From", ""),
                            "subject": headers.get("Subject", ""),
                            "date": headers.get("Date", ""),
                            "snippet": detail.get("snippet", ""),
                        }
                    )
                return results

            with imaplib.IMAP4_SSL("imap.gmail.com", 993) as imap:
                imap.login(email_addr, secret)
                imap.select("INBOX", readonly=True)
                q = query.strip()
                if not q or q.upper() == "ALL":
                    criteria = "ALL"
                else:
                    safe_q = q.replace('"', "")
                    criteria = f'(OR SUBJECT "{safe_q}" FROM "{safe_q}")'
                _, data = imap.search(None, criteria)
                mail_ids = data[0].split() if data and data[0] else []
                recent_ids = list(reversed(mail_ids[-limit:]))
                out: list[dict[str, Any]] = []
                for mid in recent_ids:
                    _, msg_data = imap.fetch(mid, "(RFC822)")
                    if not msg_data or not isinstance(msg_data[0], tuple):
                        continue
                    msg = message_from_bytes(msg_data[0][1])
                    subj = _decode_mime_words(msg.get("Subject", ""))
                    sender = _decode_mime_words(msg.get("From", ""))
                    date_str = msg.get("Date", "")
                    body_text = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            if part.get_content_type() == "text/plain" and not part.get("Content-Disposition"):
                                payload = part.get_payload(decode=True)
                                if isinstance(payload, bytes):
                                    body_text = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
                                    break
                    else:
                        payload = msg.get_payload(decode=True)
                        if isinstance(payload, bytes):
                            body_text = payload.decode(msg.get_content_charset() or "utf-8", errors="replace")
                    out.append(
                        {
                            "id": mid.decode("utf-8", errors="ignore"),
                            "from": sender,
                            "subject": subj,
                            "date": date_str,
                            "snippet": " ".join(body_text.split())[:400],
                        }
                    )
                return out

        def send_email(to: str, subject: str, body: str) -> dict[str, str]:
            msg = EmailMessage()
            msg["From"] = email_addr
            msg["To"] = to.strip()
            msg["Subject"] = subject.strip()
            msg.set_content(body)

            if secret.startswith("ya29."):
                import base64

                raw_b64 = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
                resp = requests.post(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                    headers={"Authorization": f"Bearer {secret}"},
                    json={"raw": raw_b64},
                    timeout=15,
                )
                resp.raise_for_status()
                return {"status": "sent", "to": to, "subject": subject}

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
                smtp.login(email_addr, secret)
                smtp.send_message(msg)
            return {"status": "sent", "to": to, "subject": subject}

        self._registry.register(
            ToolSpec(
                name="gmail_search_emails",
                description="Search recent emails in the connected Gmail inbox by subject, sender, or keyword.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search keyword, sender email, or subject term (use 'ALL' for latest emails).",
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Maximum number of emails to return (1-15).",
                        },
                    },
                    "required": ["query"],
                },
                handler=search_emails,
                requires_consent=False,
                source="connector",
                server_id="gmail",
                enabled=enabled,
            )
        )

        self._registry.register(
            ToolSpec(
                name="gmail_send_email",
                description="Send an email from the connected Gmail account. Requires user consent.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "to": {"type": "string", "description": "Recipient email address."},
                        "subject": {"type": "string", "description": "Email subject line."},
                        "body": {"type": "string", "description": "Plain-text email body."},
                    },
                    "required": ["to", "subject", "body"],
                },
                handler=send_email,
                requires_consent=True,
                source="connector",
                server_id="gmail",
                enabled=enabled,
            )
        )

    def _register_gdrive_tools(self, creds: dict[str, str], enabled: bool) -> None:
        token = creds["access_token"]

        def search_files(query: str, max_results: int = 10) -> list[dict[str, Any]]:
            limit = max(1, min(int(max_results), 25))
            safe_q = query.replace("'", "\\'")
            q_filter = f"name contains '{safe_q}' and trashed = false" if safe_q else "trashed = false"
            resp = requests.get(
                "https://www.googleapis.com/drive/v3/files",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "q": q_filter,
                    "pageSize": limit,
                    "fields": "files(id, name, mimeType, modifiedTime, webViewLink)",
                },
                timeout=15,
            )
            resp.raise_for_status()
            return list(resp.json().get("files", []))

        def read_file(file_id: str) -> dict[str, Any]:
            meta_resp = requests.get(
                f"https://www.googleapis.com/drive/v3/files/{file_id}",
                headers={"Authorization": f"Bearer {token}"},
                params={"fields": "id, name, mimeType, webViewLink"},
                timeout=10,
            )
            meta_resp.raise_for_status()
            meta = meta_resp.json()
            mime = meta.get("mimeType", "")

            if mime == "application/vnd.google-apps.document":
                content_resp = requests.get(
                    f"https://www.googleapis.com/drive/v3/files/{file_id}/export",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"mimeType": "text/plain"},
                    timeout=15,
                )
                content_resp.raise_for_status()
                text = content_resp.text[:4000]
            else:
                content_resp = requests.get(
                    f"https://www.googleapis.com/drive/v3/files/{file_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"alt": "media"},
                    timeout=15,
                )
                content_resp.raise_for_status()
                text = content_resp.text[:4000]

            return {
                "id": meta.get("id"),
                "name": meta.get("name"),
                "mimeType": mime,
                "url": meta.get("webViewLink", ""),
                "content": text,
            }

        self._registry.register(
            ToolSpec(
                name="gdrive_search_files",
                description="Search files and Google Docs in the connected Google Drive account by title.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Filename or keyword to search in Google Drive."},
                        "max_results": {"type": "integer", "description": "Max files to return (default 10)."},
                    },
                    "required": ["query"],
                },
                handler=search_files,
                requires_consent=False,
                source="connector",
                server_id="google_drive",
                enabled=enabled,
            )
        )

        self._registry.register(
            ToolSpec(
                name="gdrive_read_file",
                description="Read the text content of a Google Doc or plain-text file from Google Drive by file_id.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "file_id": {"type": "string", "description": "The Google Drive file ID."},
                    },
                    "required": ["file_id"],
                },
                handler=read_file,
                requires_consent=False,
                source="connector",
                server_id="google_drive",
                enabled=enabled,
            )
        )

    def commit_reviewed_file(self, change):
        entry = self._state["connected"].get("github", {})
        token = entry.get("credentials", {}).get("token")
        if not token or not entry.get("enabled"):
            raise ConnectorError("Connect and enable GitHub before committing.")
        return github_changes.commit(token, change)

    def _register_github_tools(self, creds: dict[str, str], enabled: bool) -> None:
        token = creds["token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        }

        def review_change(**fields):
            return github_changes.review(token, github_changes.FileChange(**fields))

        self._registry.register(ToolSpec(
            name="github_review_change", source="connector", server_id="github", enabled=enabled,
            description="Prepare a single file change for human review. Specify the repository, branch, path, commit message and full new content. The user commits the exact reviewed change in the interface.",
            input_schema=github_changes.FileChange.model_json_schema(), handler=review_change,
        ))

        def search_repos(query: str) -> list[dict[str, Any]]:
            resp = requests.get(
                "https://api.github.com/search/repositories",
                headers=headers,
                params={"q": query, "per_page": 6},
                timeout=12,
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])
            return [
                {
                    "full_name": r.get("full_name"),
                    "description": r.get("description"),
                    "url": r.get("html_url"),
                    "stars": r.get("stargazers_count"),
                }
                for r in items
            ]

        def get_file(repo: str, path: str) -> dict[str, Any]:
            import base64

            resp = requests.get(
                f"https://api.github.com/repos/{repo.strip('/')}/contents/{path.lstrip('/')}",
                headers=headers,
                timeout=12,
            )
            resp.raise_for_status()
            data = resp.json()
            content_b64 = data.get("content", "")
            decoded = (
                base64.b64decode(content_b64).decode("utf-8", errors="replace")[:4000]
                if content_b64
                else ""
            )
            return {
                "repo": repo,
                "path": path,
                "url": data.get("html_url", ""),
                "content": decoded,
            }

        def create_issue(repo: str, title: str, body: str = "") -> dict[str, Any]:
            resp = requests.post(
                f"https://api.github.com/repos/{repo.strip('/')}/issues",
                headers=headers,
                json={"title": title, "body": body},
                timeout=12,
            )
            resp.raise_for_status()
            issue = resp.json()
            return {
                "number": issue.get("number"),
                "title": issue.get("title"),
                "url": issue.get("html_url"),
            }

        self._registry.register(
            ToolSpec(
                name="github_search_repos",
                description="Search GitHub repositories by keyword or topic.",
                input_schema={
                    "type": "object",
                    "properties": {"query": {"type": "string", "description": "Repository search query."}},
                    "required": ["query"],
                },
                handler=search_repos,
                requires_consent=False,
                source="connector",
                server_id="github",
                enabled=enabled,
            )
        )
        self._registry.register(
            ToolSpec(
                name="github_get_file",
                description="Read a file from a GitHub repository (owner/repo and file path).",
                input_schema={
                    "type": "object",
                    "properties": {
                        "repo": {"type": "string", "description": "Repository in 'owner/name' format."},
                        "path": {"type": "string", "description": "File path inside the repository."},
                    },
                    "required": ["repo", "path"],
                },
                handler=get_file,
                requires_consent=False,
                source="connector",
                server_id="github",
                enabled=enabled,
            )
        )
        self._registry.register(
            ToolSpec(
                name="github_create_issue",
                description="Create a new GitHub issue in a repository. Requires user consent.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "repo": {"type": "string", "description": "Repository in 'owner/name' format."},
                        "title": {"type": "string", "description": "Issue title."},
                        "body": {"type": "string", "description": "Issue description in Markdown."},
                    },
                    "required": ["repo", "title"],
                },
                handler=create_issue,
                requires_consent=True,
                source="connector",
                server_id="github",
                enabled=enabled,
            )
        )

    def _register_notion_tools(self, creds: dict[str, str], enabled: bool) -> None:
        api_key = creds["api_key"]
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        }

        def search_pages(query: str) -> list[dict[str, Any]]:
            resp = requests.post(
                "https://api.notion.com/v1/search",
                headers=headers,
                json={"query": query, "page_size": 8},
                timeout=12,
            )
            resp.raise_for_status()
            results: list[dict[str, Any]] = []
            for item in resp.json().get("results", []):
                title = "Untitled"
                props = item.get("properties", {})
                for prop_val in props.values():
                    if isinstance(prop_val, dict) and prop_val.get("type") == "title":
                        t_arr = prop_val.get("title", [])
                        if t_arr:
                            title = "".join(part.get("plain_text", "") for part in t_arr)
                            break
                results.append(
                    {
                        "id": item.get("id"),
                        "object": item.get("object"),
                        "title": title,
                        "url": item.get("url", ""),
                    }
                )
            return results

        def read_page(page_id: str) -> dict[str, Any]:
            resp = requests.get(
                f"https://api.notion.com/v1/blocks/{page_id}/children?page_size=50",
                headers=headers,
                timeout=12,
            )
            resp.raise_for_status()
            lines: list[str] = []
            for block in resp.json().get("results", []):
                btype = block.get("type", "")
                bdata = block.get(btype, {})
                if isinstance(bdata, dict) and "rich_text" in bdata:
                    text = "".join(rt.get("plain_text", "") for rt in bdata.get("rich_text", []))
                    if text:
                        lines.append(text)
            return {"page_id": page_id, "content": "\n".join(lines)[:4000]}

        self._registry.register(
            ToolSpec(
                name="notion_search_pages",
                description="Search Notion pages and databases shared with the integration.",
                input_schema={
                    "type": "object",
                    "properties": {"query": {"type": "string", "description": "Search query for Notion pages."}},
                    "required": ["query"],
                },
                handler=search_pages,
                requires_consent=False,
                source="connector",
                server_id="notion",
                enabled=enabled,
            )
        )
        self._registry.register(
            ToolSpec(
                name="notion_read_page",
                description="Read the text blocks of a Notion page by its page_id.",
                input_schema={
                    "type": "object",
                    "properties": {"page_id": {"type": "string", "description": "Notion page UUID."}},
                    "required": ["page_id"],
                },
                handler=read_page,
                requires_consent=False,
                source="connector",
                server_id="notion",
                enabled=enabled,
            )
        )

    def _register_slack_tools(self, creds: dict[str, str], enabled: bool) -> None:
        token = creds["bot_token"]
        default_channel = creds.get("default_channel", "#general") or "#general"

        def post_message(text: str, channel: str = "") -> dict[str, Any]:
            target_channel = channel.strip() or default_channel
            if token.startswith("https://hooks.slack.com/"):
                resp = requests.post(token, json={"text": text}, timeout=10)
                resp.raise_for_status()
                return {"status": "posted", "channel": "webhook"}
            resp = requests.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {token}"},
                json={"channel": target_channel, "text": text},
                timeout=10,
            )
            data = resp.json()
            if not data.get("ok"):
                raise RuntimeError(f"Slack API error: {data.get('error', 'unknown')}")
            return {"status": "posted", "channel": target_channel, "ts": data.get("ts", "")}

        self._registry.register(
            ToolSpec(
                name="slack_post_message",
                description="Post a message to a Slack channel. Requires user consent.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "text": {"type": "string", "description": "Message text to post to Slack."},
                        "channel": {"type": "string", "description": "Slack channel name or ID (e.g. #general)."},
                    },
                    "required": ["text"],
                },
                handler=post_message,
                requires_consent=True,
                source="connector",
                server_id="slack",
                enabled=enabled,
            )
        )

    def _register_custom_connector_tool(self, custom_id: str, cfg: dict[str, Any]) -> None:
        tool_name = f"custom_{custom_id}"
        self._registry.unregister(tool_name)

        endpoint_url = str(cfg["endpoint_url"])
        method = str(cfg.get("method", "POST")).upper()
        api_key = str(cfg.get("api_key", ""))
        enabled = bool(cfg.get("enabled", True))

        def call_custom_webhook(query: str, payload_json: str = "{}") -> Any:
            headers: dict[str, str] = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            try:
                extra = json.loads(payload_json) if payload_json else {}
            except Exception:
                extra = {"raw": payload_json}
            body = {"query": query, **(extra if isinstance(extra, dict) else {"data": extra})}
            if method == "GET":
                resp = requests.get(endpoint_url, headers=headers, params={"query": query}, timeout=15)
            else:
                resp = requests.post(endpoint_url, headers=headers, json=body, timeout=15)
            resp.raise_for_status()
            return resp.text[:4000]

        self._registry.register(
            ToolSpec(
                name=tool_name,
                description=str(cfg.get("description") or f"Custom connector {cfg.get('name', custom_id)}"),
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Query or instruction sent to the custom connector."},
                        "payload_json": {"type": "string", "description": "Optional JSON string of extra parameters."},
                    },
                    "required": ["query"],
                },
                handler=call_custom_webhook,
                requires_consent=True,
                source="connector",
                server_id=custom_id,
                enabled=enabled,
            )
        )


connector_manager = ConnectorManager(tool_registry=global_registry)
