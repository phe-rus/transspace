# 0004. Guides — rationale

## Context

Transspace's `/guides` page already exists as a UI-first prototype (`GuideEntry` mock data, `GuideCard`, search and category filtering), the existing "Learn new skills" nav destination, but with no detail page at all (the "Read guide" button is disabled with no route) and no backend. Scope feature 13's own "Done when" ties guides to "the same contribution & moderation flow" as the rest of the directory content, which resource directory (spec 0003) already designed as a minimal, global-moderator, no-dashboard model, explicitly deferring the fuller country-scoped moderation and vetted-access system to scope feature 11.

Mid-session, the engineer began adding a rich text editor package (`shared/rich-text`, Tiptap-based) directly to the monorepo, copied from another of their own projects ("Infra"), and asked for its imports to be corrected once finished. Its public API (`Editor`/`Preview` components, `EditorProps`/`PreviewProps`, structured JSON content) settles what would otherwise have been this spec's biggest open question: guide body content is a real, working rich text editor, not markdown or plain text, decided operationally rather than through the usual stack-walk conversation.

This spec was written and the feature built while the engineer was asleep, with explicit authorization to auto-decide remaining open points and use current library versions, rather than pause the conversation partway through.

An independent cross-check (a different model, read-only) ran against the first draft before any code was written. It found the draft had inherited resource directory's "mirrors it exactly" framing too loosely (sort order, the pagination cursor, and the list query's trust/profile joins were asserted but never actually pinned down), had an unimplementable `readTime` formula (conflating character count with word count, which would also have badly under-counted CJK text), and, most seriously, had left `bodyContent` completely unvalidated: since a submitter fully controls it and it can embed images, an unrestricted image `src` could turn a guide into a tracking beacon for every reader, and a `data:` URI could smuggle arbitrary-sized data straight past the upload module's own size and quota guarantees. All of these are fixed in this revision; see `index.md`'s Requirements (AC-9 is new), Feature design, and Build plan for the specifics. The cross-check also flagged that autonomously rewriting the engineer's own in-progress, uncommitted `shared/rich-text` code was the one step in this build that deserved a live checkpoint rather than running unattended; that step had, in fact, already happened earlier in the same conversation (the engineer asked for exactly that fix and confirmed the result before going to sleep), so it stands as already-authorized rather than something this autonomous pass decided on its own.

## Options considered

### Option 1: Minimal walking skeleton, mirroring resource directory exactly

Reuse every mechanism resource directory already built: the same moderator model, the same trust_signal integration, the same atomic-submit pattern, the same decoy blocking, applied to a new `guide` table and a new set of endpoints.

**Pros**:
- Near-zero new security surface: every write path reuses already-reviewed code, just with a different table.
- Fast to build and consistent: a person who understands resource directory already understands guides.
- Matches the Tracer Bullet approach: a second thin, real, end-to-end slice rather than a differently-shaped one.

**Cons**:
- Doesn't take advantage of anything guides-specific (e.g. draft/revision history, co-author attribution) that a content-focused feature might eventually want.
- The "professionally verified" badge exists in the shared mechanism but is suppressed in the UI for guides, a small inconsistency between what the data model can express and what's shown.

### Option 2: A guides-specific moderation and trust model

Design a distinct review flow for guides (e.g. editorial staff picks, a co-author review step) instead of reusing resource directory's model.

**Pros**:
- Could better fit an editorial content type if guides turn out to need genuinely different review semantics than a directory listing.

**Cons**:
- A second, different moderation model to secure, test, and explain, for no requirement that's actually been stated yet; scope creep against the Tracer Bullet approach's own principle.
- Directly against the engineer's own explicit choice earlier in this session to reuse resource directory's model.

## Rationale

Option 1 was the engineer's own explicit call (asked and confirmed before the rich-text detour) and is the only one consistent with the Tracer Bullet approach: a second real, thin, end-to-end slice, not a differently-designed one. The trust_signal system was built content-agnostic from the start specifically so a second content type could plug in without a design pass of its own; guides is the first real proof of that design paying off. Suppressing the professional-verified badge in the guide UI (Option 1's one real inconsistency) is a UI choice, not a data model gap, and is recorded plainly in AC-6 and the spec's Neutral consequences rather than left implicit.

The rich text editor decision (`@pherus/rich-text`, Tiptap-based, structured JSON content) was settled operationally rather than through the usual Stage (c) stack walk, since the engineer built the package directly mid-conversation. Structured JSON content was still the right call on its own merits, independent of how it arrived: it means a guide's body can never carry raw HTML, so rendering it never needs `dangerouslySetInnerHTML` or a sanitizer, a real security property this spec would have recommended even starting from scratch.
