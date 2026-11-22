# Roll out Assistant Studio on PostgreSQL

Without STUDIO_DATABASE_URL the API continues using its existing SQLite database. Each current browser workspace maps to a stable tenant. This release does not introduce shared team accounts.

1. Provision a PostgreSQL database and a separate login role for the API. The runtime role must not own the database, schema, tables or functions, inherit the migration role, have CREATE on public, or bypass row security. Secure the connection and supply the DSN through the deployment secret store.
2. As the migration owner apply migrations/001_assistant_studio.sql once if not already installed, then migrations/002_studio_runtime.sql. Run `psql -v ON_ERROR_STOP=1 -v runtime_role=reso_studio -f scripts/studio_runtime_grants.sql` with your actual runtime role name.
3. Put Studio in maintenance mode across all replicas. Back up data/studio.sqlite3 and the existing workspace data directory. In the new release environment with the runtime DSN exported, run `python -m scripts.migrate_studio data/studio.sqlite3`. The import uses one target transaction and preserves assistant IDs and existing key hashes.
4. After import succeeds, set STUDIO_DATABASE_URL on every API replica and restart together. Keep the existing workspace data volume for model configuration and credentials. Check listing, editing, sandbox chat, and a previously issued chat key before reopening writes.
5. Before reopening writes, rollback is possible by clearing the DSN and restarting all replicas against the snapshot. After PostgreSQL has accepted user writes, reconcile them before switching back. The importer is one-way.
