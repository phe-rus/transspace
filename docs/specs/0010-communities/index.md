# 0010. Communities: topic spaces with threads, live chat and voice

**Date**: 2026-09-26
**Status**: In Progress

## Summary

Communities are a fixed set of topic spaces (the story topics plus a General lounge) where signed in people start threads, reply, chat live and talk in small voice rooms. Threads are rows in the existing guide table, replies are the comments from spec 0009, and each community's live chat and voice run in one Cloudflare Durable Object (a small always available server object per community). Everything runs on the free Cloudflare account until about 1,000 monthly active people, and no one ever sees another person's IP address (the network address that can reveal where someone is).

## Requirements

**User stories**:
- As a trans person starting hormones, I want to ask a question in the Gender affirming care community and get replies from people who have been there.
- As someone moving country, I want to join a live chat or a small voice circle with people in the same situation.
- As a person at risk, I want to post anonymously, block someone, or report a message, and I want my location never to leak.
- As a moderator, I want new accounts' threads to reach me first, and I want to remove harmful messages and people from live rooms.

**Acceptance criteria**:
- **AC-1**: `/communities` lists the fixed communities (Gender affirming care, Moving country, Housing, Work, Health, Family, General lounge) as a messages style list: icon, name, last activity time, a "live now" count when people are in the room, and a Join toggle. Joined communities come first, then the rest, each group in the fixed order of `data/communities.ts`. Signed in only: a signed out visitor is sent to sign in.
- **AC-2**: Join and leave toggle the community in the person's joined list. Joining changes only what feeds show, never what a person may read or post.
- **AC-3**: A community page has two tabs, Threads and Live. Threads lists that community's published threads, newest activity first (ties by id), filterable by thread type (Question, How to, Dos and donts, Planning, Experience), paginated.
- **AC-4**: A signed in person (not a decoy session) can start a thread in a community with a title, a short summary, a thread type, an identity choice (profile name or anonymous) and a rich text body, with the same editor, checks and limits as stories.
- **AC-5**: A new thread publishes immediately when its author has at least 2 published threads and an account at least 7 days old. Otherwise it waits as pending in the moderator inbox, where a moderator approves or rejects it exactly as with stories.
- **AC-6**: An anonymous thread never returns its author's name from any read, to anyone.
- **AC-7**: Every thread in a health community (Gender affirming care, Health) shows the notice "This is personal experience, not medical advice".
- **AC-8**: People reply to a published thread with the comments from spec 0009 (plain text, one level of replies, delete, report, block). Every visible reply moves the thread's last activity time to the reply's time.
- **AC-9**: The home page section "Trending in your communities" shows the most recently active threads from the communities the person joined. With no joined communities it shows the most recently active threads across all communities, with a nudge to join.
- **AC-10**: The header link "Communities" goes to `/communities`. The profile row "Communities" is enabled and lists the joined communities, linking to each.
- **AC-11**: The Live tab connects to the community's room and shows the text chat in real time. Messages show the sender's pseudonymous profile name, never anonymous. A message is 1 to 1000 characters of plain text. A person can send at most 20 messages per minute in a room.
- **AC-12**: Chat is kept for the community's retention period, 24 hours by default. A moderator can set it to 24 hours, 7 days or 30 days per community. Messages older than the period are deleted from the room's storage, not hidden.
- **AC-13**: When the connection drops or the tab sleeps, the page reconnects on its own with a growing delay, then loads the messages it missed since the last one it saw.
- **AC-14**: An established member (the AC-5 rule) can open a voice room in a community. Up to 6 people join and all can speak. Audio travels browser to browser, always forced through the TURN relay (a relay server that forwards audio so browsers never connect directly), so no participant ever learns another participant's IP address. Nothing is recorded.
- **AC-15**: When voice is full, a 7th person stays in the text chat and sees "Voice is full (6 of 6)". When a seat frees, the first person waiting gets a prompt to join, which stays open for 20 seconds before passing to the next person waiting. A person whose connection drops keeps their seat for 30 seconds.
- **AC-16**: Anyone in a room can report a chat message (the report keeps a copy of its text for moderators) and block a person. A blocked person's chat, replies and threads are hidden from the person who blocked them, including in thread lists and the home feed. Moderators can remove a chat message for everyone, remove a person from a room, and end any voice room. A voice room's host can mute or remove people in that voice room.
- **AC-17**: A decoy session (the app lock duress PIN) can read communities and threads, and cannot join, post, reply, report, or enter a live room.
- **AC-18**: The whole feature runs on the Cloudflare Workers Free plan. When daily usage nears the free limits, new voice rooms pause first, then chat sending slows to one message per 10 seconds per person. Threads and replies are never limited by this. Each state shows a short notice.
- **AC-19**: Every page under `/communities` and every thread is marked `noindex` and never rendered for signed out visitors.

