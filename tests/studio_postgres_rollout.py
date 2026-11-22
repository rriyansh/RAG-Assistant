"""Integration check against a disposable database provisioned by Studio CI."""
from uuid import uuid4
from fastapi import HTTPException
from src.api import studio_pg as pg


def denied(call, status):
    try:
        call()
    except HTTPException as exc:
        assert exc.status_code == status
    else:
        raise AssertionError("Isolation check failed")


def main():
    a, b, aid = uuid4().hex, uuid4().hex, uuid4()
    pg.put(a, aid, {"name":"First"}, create=True)
    assert pg.listing(b) == []
    denied(lambda: pg.read(b, aid), 404)
    denied(lambda: pg.put(b, aid, {"name":"Changed"}), 404)
    denied(lambda: pg.delete(b, aid), 404)
    denied(lambda: pg.key(b, aid), 404)
    token = pg.key(a, aid)
    assert pg.read(None, aid, token)["config"]["name"] == "First"
    pg.key(a, aid, revoke=True)
    denied(lambda: pg.read(None, aid, token), 401)
    pg.delete(a, aid)


if __name__ == "__main__":
    main()
