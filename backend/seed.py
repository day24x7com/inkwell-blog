"""Seed the blog with demo users, tags and posts.

Usage:  .venv/bin/python seed.py
"""
import asyncio

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Comment, Post, Tag, User
from app.security import hash_password, slugify

USERS = [
    ("ada@example.com", "ada", "password123"),
    ("grace@example.com", "grace", "password123"),
]

POSTS = [
    {
        "title": "Designing a Reading List That Actually Sticks",
        "excerpt": "Most reading lists collapse in three weeks. Here is a lighter system built around momentum instead of willpower.",
        "tags": ["Productivity", "Reading"],
        "author": "ada",
        "content": """## Start smaller than feels reasonable

The failure mode of every reading goal is the same: you plan for the reader you
want to be, not the reader you are. A list of forty books is a fantasy. Three
books is a plan.

Pick one book you are genuinely curious about — not one you think you *should*
read — and put it where you already waste time: the bedside table, the bag you
carry daily, the browser tab you open first.

## Make the commitment physical

Digital lists are invisible. A book on your pillow is not. The friction of
opening an app is small, but it is enough to lose to a phone that is already
open. Physical placement wins because it removes a decision.

If you read on a device, delete every non-reading app from your reading
surface. Make the reading app the only tap available.

## Track pages, not books

"Finished a book" is a binary outcome that arrives too rarely to motivate you.
Pages read is a continuous signal you can feel every day. A streak of seven
consecutive days with ten pages is worth more than a finished book you never
enjoyed.

## Quit freely

The single biggest improvement to my reading life was permission to abandon.
A book you dread is a tax on every book that follows it. Give a book fifty
pages. If you do not want to turn the page, put it down and do not apologise.

## Re-read without guilt

There is a strange prestige attached to novelty. Yet re-reading a book you
loved as a teenager often reveals more than a new book ever could — you are a
different reader now, and the same sentences land differently.

## Build a small shelf

Six to ten books at a time. Enough variety to match your mood, few enough that
no book can hide. When one leaves, one enters. The constraint is the point.
""",
    },
    {
        "title": "Why Your API Should Return Problems, Not Errors",
        "excerpt": "HTTP status codes are transport. The real contract is the shape of what you return when something goes wrong.",
        "tags": ["Engineering", "API"],
        "author": "grace",
        "content": """## The two jobs of an error response

An error response has to answer two questions: *what happened* and *what should
the caller do next*. Most APIs answer only the first, and often badly.

```json
{ "error": "Bad Request" }
```

This tells the caller nothing. It is a label, not a diagnosis.

## Describe the problem, not the status

RFC 7807 turns error bodies into structured documents. The shape is small and
worth adopting even when you are not formally claiming compliance.

```json
{
  "type": "https://example.com/problems/insufficient-funds",
  "title": "Insufficient funds",
  "status": 422,
  "detail": "Account 1234 has a balance of 30 but the transfer requires 50.",
  "instance": "/transfers/9f8c"
}
```

The `detail` field is where the value lives. It names the specific values that
caused the failure. A support engineer reading a log now knows exactly which
account and which amount to investigate.

## Separate the layers

Transport status codes and business outcomes are not the same thing. A payment
that fails for insufficient funds is a perfectly successful HTTP exchange. It
is common — and wrong — to collapse this distinction into a 500.

| Situation | Status | Meaning |
| --- | --- | --- |
| Malformed JSON | 400 | The request could not be parsed |
| Missing auth token | 401 | Identity was not presented |
| Valid token, wrong owner | 403 | Identity was presented, not permitted |
| Unknown resource | 404 | The target does not exist |
| Business rule violated | 422 | Syntax fine, semantics rejected |
| Our bug | 500 | We failed, not the caller |

## Make failures debuggable

Include a request identifier in every error body and echo it in a response
header. When a user reports a failure, one string lets you find the exact log
line, the exact query, and the exact moment.

## Never leak internals

Stack traces, SQL fragments and internal hostnames are reconnaissance material.
Log them; do not return them. The caller needs the contract, not your
architecture.

## Document the failure surface

An endpoint's documentation is incomplete if it only shows the happy path.
Every documented error should carry a sample body. If a caller has to read your
source to know what a 422 means, the API is not finished.
""",
    },
    {
        "title": "The Quiet Power of Boring Technology",
        "excerpt": "Every novel choice is a future incident. Choosing the dull option is not a lack of ambition — it is a deliberate trade.",
        "tags": ["Engineering", "Architecture"],
        "author": "ada",
        "content": """## Novelty has a bill

A new database, a new message broker, a new framework — each is a small
university you must attend before you can operate it at three in the morning.

The cost is not the licence fee. It is the months before your team's intuition
becomes reliable, the missing Stack Overflow answers, the hiring pipeline that
narrows to a handful of people.

## Boring is a feature

PostgreSQL is not exciting. That is precisely why it is a good default: its
failure modes are documented, its operators are abundant, and its backup story
is well trodden.

The same argument applies to boring queues, boring caching, boring deployment.
Predictability compounds.

## Spend your innovation budget deliberately

Every product has a small number of things that genuinely must be novel — the
part that makes it worth existing. Everything else should be the most obvious
choice available.

If you are inventing a new consensus protocol *and* a new billing model *and* a
custom CI system, you have three sources of unknown failure and no capacity to
handle any of them.

## The two-way door test

Reversible decisions deserve speed; irreversible ones deserve care. Most
technology choices feel irreversible and are not. Write down the exit cost.

If migrating away later would take a week, pick the option that ships today.
If it would take a year, slow down.

## Measure the real constraint

Teams often adopt complexity to solve a scale problem they do not have. Profile
first. A single Postgres instance with a good index will outperform a
distributed stack for a very long time at very respectable traffic.

## When to choose the sharp tool

Boring is a default, not a religion. Choose the specialised tool when the
constraint is real, measured, and persistent — when the boring option actively
cannot serve the requirement.

Then choose it explicitly, document why, and write down what would make you
reconsider. That is engineering judgement; everything else is fashion.
""",
    },
]

COMMENTS = [
    ("Great piece.", "grace"),
    ("The part about quitting freely landed for me.", "ada"),
]


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        existing = await db.scalar(select(Post.id).limit(1))
        if existing:
            print("Database already seeded, nothing to do.")
            return

        users: dict[str, User] = {}
        for email, username, password in USERS:
            user = User(email=email, username=username, hashed_password=hash_password(password))
            db.add(user)
            users[username] = user
        await db.flush()

        tag_cache: dict[str, Tag] = {}
        for spec in POSTS:
            tags = []
            for name in spec["tags"]:
                slug = slugify(name)
                tag = tag_cache.get(slug)
                if tag is None:
                    tag = Tag(name=name, slug=slug)
                    db.add(tag)
                    await db.flush()
                    tag_cache[slug] = tag
                tags.append(tag)

            post = Post(
                title=spec["title"],
                slug=slugify(spec["title"]),
                excerpt=spec["excerpt"],
                content=spec["content"],
                published=True,
                author_id=users[spec["author"]].id,
                tags=tags,
            )
            db.add(post)
            await db.flush()

            for body, author in COMMENTS:
                db.add(Comment(body=body, post_id=post.id, author_id=users[author].id))

        await db.commit()
        print(f"Seeded {len(USERS)} users, {len(POSTS)} posts, {len(COMMENTS)} comments each.")
        print("Login with ada/password123 or grace/password123")


if __name__ == "__main__":
    asyncio.run(main())
