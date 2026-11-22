-- PostgreSQL. Run as the schema owner. The application role must not have
-- BYPASSRLS or superuser privileges. Bind the authenticated tenant with
-- set_config('reso.tenant_id', tenant_uuid, true) inside each transaction.
BEGIN;

CREATE TABLE assistants (
    tenant_id uuid NOT NULL,
    id uuid NOT NULL,
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
    config jsonb NOT NULL CHECK (jsonb_typeof(config) = 'object'),
    revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, id)
);

CREATE TABLE assistant_documents (
    tenant_id uuid NOT NULL,
    assistant_id uuid NOT NULL,
    id uuid NOT NULL,
    title text NOT NULL,
    source_uri text,
    priority integer NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, assistant_id, id),
    FOREIGN KEY (tenant_id, assistant_id) REFERENCES assistants ON DELETE CASCADE
);

CREATE TABLE assistant_chunks (
    tenant_id uuid NOT NULL,
    assistant_id uuid NOT NULL,
    document_id uuid NOT NULL,
    id uuid NOT NULL,
    position integer NOT NULL CHECK (position >= 0),
    body text NOT NULL CHECK (length(trim(body)) > 0),
    embedding real[],
    embedding_model text,
    PRIMARY KEY (tenant_id, assistant_id, document_id, id),
    UNIQUE (tenant_id, assistant_id, document_id, position) DEFERRABLE INITIALLY DEFERRED,
    CHECK ((embedding IS NULL) = (embedding_model IS NULL)),
    FOREIGN KEY (tenant_id, assistant_id, document_id)
        REFERENCES assistant_documents ON DELETE CASCADE
);

CREATE TABLE assistant_tools (
    tenant_id uuid NOT NULL,
    assistant_id uuid NOT NULL,
    id uuid NOT NULL,
    name text NOT NULL,
    enabled boolean NOT NULL DEFAULT false,
    definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
    credential_ref text,
    PRIMARY KEY (tenant_id, assistant_id, id),
    UNIQUE (tenant_id, assistant_id, name),
    FOREIGN KEY (tenant_id, assistant_id) REFERENCES assistants ON DELETE CASCADE
);

CREATE TABLE assistant_tickets (
    tenant_id uuid NOT NULL,
    assistant_id uuid NOT NULL,
    id uuid NOT NULL,
    requester_id text NOT NULL,
    subject text NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, assistant_id, id),
    FOREIGN KEY (tenant_id, assistant_id) REFERENCES assistants ON DELETE CASCADE
);

CREATE TABLE assistant_keys (
    tenant_id uuid NOT NULL,
    assistant_id uuid NOT NULL,
    id uuid NOT NULL,
    digest bytea NOT NULL UNIQUE CHECK (octet_length(digest) = 32),
    scope text NOT NULL CHECK (scope = 'chat'),
    revoked_at timestamptz,
    PRIMARY KEY (tenant_id, assistant_id, id),
    FOREIGN KEY (tenant_id, assistant_id) REFERENCES assistants ON DELETE CASCADE
);

ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON assistants
    USING (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid);

ALTER TABLE assistant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON assistant_documents
    USING (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid);

ALTER TABLE assistant_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_chunks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON assistant_chunks
    USING (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid);

ALTER TABLE assistant_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_tools FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON assistant_tools
    USING (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid);

ALTER TABLE assistant_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_tickets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON assistant_tickets
    USING (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid);

ALTER TABLE assistant_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON assistant_keys
    USING (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('reso.tenant_id', true), '')::uuid);

COMMIT;