## Decision

**Chosen option**: Option 1: Threads on the guide table, one Durable Object room per community

Threads reuse the guide table (`kind = thread`), replies reuse spec 0009's comments, and each community gets one hibernating Durable Object that runs its text chat and voice signalling, with voice as a relayed browser mesh.

**Implementation skills**: `cloudflare` (`.claude/skills/cloudflare/`, Durable Objects, WebSocket hibernation, Realtime TURN and Workers config) · `tanstack-start` (`.claude/skills/tanstack-start/`, server functions and routes) · `shadcn` (`.claude/skills/shadcn/`, the shared UI primitives)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

| Entity | Where | Key | Fields (new in **bold**) | Relationships |
|---|---|---|---|---|
| Community | `data/communities.ts`, code only | `slug` | `slug`, `icon`, label message key, `isHealth` | 1 community to many threads via `guide.category` |
| Thread | `guide`, `kind = "thread"` | `id` | `title`, `excerpt`, `bodyContent`, `category` (community slug), `authorVisibility` (required for threads), `status` (pending, published, rejected), `submittedBy`, **`threadType`** (nullable text, required when `kind = thread`), **`lastActivityAt`** (nullable `timestamp_ms`, required when a thread is published) | many to 1 `userLink` |
| Reply | `message` (spec 0009), `kind = "comment"` | `id` | `contentType = "guide"`, `contentId` (thread id), `authorUserLinkId`, `parentId`, `body`, `status`, `createdAt` | many to 1 thread, many to 1 `userLink` |
| Chat report | `message`, `kind = "report"` | `id` | `contentType = "chat"`, `contentId` (`<slug>:<chatMessageId>`), `authorUserLinkId` (the reporter), `toUserLinkId` (the reported person), `body` (a copy of the reported text), `createdAt` | many to 1 `userLink` twice |
| Person | `userLink` | `id` | **`joinedCommunities`** (nullable text, JSON array of slugs), `blockedUserIds` (spec 0009) | |
| Community room | Durable Object `CommunityRoom`, one per slug, SQLite storage | slug | `settings.retentionHours` (24, 168 or 720, default 24); chat rows: `id`, `authorUserLinkId`, `authorName`, `body`, `status` (visible, removed), `createdAt`; voice state, persisted in the same storage so it survives hibernation (the object sleeping between events, which clears memory): `hostUserLinkId`, `seats` (up to 6, each with `heldUntil` when dropped), `waiting` (ordered), `offer` (`userLinkId`, `expiresAt`) | 1 per community |
| Live hub | Durable Object `LiveHub`, a single instance, SQLite storage | `"global"` | per UTC day: `chatMessages`, `voiceSeconds`, `roomRequests`; per slug: `liveCount`, `updatedAt` | reported to by every room |

New index: `guide_thread_idx` on (`kind`, `category`, `status`, `lastActivityAt`). One migration adds `guide.threadType`, `guide.lastActivityAt`, `userLink.joinedCommunities` and the index. Spec 0009 step one adds `message` and `userLink.blockedUserIds`.

`data/communities.ts` holds: `gender-affirming-care` (health), `moving-country`, `housing`, `work`, `health` (health), `family`, `general`. `THREAD_TYPES` holds `question`, `how-to`, `dos-and-donts`, `planning`, `experience`.

**State transitions**:
- Thread: `pending → published` (moderator approves, or automatic for an established author) · `pending → rejected` · `published → rejected` (moderator takedown). Same machine as guides and stories.
- Chat message: `visible → removed` (moderator), then deleted by the retention timer either way.
- Voice seat: `waiting → seated → left`, with `seated → held` for 30 seconds after a drop, then `held → left` or `held → seated` on reconnect.
- Live mode (from `LiveHub`): `normal → voicePaused → chatSlowed`, and back to `normal` at the start of the next UTC day.

