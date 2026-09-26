# Verify: communities · spec 0010 · updated 2026-09-26
_Steps derived from spec 0010 acceptance criteria (and spec 0009 step one, which milestone 1 builds). `/check verify` runs these; `/test` locks the durable ones._

## Milestone 1: replies (spec 0009 step one)

### UI / manual
- [ ] Signed in, open `/stories/seed-story-1/details`, post a comment → it appears under Comments with your profile name and today's date → AC-8
- [ ] Click Reply on that comment, post a reply → it shows one level in, behind a thin left line; the reply has no Reply button of its own → AC-8
- [ ] Open the ⋯ menu on your own comment → only Delete shows; delete it → "This comment was removed." replaces the text and a toast confirms → AC-16
- [ ] Signed out, open the same story → the Comments heading shows "Sign in to read and join the conversation" and no comments or composer → AC-8
- [ ] As a second account, open the ⋯ menu on the first account's comment → Report and Block show, Delete does not (unless a moderator) → AC-16
- [ ] As that second account, Block the first → their comments disappear for you and stay visible to everyone else → AC-16
- [ ] As a moderator, delete someone else's comment → it shows as removed, and a `comment.remove` row lands in `moderationAction` → AC-16
- [ ] A comment section appears on a published story, guide, resource and public mutual aid post, and not on a `private` mutual aid post → AC-8
- [ ] A decoy session (duress PIN) can read comments, and posting returns an error (403) → AC-17

### Commands
- [ ] `bunx wrangler d1 execute transspace --local --command "SELECT kind, contentType, status FROM message"` after posting, replying, deleting and reporting → rows with kinds `comment` and `report`, deleted ones `removed` → AC-8, AC-16
- [ ] Post a comment on a pending guide id through the server function → 404 → AC-8
- [ ] Post a reply whose `parentId` is itself a reply → 422 → AC-8
- [ ] Post a 2001 character comment → rejected by validation → AC-8
- [ ] Report the same comment twice as the same person → one `report` row → AC-16

### Value sourcing checks
- [ ] Writer name: rename the author's display name → the comment shows the new name; mark the author deleted (`userLink.deletedAt`) → it shows "Community contributor" → AC-8
- [ ] `isMine`: the ⋯ menu offers Delete only to the writer (or a moderator) → AC-16
- [ ] Blocked ids: `userLink.blockedUserIds` holds the blocked id after Block, and only that reader's list hides them → AC-16
- [ ] Readable content: flip a guide to `rejected` → its comments stop loading (404) → AC-8

## Milestone 2: threads end to end

### UI / manual
- [x] Signed out, open `/communities`, `/communities/housing`, a thread url and `/submit-thread` → each redirects to `/auth` → AC-1, AC-19
- [x] Signed in, open `/communities` → seven communities in the fixed order, each with an icon, name, "No threads yet" or "Active ..." and a Join button → AC-1
- [ ] Join Housing → a toast confirms, Housing moves under "Your communities"; click Joined → it moves back → AC-1, AC-2
- [ ] Open `/communities/housing` → Threads and Live tabs; Live shows the "Live chat is on its way" empty state; type chips filter the list → AC-3
- [ ] From an account with fewer than 2 published threads (or younger than 7 days), start an anonymous Question in Housing → "Thanks, a moderator will read it", and it is not listed in Housing → AC-4, AC-5
- [ ] As a moderator, open `/inbox?view=threads` → the thread is listed with a count badge and nothing preselected; open it → the author shows as "Anonymous"; Publish → it appears in Housing → AC-5, AC-6
- [ ] From an established account (2 published threads, 7+ days old), start a thread → "Your thread is live" and it is listed at once → AC-5
- [x] Open a thread in Gender affirming care or Health → "This is personal experience, not medical advice" shows; a Housing thread has no such notice → AC-7
- [ ] Reply to a thread → its reply count goes up and it moves to the top of its community and the home feed → AC-8, AC-9
- [ ] Home, signed in with Housing joined → "Trending in your communities" lists Housing threads only; leave every community → threads from all communities with the join nudge; signed out → the sign in line → AC-9
- [x] Header "Communities" goes to `/communities`; the profile "Communities" row links there and lists each joined community as a link → AC-10
- [x] View source of any `/communities` page while signed in → `<meta name="robots" content="noindex, nofollow">` → AC-19
- [ ] Decoy session: `/communities` and threads read fine; Join, Post thread and reply each fail with an error (403); the joined list shows as empty → AC-17

### Commands
- [ ] `bunx wrangler d1 execute transspace --local --command "SELECT kind, category, threadType, status, lastActivityAt FROM guide WHERE kind = 'thread'"` → pending rows have null `lastActivityAt`, published rows have the publish or latest reply time → AC-5, AC-8
- [x] Call `getGuide` with a thread id → 404 (threads never leave through the public guide read) → AC-19
- [x] Call `submitThread` with slug `nope` → 422; `listThreads` with slug `nope` → 404 → AC-4, AC-3

