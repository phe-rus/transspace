## Context

> ⚠️ Premise note: this spec bundles four concerns that could each be their own decision, tiered visibility with a geo lock, a claim/assignment workflow, financial trust gating, and professional verification, into one board. They were designed together in this conversation because they interact tightly (a financial ask's tier controls who can even see it well enough to cosign it), and splitting them now would add coordination overhead without changing what gets built. The Build plan sequences them as separate, independently shippable slices, so a build can stop at any slice boundary if scope needs to shrink later.

transspace serves a global LGBTQIA+ community, including people living somewhere that criminalizes queerness. The support page today (`www/src/routes/(public)/support/`) is a static mockup: five hardcoded post categories, every action button disabled. It represents real unmet demand, financial hardship, job leads, transport help, a listening ear, that the resource directory's static content cannot serve, because a request needs to be fulfilled and closed, not just read.

The same fraud and trust concerns that already shape resource and guide moderation apply here with materially higher stakes. A financial ask is a scam vector. A professional sounding offer (medical, legal, or advisory) risks reading as direct professional advice, exposing the project to liability if not clearly bounded. A personal circumstance disclosed in the wrong post, to the wrong audience, in a country that criminalizes queerness, is a physical safety risk, not just a privacy inconvenience. None of this can be solved by copying the resource/guide moderation model unchanged; it needs its own visibility and verification rules layered on top of it.

No payment processing and no real time audio infrastructure exist in this codebase, and both are deliberately out of scope here (see index.md's Follow-up); this feature has to work as async, text based coordination, with progress tracking that is explicitly self reported rather than a verified transaction record.

## Options considered

### Option 1: Minimal reuse of the resource pattern

Copy the `resource` table almost verbatim: title, description, category, `structuredDetails`, status. No visibility tiers, no claim workflow, no financial trust gating, no professional verification. Ship the board fast, add nuance later.

**Pros**:
- Fastest to build, smallest new surface, exactly matches an existing, proven pattern.

**Cons**:
- Skips the two things this conversation identified as the actual point: tiered visibility for a community where exposure can be dangerous, and fraud aware handling of money and professional claims. Would need a near-total rebuild almost immediately.

### Option 2: Full model (chosen)

One `support_post` table with a `structuredDetails` JSON column per type (mirroring `resource`), the four-tier visibility model with a geo lock for `critical`, a claim/assignment workflow, and financial/professional trust checks built on the existing `trustSignal` system.

**Pros**:
- Delivers everything discussed. Reuses proven internal patterns (the `resource` JSON column, `trustSignal`, `moderationAction`) instead of inventing new infrastructure. Treats fraud and liability controls as first class, not bolted on.

**Cons**:
- The largest surface of the three options: visibility tiers, claims, and trust escalation all interact, and there is real moderator facing UI to build across all of it.

### Option 3: Full data model, defer visibility tiers and claims

Same entities as Option 2, but ship public-only visibility with no claim workflow in this build; add tiers and claiming in a fast follow-up spec once the base board has real usage.

**Pros**:
- Meaningfully smaller first slice, gets a real board live sooner.

**Cons**:
- Ships without the privacy protections that matter most for this audience. Publishing a financial hardship or health-adjacent request as fully public from day one is a real safety risk for people in places where being visible as queer is dangerous; that is not something to defer for the sake of a smaller first slice.

## Rationale

Option 1 is rejected because it does not deliver what was actually needed, this conversation surfaced tiered visibility and fraud aware handling as the load-bearing requirements, not optional polish. Option 3 is rejected specifically on safety grounds: this project serves people in countries where exposure carries real physical risk, so shipping without the privacy tiers, even temporarily, asks the people most likely to need this feature to accept the most risk while it matures.

Option 2's cost, a larger single build, is mitigated by reuse: the `structuredDetails` JSON pattern, the `trustSignal`/`trustCoSign` tables, and the `moderationAction` audit log already exist and were built to be content agnostic. This feature adds three new tables (`support_post`, `support_claim`, `support_update`), not a parallel trust or moderation system. (An earlier draft also added a `restricted_country` table; the cross-check pass below replaced it with a code constant.)

Several smaller calls inside the design were made by judgment rather than asked directly, recorded here for a future reviewer:

- **Financial account-age gate: 7 days.** Cuts off the most common scam pattern, a brand new account with an immediate money ask, without meaningfully delaying a genuine long-time community member. A 14 day threshold was the runner-up, rejected as unnecessarily slower for a genuinely urgent case.
- **Stale-post window: 30 days without a claim or update.** Matches typical mutual-aid urgency cycles: long enough to avoid false positives, short enough to prompt a real moderator check-in. A 14 day window was the runner-up, rejected as likely to generate moderator noise faster than it generates value.
- **Visibility tier ordering for escalation: `public < sensitive < critical < private`.** `critical` was placed above `sensitive` because it adds a geo lock on top of the same redaction rules, making it strictly more protective; `private` is maximal since it is excluded from every listing. Treating `critical` and `private` as unorderable relative to each other was the runner-up, rejected because "no downgrade without consent" needs a total order to be enforceable in code.
- **Age field as a self-reported range, not a birthdate.** Enough signal for a moderator without storing precise birthdate PII on a system explicitly designed to minimize identifying data on a pseudonymous profile. An exact birthdate was the runner-up, rejected for the added PII risk with no proportional benefit to the moderation decision it informs.
- **Non-assigned claims stay visible as "interested" rather than auto-declining.** Preserves the record of who else offered, useful if the assigned helper falls through, without treating an unpicked offer as a rejection. Auto-declining all other claims was the runner-up, rejected as discarding useful fallback information for a small UI simplification.
- **Editing a published post returns it to pending, with a visibility gap during re-review.** Matches the existing binary status model used by resources and guides; introducing a version-history table to avoid the gap was the runner-up, rejected as new persistence machinery this build does not otherwise need, for a build already large by surface area.

## Cross-check pass

An independent model (a different model than the one that drafted this spec) read the first draft against the real code it claimed to reuse and found eleven build-blocking gaps, eleven high-severity gaps, and a further set of medium and low findings. All recommended fixes were applied to `index.md`; the two judgment calls below were put back to the engineer explicitly, since they reversed decisions already made earlier in this conversation, and both were kept as originally decided:

- **Four visibility tiers, not three.** The cross-check noted `critical`'s geo lock is trivially bypassed by creating a free account, so it differs from `sensitive` only by a bypassable signed-out speed bump, and proposed collapsing to three tiers (public/restricted/private) to remove the ordering complexity. Kept at four: `sensitive` is about redacting detail, `critical` is about geography, and the distinction is safety-relevant even though the geo lock alone is not a hard defense (see the geo-lock threat model note below).
- **Restricted country list as a code constant, not a database table with moderator CRUD.** Accepted as proposed: matches how this codebase already handles every other fixed list (`RESOURCE_CATEGORIES`, `CONTENT_TYPES`), and a code change goes through review and git history, where a live table edit would not. This removed a table, three endpoints, and a build-plan step (see index.md AC-19).

One more judgment call came directly out of the cross-check and is recorded here since it is otherwise easy to miss: the `critical` tier's geo lock is explicitly a friction and discoverability control, not a defense against a targeted, resourced adversary, since signing up for a free account bypasses it immediately, and this codebase deliberately does not gate account creation behind anything that would slow that down. Tying the geo-lock bypass to an additional account-age requirement (mirroring the 7 day financial gate) was considered and rejected, because the stated goal for this whole feature is maximizing how many people can see and respond to a request; adding friction to viewing on the signed-in side works against that goal for the sake of hardening a control that a motivated adversary was never going to be stopped by. This tradeoff is recorded explicitly in index.md's Consequences rather than left implicit.