**API surface** (server functions unless marked; all signed in; writes need a non decoy session, Turnstile and the write rate limit, as spec 0009):

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `listCommunities` | GET | none | per community: slug, joined, lastActivityAt, liveCount | signed in | 401 |
| `setCommunityJoined` | POST | `slug`, `joined: boolean` | joined list | signed in, not decoy | 422 unknown slug |
| `listThreads` | GET | `slug`, `threadType?`, `cursor?` | threads (title, excerpt, type, author name or null, replyCount, lastActivityAt), `nextCursor` | signed in | 404 unknown slug |
| `getThread` | GET | `id` | thread with body, author name or null, `isHealth` | signed in | 404 not published or not a thread |
| `submitThread` (extends `submitGuide`) | POST | `slug`, `title`, `excerpt`, `threadType`, `authorVisibility`, `bodyContent`, `turnstileToken` | id, status (published or pending) | signed in, not decoy | 422, 429 |
| `listHomeThreads` | GET | none | up to 5 threads, `fromJoined: boolean` | signed in | none |
| spec 0009 comment endpoints | | `contentType = "guide"`, `contentId` | | as spec 0009 | as spec 0009 |
| `/api/communities/$slug/room` (route) | GET, WebSocket upgrade | session cookie | a WebSocket to the room | signed in, not decoy | 401, 403 decoy, 404 slug |
| `getTurnCredentials` | POST | `slug` | `iceServers` (TURN only), `ttl` | signed in, not decoy, seated in that room's voice | 403, 503 voice paused |
| `setRoomRetention` | POST | `slug`, `hours` (24, 168, 720) | hours | moderator | 403, 422 |

WebSocket messages (JSON, `type` field). Client to room: `chat.send {body}`, `chat.history {sinceId}`, `chat.remove {id}` (moderator), `chat.report {id, reason?}`, `voice.open`, `voice.join`, `voice.leave`, `voice.signal {to, sdp or candidate}`, `voice.mute {userLinkId}` (host), `voice.remove {userLinkId}` (host or moderator), `voice.end` (moderator), `room.removePerson {userLinkId}` (moderator). Room to client: `chat.message`, `chat.removed`, `chat.history`, `voice.state {seats, waiting, hostUserLinkId}`, `voice.signal`, `voice.seatFree`, `live.mode {mode}`, `error {code}`.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `listCommunities` | name, icon, isHealth | `data/communities.ts` and the label message key |
| `listCommunities` | joined | `userLink.joinedCommunities` of the session's `userLinkId` |
| `listCommunities` | lastActivityAt | `max(guide.lastActivityAt)` grouped by `category` where `kind = thread` and `status = published`, one query |
| `listCommunities` | liveCount | `LiveHub` per slug `liveCount`, one call for all slugs, at most 60 seconds old |
| `submitThread` | status | derived: `published` if count of the author's `guide` rows with `kind = thread` and `status = published` is at least 2 and `userLink.createdAt` is at least 7 days before now, else `pending` |
| `submitThread` | lastActivityAt | the publish time: `now` when published at submit, the approval time when a moderator approves |
| thread and reply reads | author name | `userLink.displayName` for profile threads, `null` for anonymous threads, the generic deleted name when `userLink.deletedAt` is set |
| reply post (spec 0009) | thread `lastActivityAt` | the new reply's `createdAt`, written in the same batch as the reply |
| `listHomeThreads` | fromJoined, threads | `userLink.joinedCommunities`; empty list means all communities |
| room connect | userLinkId, displayName, blockedUserIds | the worker route reads the session and `userLink` (named columns only) and passes them to the room in headers it sets itself, kept per socket with `serializeAttachment` so they survive hibernation; the room never trusts identity sent by the browser |
| every privileged room action (`chat.remove`, `room.removePerson`, `voice.end`, `voice.open`) | isModerator, isEstablished | read again from D1 (`userLink` moderator columns, the AC-5 rule) at the moment of the action, never from connect time, so a demoted moderator loses powers at once |
| `chat.send` | authorName | the `displayName` passed at connect time, stored with the message so later reads need no database call |
| `chat.send` | createdAt, id | the room's clock and a random id |
| chat delivery | hidden from blocker | the connection's `blockedUserIds` from connect time, refreshed on reconnect |
| retention timer | cutoff | `now - settings.retentionHours`, run by a Durable Object alarm (a timer the object schedules for itself) every hour |
| `chat.report` | copied text, reported person | the room's stored row for that id, inserted by the room itself as a `message` row with `kind = report`, through the D1 binding (Durable Object classes in this worker receive the same `env`, including `D1`) and the shared insert helper from the messages domain |
| `voice.open` | allowed | `isEstablished` read from D1 at that moment, and `LiveHub` mode is not `voicePaused` or later |
| `getTurnCredentials` | seated check | a call to the room's Durable Object stub asking whether the caller holds a seat, never D1 |
| seat hold and seat offer | expiry | `heldUntil` (drop time + 30 seconds) and `offer.expiresAt` (offer time + 20 seconds) in room storage, enforced by the room's alarm, never an in memory timer |
| `getTurnCredentials` | iceServers, ttl | minted per request from the Cloudflare Realtime TURN API with `CF_TURN_KEY_ID` and `CF_TURN_KEY_API_TOKEN`, time to live 1 hour; the client sets `iceTransportPolicy: "relay"` |
| live mode | normal, voicePaused, chatSlowed | `LiveHub` daily counters as a percent of `LIVE_VOICE_SECONDS_DAILY_LIMIT`, `LIVE_CHAT_MESSAGES_DAILY_LIMIT` and `LIVE_ROOM_REQUESTS_DAILY_LIMIT` (whichever is highest), compared with `LIVE_VOICE_PAUSE_AT` and `LIVE_CHAT_SLOW_AT`; rooms report their counts every 60 seconds |
| reply post (spec 0009) | whether to touch the thread | the comment handler looks up `guide.kind` for `contentId`; only when it is `thread` does the same `db.batch` also set `lastActivityAt` |
| thread lists and home feed | hidden authors | the caller's `userLink.blockedUserIds`, filtered in the query |
| `listCommunities`, `listThreads` | tie order | the fixed order of `data/communities.ts`; thread `id` after `lastActivityAt` |
| "Voice is full" | seats used | the room's in memory `seats` length out of 6 |

