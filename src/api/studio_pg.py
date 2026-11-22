"""PostgreSQL repository. Tenant IDs are distinct from browser session secrets."""
import hashlib
import os
import secrets
from uuid import UUID, uuid5, NAMESPACE_URL

import psycopg
from fastapi import HTTPException
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


def tenant_for(owner):
    return uuid5(NAMESPACE_URL, "reso:workspace:" + owner)


def connect():
    return psycopg.connect(os.environ["STUDIO_DATABASE_URL"], row_factory=dict_row, connect_timeout=5)


def bind(db, tenant):
    role = db.execute("""SELECT rolsuper OR rolbypassrls AS unsafe FROM pg_roles
                         WHERE rolname = current_user""").fetchone()
    if role["unsafe"]:
        raise RuntimeError("Studio requires a restricted PostgreSQL runtime role")
    db.execute("SELECT set_config('reso.tenant_id', %s, true)", (str(tenant),))


def put(owner, aid, config, *, create=False):
    with connect() as db:
        tenant = tenant_for(owner)
        bind(db, tenant)
        if create:
            db.execute("""INSERT INTO assistants(tenant_id,id,name,config,workspace_owner)
                          VALUES (%s,%s,%s,%s,%s)""", (tenant, aid, config["name"], Jsonb(config), owner))
        else:
            changed = db.execute("""UPDATE assistants SET config=%s,name=%s,revision=revision+1
                                    WHERE tenant_id=%s AND id=%s""", (Jsonb(config), config["name"], tenant, aid))
            if not changed.rowcount:
                raise HTTPException(404, "Assistant not found")


def listing(owner):
    with connect() as db:
        bind(db, tenant_for(owner))
        return db.execute("SELECT id,name FROM assistants ORDER BY created_at DESC,id").fetchall()


def read(owner, aid, bearer=None):
    with connect() as db:
        if bearer is None:
            tenant = tenant_for(owner)
        else:
            digest = hashlib.sha256(bearer.encode()).digest()
            # The lookup function exposes only the tenant for an exact chat capability.
            found = db.execute("SELECT studio_key_tenant(%s,%s) AS tenant", (aid, digest)).fetchone()
            if not found["tenant"]:
                raise HTTPException(401, "Invalid chat key")
            tenant = found["tenant"]
        bind(db, tenant)
        row = db.execute("SELECT config,workspace_owner FROM assistants WHERE id=%s", (aid,)).fetchone()
        if not row:
            raise HTTPException(404, "Assistant not found")
        return row


def delete(owner, aid):
    with connect() as db:
        bind(db, tenant_for(owner))
        if not db.execute("DELETE FROM assistants WHERE id=%s", (aid,)).rowcount:
            raise HTTPException(404, "Assistant not found")


def key(owner, aid, *, revoke=False):
    tenant = tenant_for(owner)
    with connect() as db:
        bind(db, tenant)
        if not db.execute("SELECT 1 FROM assistants WHERE id=%s FOR UPDATE", (aid,)).fetchone():
            raise HTTPException(404, "Assistant not found")
        db.execute("DELETE FROM studio_chat_routes WHERE assistant_id=%s AND tenant_id=%s", (aid, tenant))
        if not revoke:
            token = "reso_live_" + secrets.token_urlsafe(32)
            db.execute("INSERT INTO studio_chat_routes VALUES (%s,%s,%s)",
                       (tenant, aid, hashlib.sha256(token.encode()).digest()))
            return token