### Value sourcing checks
- [ ] Established rule: with exactly 1 published thread the next is pending; with 2 and a 7 day old `userLink.createdAt` it publishes; with 2 and a 6 day old account it is pending → AC-5
- [x] `lastActivityAt`: approve a pending thread → equals the approval time; reply → equals the reply's `createdAt` → AC-5, AC-8
- [ ] Community `lastActivityAt` on `/communities` equals the newest published thread activity in that community → AC-1
- [ ] Author name: profile thread shows `displayName`; anonymous shows none in `listThreads`, `getThread`, `listHomeThreads` and the inbox; deleted author shows "Community contributor" → AC-6
- [ ] Blocked authors: block a thread author (from one of their replies) → their threads disappear from that reader's community list and home feed only → AC-16
- [ ] Tie order: two threads with the same `lastActivityAt` list by id, newest id first → AC-3
- [x] Clock times on thread rows show in the reader's own timezone (compare with the inbox time) → AC-3

## Milestone 3: live text chat

### UI / manual
- [ ] Open `/communities/housing?tab=live` → status shows "Live" and "Messages are deleted after 24 hours." → AC-11, AC-12
- [ ] Send a message → it appears on the right in your tab and, with your profile name, on the left for a second account in real time → AC-11
- [ ] Try 1001 characters → the box stops at 1000; send 21 messages inside a minute → the 21st shows "You're sending messages quickly" → AC-11
- [ ] With two tabs open, switch one off wifi (or use devtools offline) for a minute while the other sends 3 messages, then go back online → "Reconnecting..." then "Live", and all 3 messages appear once, in order → AC-13
- [ ] Leave a tab in the background long enough to sleep, then come back → it reconnects at once and catches up → AC-13
- [ ] `/communities` → a community with someone in its Live tab shows "1 live now"; close that tab → the count is gone within about 2 minutes → AC-1
- [ ] As a second account, use ⋯ Report on a message → "Thanks. A moderator will look at it." → AC-16
- [ ] As a second account, Block the sender → their messages vanish at once and stay hidden after a reload; the sender still sees everything → AC-16
- [ ] As a moderator, ⋯ Remove message → it disappears from every open tab and does not come back on reload → AC-16
- [ ] As a moderator, ⋯ Remove from room on another person → that person sees "A moderator removed you from this room." and their page does not reconnect by itself → AC-16
- [ ] As a moderator, change "Keep chat for" to 7 days → a toast confirms and other open tabs show the new note → AC-12
- [ ] Decoy session, open the Live tab → it never connects (status stays on connecting or reconnecting) → AC-17

### Commands
- [x] `curl -i -H "Upgrade: websocket" http://localhost:3000/api/communities/nope/room` → 404; without `Upgrade` → 426 → AC-11
- [ ] A WebSocket upgrade with an `Origin` from another site, or with no session → refused, no connection (in dev the Vite plugin drops the socket instead of showing the status) → AC-11, AC-17
- [x] `bunx wrangler d1 execute transspace --local --command "SELECT action, target FROM moderationAction WHERE action IN ('chat.remove', 'room.removePerson', 'room.retention')"` → one row per moderator action, target `slug:id` → AC-16
- [ ] `bunx wrangler d1 execute transspace --local --command "SELECT contentType, contentId, body FROM message WHERE kind = 'report' AND contentType = 'chat'"` after a report → the row holds a copy of the message text → AC-16

### Value sourcing checks
- [x] Identity: from devtools, send a `chat.send` frame that also carries a made up `authorName` and `authorUserLinkId` → the room ignores both and shows your own profile name → AC-11
- [ ] Demoted moderator: while a moderator's Live tab is open, revoke their moderator role, then try Remove message → "You can't do that here." without reconnecting → AC-16
- [ ] Retention cutoff: with retention at 24 hours, a message older than 25 hours is gone after the room's next alarm (at most an hour when the room is empty, a minute when people are in it) → AC-12
- [ ] Report after expiry: report a message, let retention delete it, then read the report row → the copied text is still there → AC-16
- [ ] Blocked list on connect: block someone from a comment on another page, then open the Live tab → their chat is hidden from the first history load → AC-16
- [ ] Rate limit survives the room sleeping: send 20 messages, wait 15 seconds, send one more → still refused until a minute has passed since the first → AC-11
- [x] Live count source: the count on `/communities` matches the number of different people (not tabs) in the room → AC-1

## Milestone 4: voice

Needs the Cloudflare Realtime TURN key: `CF_TURN_KEY_ID` and `CF_TURN_KEY_API_TOKEN` in `www/.dev.vars` (locally) or as Worker secrets.

