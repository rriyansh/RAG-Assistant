-- Run with psql -v runtime_role=reso_studio as the migration owner.
GRANT USAGE ON SCHEMA public TO :"runtime_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON assistants, studio_chat_routes TO :"runtime_role";
GRANT EXECUTE ON FUNCTION studio_key_tenant(uuid,bytea) TO :"runtime_role";