**Key invariants**:
- A thread always has a `threadType`, an `authorVisibility` and a slug from `data/communities.ts`. A guide or story never has a `threadType`.
- An anonymous thread's author name is `null` in every read, including moderator lists shown outside the moderation screen.
- The browser never gets a TURN configuration that allows a direct connection: `iceServers` holds TURN entries only and the client forces relay.
- Chat older than the retention period does not exist in storage after the next alarm run.
- A removed chat message is never sent again, only its `chat.removed` marker.
- The room trusts only identity headers set by the worker route. A request reaching the Durable Object any other way is refused.
- Voice never has more than 6 seats. Only established members open a voice room.
- Room state that must outlive a single event (voice seats, holds, the seat offer, retention settings) lives in the room's storage, never only in memory, and every deadline runs on the room's alarm.
- Moderator and established status are checked against D1 at the moment of each privileged action.
- Nothing about communities is ever returned to a signed out request.

**Security model**:
- Signed in only for everything, `noindex` on every page. Decoy sessions read only (spec 0001 AC-6 rule).
- Writes (threads, replies, joins, reports) need Turnstile and the write rate limit. Chat is rate limited inside the room (20 per minute, 1 per 10 seconds when slowed).
- Moderators (`userLink` moderator columns, spec 0008) review pending threads, remove chat, remove people, end voice rooms, set retention. A voice host's powers stop at their own voice room.
- IP addresses: the relay only design means participants never see each other's addresses. The worker and Durable Object never store IP addresses.
- No recording of voice, and chat is kept 24 hours by default. Reported messages are the only chat kept beyond retention, as `message` report rows.
- Public reads select named `userLink` columns only (spec 0008 AC-5).