### UI / manual
- [ ] Without the TURN key, an established member starts voice → the seat is taken, then "Voice isn't available right now." and the page leaves voice again → AC-14
- [ ] An account that is not established clicks "Start voice" → "Voice rooms can be opened by members with 2 published threads..." and no voice room opens → AC-14 (checked 2026-09-26 by script: `voice_not_allowed`)
- [ ] An established member starts voice → the browser asks for the microphone, they get a seat marked "Host", and "1 of 6" shows for everyone in the room → AC-14
- [ ] A second and third person join → all can hear and speak to each other; the seats show their names → AC-14
- [ ] In each browser, `chrome://webrtc-internals` shows only `relay` candidates, never `host` or `srflx` → AC-14
- [ ] Fill 6 seats; a 7th person sees "Voice is full (6 of 6)." and "Wait for a seat" → AC-15
- [ ] The 7th waits, then someone leaves → the 7th sees "A seat is free" with a 20 second countdown; Join takes the seat → AC-15
- [ ] Let the offer run out → it passes to the next person in line; the first drops out of the line → AC-15
- [ ] A seated person closes their laptop lid or reloads → their circle fades for up to 30 seconds; back within 30 seconds → "Rejoin voice" takes the same seat; after 30 seconds → the seat is gone → AC-15
- [ ] The host opens a seat's menu → Mute (the person's circle shows the muted mic and no one hears them) and Remove from voice ("You were removed from voice." for them) → AC-16
- [ ] A moderator ends voice → every seat clears and "Start voice" shows again → AC-16
- [ ] The host leaves → the person seated longest becomes the host; the last person leaving ends the voice room → AC-14
- [ ] Decoy session → never enters the room at all (milestone 3), so never reaches voice → AC-17

### Commands
- [x] Call `getTurnCredentials` for a room where you hold no seat → 403; without the TURN key while seated → 503 → AC-14
- [ ] With the key, the credentials response holds only `turn:` or `turns:` addresses, none on port 53, and a `ttl` of 3600 → AC-14
- [ ] `bunx wrangler d1 execute transspace --local --command "SELECT action, target FROM moderationAction WHERE action IN ('voice.remove', 'voice.end')"` after moderator actions → one row each → AC-16

### Value sourcing checks
- [ ] Established at the moment: an account turns established (second thread approved) while its Live tab is open → Start voice works without reconnecting → AC-14
- [ ] Seated check comes from the room: leave voice, then call `getTurnCredentials` again → 403 → AC-14
- [ ] Hibernation: with 3 seated and 1 waiting, leave the room idle (no messages) for several minutes, then reload any page in it → the seats, the host and the waiting order are unchanged → AC-14, AC-15
- [ ] Deadlines come from the alarm: with a seat held and no other activity, the seat still clears at 30 seconds → AC-15
- [ ] "Voice is full" count equals the seats stored in the room, held seats and the one on offer included → AC-15

## Milestone 5: free plan guard

To force a mode locally, put a tiny limit in `www/.dev.vars` (for example `LIVE_ROOM_REQUESTS_DAILY_LIMIT=4`), restart the dev server once, then connect a few times. Remove it afterwards.

### UI / manual
- [ ] Normal day → no notice in the Live tab, "Start voice" works → AC-18 (checked 2026-09-26 by script: `live.mode` `normal`)
- [ ] Past `LIVE_VOICE_PAUSE_AT` percent → the Live tab shows "Voice is paused for the rest of today...", "Start voice" is disabled, and text chat still sends normally → AC-18
- [ ] Past `LIVE_CHAT_SLOW_AT` percent → the notice says chat is slowed; a second message inside 10 seconds shows "Chat is slowed right now..." → AC-18
- [ ] While either mode is on, start a thread and reply to one → both work as usual → AC-18
- [ ] The next UTC day (or after deleting the day's row) → the first report brings the mode back to `normal` and the notice goes away → AC-18

### Commands
- [ ] While paused, call `getTurnCredentials` as a seated person → 503 "Voice is paused for today" → AC-18

### Value sourcing checks
- [ ] The mode uses the highest share of the three daily limits: push only room requests over the threshold → the mode changes even with no chat or voice → AC-18
- [ ] Voice seconds count streams: 2 people for 60 seconds add about 4 full room seconds (60 × 2 × 1 / 30); 6 people add 60 → AC-18
- [ ] Usage survives a failed report: the room's pending counts stay in its storage until a report succeeds → AC-18

### Engineer change, 2026-09-26: moderators and admins open voice
- [x] A moderator or admin whose account is not established clicks "Start voice" → a voice room opens with them as host (checked 2026-09-26 by script) → AC-14 as changed
- [ ] A regular account that is not established → still refused with the established member message → AC-14

## Acceptance criteria coverage
- AC-1, AC-2, AC-3: milestone 2 list, join and community page steps, plus the milestone 3 live count steps
- AC-4, AC-5, AC-6, AC-7: milestone 2 submit, review rule, anonymity and notice steps
- AC-8: covered by the posting, reply, readable content and value sourcing steps, plus the milestone 2 `lastActivityAt` checks
- AC-9, AC-10: milestone 2 home feed, header and profile steps
- AC-19: milestone 2 signed out redirect, `getGuide` refusal and noindex steps
- AC-16: covered by delete, report, block and moderator removal, in comments (milestone 1) and in the live room (milestone 3); and in voice (milestone 4)
- AC-17: decoy read only, comments, threads and live room parts
- AC-11, AC-12, AC-13: milestone 3 chat, retention and reconnect steps
- AC-14, AC-15: milestone 4 voice steps (audio needs the TURN key)
- AC-18: milestone 5 free plan guard steps (the paused and slowed modes need a forced limit to see)
