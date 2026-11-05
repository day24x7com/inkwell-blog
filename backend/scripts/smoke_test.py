"""End-to-end smoke test for the Inkwell API.

Runs against a live server (default http://127.0.0.1:8000/api) and exercises
the full happy path plus the auth boundary, so CI catches regressions in the
contract rather than only in imports.

    python -m scripts.smoke_test
"""

from __future__ import annotations

import os
import sys
import uuid

import httpx

BASE = os.environ.get("API_URL", "http://127.0.0.1:8000/api").rstrip("/")
failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"  PASS  {label}")
    else:
        print(f"  FAIL  {label} {detail}")
        failures.append(label)


def main() -> int:
    suffix = uuid.uuid4().hex[:8]
    client = httpx.Client(base_url=BASE, timeout=15.0)

    print("health")
    r = client.get("/health")
    check("health returns 200", r.status_code == 200, r.text)
    check("service name", r.json().get("service") == "inkwell-blog-api")

    print("auth")
    creds = {
        "email": f"ci-{suffix}@example.com",
        "username": f"ci_{suffix}",
        "password": "smoke-test-password",
    }
    r = client.post("/auth/register", json=creds)
    check("register returns 201", r.status_code == 201, r.text)
    check("register echoes username", r.json().get("username") == creds["username"])

    r = client.post(
        "/auth/login",
        data={"username": creds["username"], "password": creds["password"]},
    )
    check("login returns 200", r.status_code == 200, r.text)
    token = r.json().get("access_token", "")
    check("token issued", bool(token))
    auth = {"Authorization": f"Bearer {token}"}

    r = client.get("/auth/me", headers=auth)
    check("/me returns current user", r.status_code == 200 and r.json()["username"] == creds["username"])

    r = client.get("/auth/me")
    check("/me without token is 401", r.status_code == 401)

    print("posts")
    payload = {
        "title": f"CI smoke post {suffix}",
        "excerpt": "Written by the automated smoke test.",
        "content": "## Hello\n\nSome **bold** text and a `code` span.",
        "published": True,
        "tags": ["CI", "Automation"],
    }
    r = client.post("/posts", json=payload, headers=auth)
    check("create post returns 201", r.status_code == 201, r.text)
    post = r.json()
    slug = post.get("slug", "")
    check("slug derived from title", slug.startswith("ci-smoke-post"))
    check("tags attached", {t["name"] for t in post.get("tags", [])} == {"CI", "Automation"})

    r = client.post("/posts", json=payload)
    check("create without token is 401", r.status_code == 401)

    r = client.get(f"/posts/{slug}")
    check("read post by slug", r.status_code == 200 and r.json()["id"] == post["id"])

    r = client.get("/posts", params={"tag": "CI"})
    check("tag filter finds the post", any(p["id"] == post["id"] for p in r.json()["items"]))

    r = client.get("/posts", params={"q": suffix})
    check("search finds the post", any(p["id"] == post["id"] for p in r.json()["items"]))

    r = client.put(f"/posts/{post['id']}", json={"title": f"CI smoke post {suffix} (edited)"}, headers=auth)
    check("update returns 200", r.status_code == 200, r.text)
    check("title updated", r.json()["title"].endswith("(edited)"))
    check("slug stays stable across rename", r.json()["slug"] == slug)

    r = client.get(f"/posts/{slug}")
    check("original slug still resolves after rename", r.status_code == 200)

    print("comments")
    r = client.post(f"/posts/{slug}/comments", json={"body": "Looks good to me."}, headers=auth)
    check("add comment returns 201", r.status_code == 201, r.text)
    comment_id = r.json().get("id")

    r = client.get(f"/posts/{slug}/comments")
    check("comment listed", any(c["id"] == comment_id for c in r.json()))

    r = client.delete(f"/posts/{slug}/comments/{comment_id}", headers=auth)
    check("delete comment returns 204", r.status_code == 204)

    print("cleanup")
    r = client.delete(f"/posts/{post['id']}", headers=auth)
    check("delete post returns 204", r.status_code == 204)

    r = client.get(f"/posts/{slug}")
    check("deleted post is gone", r.status_code == 404)

    client.close()

    print()
    if failures:
        print(f"{len(failures)} check(s) failed: {', '.join(failures)}")
        return 1
    print("All smoke test checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