**Configuration required**:
- `CF_TURN_KEY_ID`: the Cloudflare Realtime TURN key id (created in the Cloudflare dashboard, free allowance).
- `CF_TURN_KEY_API_TOKEN`: the TURN key's API token, a Worker secret, used only to mint short lived credentials.
- `LIVE_VOICE_PAUSE_AT`: percent of the daily free allowance at which new voice rooms pause (default `70`).
- `LIVE_CHAT_SLOW_AT`: percent at which chat slows (default `90`).
- `LIVE_VOICE_SECONDS_DAILY_LIMIT`: relayed voice seconds per day that 100% means, set from the free TURN allowance. Planning estimate: a full 6 person room relays about 1 megabit per second (each person sends and receives 5 streams of about 32 kilobits), about 0.45 GB per hour, so divide the daily free allowance in GB by 0.45 and multiply by 3600 per room hour.
- `LIVE_CHAT_MESSAGES_DAILY_LIMIT`: chat messages per day that 100% means, set from the free plan's daily request and Durable Object allowances.
- `LIVE_ROOM_REQUESTS_DAILY_LIMIT`: room requests per day (connects, history loads, reports) that 100% means, so a reconnect storm is caught even when messages and voice are low.
- `wrangler.jsonc`: `durable_objects.bindings` for `COMMUNITY_ROOM` (class `CommunityRoom`) and `LIVE_HUB` (class `LiveHub`), and a `migrations` entry with `new_sqlite_classes: ["CommunityRoom", "LiveHub"]` (SQLite backed classes are the kind the free plan allows). `server.ts` exports both classes.

**Critical test scenarios**:
- Happy path: an established member starts a How to in Gender affirming care, it publishes at once with the experience notice, another person replies and the thread moves to the top of the list and the home feed, verifies **AC-3**, **AC-5**, **AC-7**, **AC-8**, **AC-9**.
- Review rule: a 3 day old account's thread lands as pending in the moderator inbox and is not listed until approved, verifies **AC-5**.
- Anonymity: an anonymous thread returns no author name from `listThreads`, `getThread` and `listHomeThreads`, verifies **AC-6**.
- Live chat: two tabs exchange messages, one drops for a minute and catches up with every missed message on reconnect, verifies **AC-11**, **AC-13**.
- Retention: with retention at 24 hours, a message stored 25 hours ago is gone after the alarm runs, verifies **AC-12**.
- Voice relay: the client's peer connection reports only relay candidates, and a 7th joiner sees the full notice and gets the seat prompt when someone leaves, verifies **AC-14**, **AC-15**.
- Report after expiry: a reported chat message is still readable by a moderator after the room deleted the original, verifies **AC-16**.
- Demoted moderator: a moderator connected to a room loses moderator status, and their next `chat.remove` is refused without reconnecting, verifies **AC-16**.
- Hibernation: a room sleeps with 3 seated people and one waiting; on the next event the seats and the waiting order are intact, verifies **AC-14**, **AC-15**.
- Decoy: a decoy session gets 403 on the room upgrade and on `submitThread`, and can still read a thread, verifies **AC-17**.
- Free plan: with `LiveHub` counters past `LIVE_VOICE_PAUSE_AT`, `voice.open` and `getTurnCredentials` refuse with the paused notice while threads still post, verifies **AC-18**.
- Signed out: every communities route redirects to sign in and sends `noindex`, verifies **AC-1**, **AC-19**.

## Build plan

Tracer Bullet: each slice works end to end before the next begins.

Slice 1, replies (spec 0009 step one):
1. [x] Build spec 0009 step one as written there (`message` table, `userLink.blockedUserIds`, comment domain, comment section), satisfies **AC-8**, **AC-16**.

