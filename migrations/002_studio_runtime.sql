BEGIN;
ALTER TABLE assistants ADD COLUMN workspace_owner text;
CREATE TABLE studio_chat_routes (
    tenant_id uuid NOT NULL,
    assistant_id uuid NOT NULL,
    digest bytea NOT NULL UNIQUE CHECK (octet_length(digest)=32),
    PRIMARY KEY (tenant_id,assistant_id),
    FOREIGN KEY (tenant_id,assistant_id) REFERENCES assistants ON DELETE CASCADE
);
ALTER TABLE studio_chat_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY studio_route_owner ON studio_chat_routes
    USING (tenant_id=nullif(current_setting('reso.tenant_id',true),'')::uuid)
    WITH CHECK (tenant_id=nullif(current_setting('reso.tenant_id',true),'')::uuid);
CREATE FUNCTION public.studio_key_tenant(uuid,bytea) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS 'SELECT tenant_id FROM public.studio_chat_routes WHERE assistant_id=$1 AND digest=$2';
REVOKE ALL ON FUNCTION public.studio_key_tenant(uuid,bytea) FROM PUBLIC;
COMMIT;
