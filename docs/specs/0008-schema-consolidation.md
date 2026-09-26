# 0008. Schema consolidation: one person table

**Date**: 2026-09-26
**Status**: In Progress

## Summary

A person is currently spread across five tables: `userLink`, `profile`, `appLock`, `moderators` and `admins`. This folds the last four into `userLink` as plain columns, so a person is one row. It removes four tables and three schema files, and no foreign key changes, because every other table already points at `userLink`.

## Context

You asked for as few tables and schema files as possible, and pointed at the split between an auth table and a profile table as the example. The four tables being folded are all one row per person: the pseudonymous profile, the app lock PIN state, the moderator flag with its country tag, and the admin role. Nothing needs to be queried across many rows of them.

The Better Auth `user` table is not the right home. It is the login library's own table, and spec 0002 keeps app data on `userLink` on purpose: a future change of identity provider should touch one table, and the pseudonymous profile must never sit next to identity data. The auth `user` row in this app is already anonymised by the auth hooks (a random address and a fixed name), but keeping the app's person data on `userLink` keeps that boundary by construction, not by hooks.

Decision defaults, since no questions were asked this round: fold into `userLink`, keep `trustSignal`, `trustCoSign`, `moderationAction`, `country` and `guide_series` as they are (each has its own rows), and migrate data inside one migration that copies before it drops.

## Requirements

**Acceptance criteria**:
- **AC-1**: `userLink` holds the profile fields (display name, avatar, bio, pronouns, topics, age range), the app lock fields (PIN hash, duress PIN hash, failed attempts, locked until), the moderator fields (granted at, granted by, country tag) and the admin fields (role, granted by, granted at).
- **AC-2**: The tables `profile`, `appLock`, `moderators` and `admins` no longer exist, and the schema files `profile.ts` and `app-lock.ts` are gone.
- **AC-3**: Every existing person keeps their profile, PIN state, moderator status and admin role after the migration. The migration copies before it drops.
- **AC-4**: Behavior is unchanged: onboarding, app lock and duress, the moderator floor of two, the founder rules and the admin actions all work as before.
- **AC-5**: A public read never returns a PIN hash, a role grant or any other private column. Public reads select named columns only.
- **AC-6**: A deleted account still clears the profile and PIN fields and removes moderator status.

## Options considered

### Option 1: Fold into userLink (chosen)

**Pros**: four fewer tables, no foreign key changes, keeps the identity separation from spec 0002.
**Cons**: `userLink` gets wider, so every read must select named columns.

### Option 2: Fold into the auth `user` table

**Pros**: one fewer table again (`userLink` too).
**Cons**: every foreign key in every table would have to be rebuilt to point at a different table, on live data. It also puts pseudonymous data beside the login table, against spec 0002.

### Option 3: Leave as is

**Pros**: no risk.
**Cons**: does not meet the stated direction.

## Decision

**Chosen option**: Option 1: Fold into userLink

## Rationale

The four tables are one row per person with no cross person queries, so columns fit exactly. Keeping `userLink` as the person table means no foreign key changes, which is the part of Option 2 that carries the real risk. The private data is kept safe by selecting named columns, which the existing code already does.

## Feature design

**Data model sketch** (new nullable columns on `userLink`, no new table):
- Profile: `displayName`, `avatarSlug`, `bio`, `pronouns`, `topics` (JSON text), `ageRange`. The old `profile.deletedAt` is replaced by the existing `userLink.deletedAt`, since both were set together on account deletion.
- App lock: `pinHash`, `duressPinHash`, `failedAttempts` (integer, default 0, not null), `lockedUntil`.
- Moderator: `moderatorGrantedAt` (a value means the person is a moderator), `moderatorGrantedBy`, `moderatorCountryCode`.
- Admin: `adminRole` (`admin` or `super_admin`), `adminGrantedBy`, `adminGrantedAt`. The founder is a person with an `adminRole` and no `adminGrantedBy`.
- The grant columns are plain text with no foreign key, like `bannedBy`, so a removed grantor never blocks a row.

**Migration plan**:
**Strategy**: one migration, additive first, copy, then drop.
1. Add the columns to `userLink`.
2. Copy each old table into the columns for people who have a row.
3. Drop `profile`, `appLock`, `moderators` and `admins`.
**Rollback**: restore from the database backup taken before applying to the remote. Locally, re-create from the earlier migration files.
**Risks**: a mistaken copy loses data. Mitigated by copying before dropping and applying locally first, checking counts before and after.

**Key invariants**:
- A person is a moderator when `moderatorGrantedAt` is set, or when they hold an admin role.
- The moderator floor of two counts people with `moderatorGrantedAt` set, as it counted `moderators` rows before.
- The founder can never be demoted or removed, as before.

**Security model**: unchanged. Public reads must name their columns, so the PIN hashes and role columns never leave the server.

## Build plan

1. Add the columns to `userLink` and remove the four tables and two schema files, satisfies **AC-1**, **AC-2**.
2. Move the role helpers and the moderator and admin functions onto `userLink`, satisfies **AC-4**.
3. Move profile, auth gate, account deletion, app lock and the sign in hook onto `userLink`, satisfies **AC-4**, **AC-6**.
4. Point the guide, story and support joins at `userLink`, satisfies **AC-4**, **AC-5**.
5. Generate the migration, add the copy statements before the drops, and apply it locally, satisfies **AC-3**.

## Consequences

**Positive**: four fewer tables and three fewer schema files, one place per person.

**Negative / tradeoffs**: a wider `userLink`; the copy step must be right the first time on the remote.

## Follow-up

- [ ] Take a backup before applying this to the remote database, and compare row counts before and after.
- [ ] Open question: whether to merge `userLink` into the auth `user` later. It would need every foreign key rebuilt and is not part of this change.
- [ ] `trustSignal` could fold into columns on the content tables later. It is left alone here because guides, resources and posts all use it.