Slice 2, threads end to end:
2. [x] Migration: `guide.threadType`, `guide.lastActivityAt`, `userLink.joinedCommunities`, `guide_thread_idx`, satisfies **AC-3**, **AC-4**, **AC-2**.
3. [x] `data/communities.ts` and `THREAD_TYPES`, with labels in four languages, satisfies **AC-1**, **AC-3**, **AC-7**.
4. [x] Extend the guide domain for `kind = thread`: `submitThread` with the established author rule, `listThreads`, `getThread`, anonymous name handling, blocked author filtering in lists and the home feed, moderator approval setting `lastActivityAt`, and the conditional in spec 0009's comment post handler that updates `lastActivityAt` for threads in the same batch, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-8**, **AC-17**.
5. [x] Routes `communities/{route.tsx,index.tsx}`, `communities/$slug/{route.tsx,index.tsx}` (Threads tab, Live tab placeholder), `communities/$slug/threads/$threadId/{route.tsx,index.tsx}`, `submit-thread/{route.tsx,index.tsx}`, all signed in guarded and `noindex`, built from the existing list and inbox patterns (no cards), satisfies **AC-1**, **AC-3**, **AC-4**, **AC-7**, **AC-19**.
6. [x] `listCommunities` (without live counts yet), `setCommunityJoined`, `listHomeThreads`; wire the header link, the profile row and the home section, satisfies **AC-1**, **AC-2**, **AC-9**, **AC-10**.

Slice 3, live text chat:
7. [x] `CommunityRoom` and `LiveHub` Durable Objects (state in SQLite storage, deadlines on alarms, D1 through the shared `env`), `wrangler.jsonc` bindings and migration, exports in `server.ts`, satisfies **AC-11**, **AC-18**.
8. [x] The room route: session check, decoy refusal, identity headers, WebSocket hibernation, satisfies **AC-11**, **AC-17**.
9. [x] Chat: send, history since id, rate limit, retention alarm, `setRoomRetention`, satisfies **AC-11**, **AC-12**.
10. [x] Moderation in chat: remove message, remove person (roles read from D1 per action), report (the room inserts the copy into `message` through D1), block filtering, satisfies **AC-16**.
11. [x] The Live tab UI with reconnect and catch up, and live counts in `listCommunities` from `LiveHub`, satisfies **AC-1**, **AC-13**.

Slice 4, voice:
12. `getTurnCredentials` and the TURN key secrets, satisfies **AC-14**.
13. [x] Voice signalling in the room: open, join, persisted seats, waiting order, 30 second hold and 20 second seat offer on alarms, host mute and remove, moderator end, satisfies **AC-14**, **AC-15**, **AC-16**.
14. [x] The voice bar UI: relay only peer connections for up to 6 people, the full notice and seat prompt, satisfies **AC-14**, **AC-15**.

Slice 5, free plan guard:
15. [x] `LiveHub` daily counters (chat messages, voice seconds, room requests) with the three daily limit settings, the live mode, and the notices for paused voice and slowed chat, satisfies **AC-18**.

Each slice adds its copy in en, de, fr and zh.

## Consequences

**Positive**:
- One new table (already planned in spec 0009), four columns, no new schema file.
- Threads get moderation, anonymity, rich text and trust signals for free from the guide and story work.
- No IP address is ever exposed between people, and chat is short lived by default.
- Runs on the free plan, with a planned, measured point to move to paid.

**Negative / tradeoffs**:
- Voice tops out at 6 people, and a full room relays about 0.45 GB per hour through the free TURN allowance, until the move to the Cloudflare Realtime SFU (a media server that forwards audio, allowing many listeners) planned at 1,000 monthly active people.
- The guide table now serves three kinds, so every guide read must keep filtering by `kind`.
- Live rooms add the first stateful infrastructure (Durable Objects) to the app, which is new to operate and to test locally.
- Adding a community needs a code change and deploy.
- Chat display names are copied at send time, so a renamed or deleted person's old chat keeps the old name until retention removes it (at most 30 days).
- The free plan counters are estimates reported every 60 seconds, so a sudden spike can briefly pass a threshold before the mode changes.

**Neutral**:
- Local development needs the Durable Object bindings in the local Wrangler setup.
- The moderator inbox gains thread approvals and chat reports as new item kinds.

## Follow-up

- [ ] Move voice to the Cloudflare Realtime SFU, and plan the paid plan, when monthly active people reach 1,000 (new spec).
- [ ] Check Cloudflare's current free plan limits (Durable Objects, requests per day, TURN data) against the thresholds before slice 3 ships; the numbers in this spec are from knowledge, not a live check.
- [ ] Safety places (scope feature 22) can later link a place to a community thread.
- [ ] Reply notifications (an installable web app with push) are out of scope here.
- [ ] Add a root `AGENTS.md` (none exists) so the `cloudflare`, `tanstack-start` and `shadcn` skill pointers are recorded for every future build.
