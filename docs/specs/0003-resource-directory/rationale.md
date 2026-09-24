# 0003. Resource directory — rationale

## Context

> ⚠️ Premise note: the original ask (root path, location, submit a resource, communities, support) spans several independently designable decisions, not one. During this conversation, two of them were explicitly carved out and deferred rather than folded in here: (1) a vetted-access visibility tier plus country-risk auto-gating, hiding certain listings or exact addresses from unvetted accounts based on a country's laws, and (2) country-scoped moderators (a Uganda moderator can only act on Uganda content) plus a real moderator/admin review dashboard under `(protection)`. Both are genuinely safety-critical and deserve their own focused `/architect` pass; the second is scope feature 11 (Contribution & moderation flow) by name. This spec covers only the resource directory: browse, search, detail, and a minimal submit-to-publish path. The `/support` page mentioned alongside this ask is also not covered here: it isn't a named scope feature and its actual content was never defined.

Transspace's landing page, resource list (`/r`), and resource detail pages already exist as a fully built UI prototype running on hardcoded mock data (`www/src/data/atlas-resources.ts`), deliberately built UI-first ahead of any backend (a Facade approach) so the intended shape would be visible before the data model was decided. That mock data and the page copy around it (`en.json`) encode real intent: a flexible per-resource structure (services, an estimate string, contact info), a "vetted status" concept gating exact addresses, and countries the product clearly intends to support globally rather than from a fixed list (entries already span Uganda-adjacent regions, Thailand, Argentina, Kenya, and more).

This product's own foundation specs (0002, identity/data/trust) already establish that privacy is treated as a safety feature, not a nice to have, because some users are in places where being LGBTQIA+ is dangerous. That stance directly shapes two decisions in this spec: how "current location" gets determined (never silently inferred from IP or device), and what gets deferred rather than rushed (the vetted-access tier). The trust and verification signal system (spec 0003 under 0002) and the moderator/audit system (spec 0002's data model child) are both already built and are reused here rather than reinvented; this spec's own numbering is unrelated to that one, the two are independent specs that happen to share a number by coincidence of directory placement.

## Options considered

### Option 1: Minimal walking skeleton, reuse every existing foundation

Ship the thinnest real version: one global moderator role (already built) can publish or reject, trust badges come entirely from the already-built trust_signal system, location is a manual picker, categories stay a shipped constant, and category-specific data lives in one flexible JSON column rather than new tables.

**Pros**:
- Reuses every foundation already built and verified (trust signals, moderators, rate limiting, Turnstile) with zero changes to their shape.
- Ships fastest, matching the Tracer Bullet approach's own principle: a thin real thread end to end before anything grows.
- Keeps genuinely safety-critical, harder decisions (vetting, country-risk gating, scoped moderation) out of a build made under time pressure.

**Cons**:
- No self-service view for a submitter to check their own submission's status (no dashboard).
- Any moderator can publish or reject any resource from any country; no scoping yet.
- A sensitive listing gets no extra protection at launch beyond ordinary moderation.

### Option 2: Build the full country-scoped moderation and vetting tier now

Design and build country-scoped moderators, a real moderator/admin dashboard, and the vetted-access visibility tier as part of this same spec.

**Pros**:
- Matches the fuller long-term vision in one pass; no later migration to retrofit scoping onto the moderators table.

**Cons**:
- Changes the authorization model of an already-shipped table (`moderators`, spec 0002), a much larger and riskier change than this spec's stated scope.
- Delays shipping the walking skeleton for a feature (11) that scope.md already sequences separately.
- Real risk of a rushed, under-specified version of the single most safety-critical piece of this product; exactly the failure mode this conversation already flagged and chose to avoid.

### Option 3: Rigid per-category typed columns instead of a flexible JSON details field

Give each category (or at least `health`) its own typed columns or its own table for category-specific data (e.g. a `medication` field with a `dosageRange`).

**Pros**:
- Strong typing; easy to query or filter on a specific structured attribute later.

**Cons**:
- A schema migration every time a new category or a new country's submission needs a field the current columns don't have, directly against the stated goal of not assuming data for a country the directory doesn't cover yet.
- Most categories (legal, housing, crisis, travel) have no obvious structured shape yet; typed columns for one category and not others is inconsistent.

## Rationale

The project's own build approach (Tracer Bullet, per `docs/scope/scope.md`) calls for a thin, real, end-to-end thread before any layer grows, and feature 9 is explicitly named "the walking skeleton" in that same document. Option 1 is the only one of the three that ships a genuinely complete thread (data through API through UI) without inventing new infrastructure or touching an already-shipped table's authorization model.

The deferred pieces (vetted access, country-risk gating, scoped moderation) were surfaced mid-conversation as real, good ideas the product will likely need, but each is large enough and safety-sensitive enough to deserve its own deliberate `/architect` pass rather than being squeezed into this spec under time pressure, echoing this project's own established pattern (auth, the data model, and trust signals were each designed separately before being built). Option 2 would have meant changing the `moderators` table's shape (spec 0002) as a side effect of a feature spec that isn't primarily about authorization, a scope creep this project's own workflow (one decision per spec) exists to prevent. Option 3 directly contradicts the stated goal (submissions should be able to introduce a country or a structured detail the directory doesn't already model) and would need a migration for nearly every new category or country encountered.
