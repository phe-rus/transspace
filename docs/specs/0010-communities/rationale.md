# 0010. Communities: rationale

## Context

The header has promised "Communities" for a while, but the link points at the resource directory, the home page shows an empty "Trending in your communities" section, and the profile's Communities row is disabled. Scope feature 23 (the gender affirming health community) describes the same need for one topic: Reddit like threads, how tos and dos and donts, clearly marked as personal experience.

The audience includes people in countries where being queer or trans is dangerous. Anything live (chat, voice) risks exposing who someone is or where they are, and harmful content moves faster in real time than in threads. Moderation capacity is a small team.

Two constraints came from you directly. First, as few tables and schema files as possible (spec 0008 just folded five person tables into one). Second, cost: nothing that needs paying before there are real users. The plan is to stay on the Cloudflare Workers Free plan until about 1,000 monthly active people.

You also asked whether communication should be fully peer to peer ("queer to queer"), with a browser extension to survive closed tabs. That idea shaped the voice design, and the privacy and moderation costs of pure peer to peer shaped the rest.

The comments that replies depend on are specified in spec 0009 but not built yet.

## Options considered

### Option 1: Threads on the guide table, one Durable Object room per community (chosen)

Threads are guide rows with `kind = thread`, like stories. Replies are spec 0009 comments. Each community has one hibernating Durable Object that runs the text chat (stored with a retention timer) and the signalling for a voice mesh of up to 6 people, forced through Cloudflare's TURN relay.

**Pros**:
- Reuses moderation, anonymity, rich text and trust from guides and stories; one new table overall.
- Relay only voice hides every IP address; moderators can act on chat; retention is enforced where the data lives.
- Hibernating objects cost nothing while idle, which keeps the free plan realistic.

**Cons**:
- Durable Objects are new infrastructure for this app.
- The mesh caps voice at about 6 people.

### Option 2: Dedicated tables and a scheduled cleanup

A `thread` table, chat stored as spec 0009 `message` rows with `kind = chat`, a cron job deleting old chat, and polling or server sent events instead of WebSockets.

**Pros**:
- No Durable Objects; everything is plain D1 and server functions the team already knows.

**Cons**:
- A second copy of submit, moderation and trust logic, and more tables, against the stated direction.
- Polling burns the free daily request allowance quickly and feels laggy; retention depends on a cron job never failing silently.
- Still needs a signalling channel for voice.

### Option 3: Pure peer to peer mesh (the "Q2Q" idea)

Text and voice go browser to browser over WebRTC data channels, with no server copy, and an optional extension keeps connections alive when tabs close.

**Pros**:
- The most decentralised, and nearly free to run.

**Cons**:
- Direct connections expose every participant's IP address to the others, the biggest safety risk for this audience.
- Moderators cannot review or remove content they never receive; retention cannot be enforced on other people's devices.
- An extension is a large barrier and leaves evidence on a device that may be searched.

### Option 4: A hosted chat and voice provider

A third party chat and audio service.

**Pros**:
- Moderation tooling and scale out of the box.

**Cons**:
- Sends conversations about a vulnerable group to a third party, against the jurisdiction stance in spec 0002, and paid tiers arrive early.

## Rationale

Option 1 keeps the parts of the peer to peer idea that are safe and drops the parts that are not. Voice still flows between browsers, which is what keeps it inside the free plan, but it is forced through Cloudflare's relay so no one learns anyone's IP address, which matters more for this audience than decentralisation does. Text goes through the community's room, because moderation (reports, removals) and retention only work when the server holds the messages, and because closed tabs then lose nothing, so no extension is needed.

Putting threads on the guide table follows the story precedent exactly and honours the minimal schema direction: the guide table already carries rich text, anonymity, a moderation state machine and trust signals, so threads cost two columns. The review rule (2 published threads and 7 days) reuses the account age idea already applied to financial asks in mutual aid.

The free plan constraint drives the rest: hibernating WebSockets instead of polling, one object per community instead of per conversation, a 6 person voice cap instead of a paid media server, and a `LiveHub` that degrades voice before chat, and never threads, when limits get close. The planned move to the Realtime SFU at 1,000 monthly active people is where paying starts to buy real capacity.

Decisions made in the spec without a separate question:
- Chat is 1 to 1000 characters with at most 20 messages per minute per person: long enough for a real answer, short enough that a flood is visible. Runner up: 2000 characters to match comments, rejected because live chat reads better short.
- `LiveHub` counts usage itself (rooms report every 60 seconds) instead of reading Cloudflare's analytics API: no extra API token, and the numbers are current. Runner up: the analytics API, rejected for delay and an extra secret.
- TURN credentials are minted per request with a 1 hour lifetime, never shipped as a static secret. Runner up: longer lived credentials, rejected because a leaked one would let anyone use the relay allowance.
- Chat display names are copied at send time so reading history needs no database call. Runner up: look names up on read, rejected for the extra requests on the free plan.
