## Community v1 — Feed core with real accounts

This turn ships a working social feed and real logins. Everything else in the big spec (reactions, follows, nested comments, PDFs, polls, groups, notifications, search, AI-on-post, moderation, voice notes) is queued for follow-up turns — we build on top of this foundation.

### 1. Remove the old chat surfaces
- Delete routes: `src/routes/community.tsx` (the realtime chat), `src/routes/dms.tsx`, `src/routes/dms.$threadId.tsx`.
- Drop tables: `community_messages`, `dm_messages`, `dm_threads` (and their trigger `tg_dm_bump_thread`).
- Keep the `chat-images` storage bucket — we reuse it for post images and rename usage to "post images". No user-visible bucket change.
- Remove the home-page "Private chats" card. Keep the "Community" card but point it at the new feed.

### 2. Real authentication (Lovable Cloud)
- Add email/password + Google sign-in.
- New `/auth` route (public, SSR on) with tabs: Sign in / Create account. Google button uses `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.
- Configure Google provider in the same turn so first sign-in doesn't error.
- Add the integration-managed `_authenticated/route.tsx` gate. Move Community, Profile, Tutor (anything that needs an identity) under `_authenticated/`.
- Home, subjects browse, versus setup stay public.
- Register `attachSupabaseAuth` in `src/start.ts` (append to `functionMiddleware`).
- Header/AppShell: show avatar + name when signed in; "Sign in" link when not. Wire sign-out (cancel queries → clear → signOut → navigate `/auth`).

### 3. Profiles keyed to `auth.uid()`
- New `public.profiles` table (drop the current localStorage-keyed one): `id uuid PK references auth.users on delete cascade`, `display_name text`, `avatar_id int`, `school text null`, `course text null`, timestamps.
- Trigger on `auth.users` insert → auto-create profile row with default avatar.
- RLS: anyone signed-in can read profiles; users update only their own.
- `useProfile()` hook rewritten to read from session user, not localStorage. Keep the same 40 career-emoji avatar set.
- `/profile` route becomes the "edit my profile" page (display name, avatar, school, course).

### 4. Community feed (v1)
- New `/_authenticated/community.tsx`: infinite-scroll feed of posts, newest first.
- Compose box at top: text (up to 2000 chars) + optional single image (camera or gallery, reusing `ImageComposer` + `uploadChatImage` renamed to `uploadPostImage`) + subject tag picker (dropdown from `src/lib/subjects.ts`).
- Post card: author avatar/name, time, subject-tag chip, body, image (tap = fullscreen), like button with count, comment button with count, delete (own posts only).
- Post detail route `/_authenticated/community.$postId.tsx`: full post + flat comment list + comment composer (text only in v1). Users delete their own comments.
- Realtime: subscribe to INSERT/DELETE on `posts` for the feed and on `post_comments` scoped to the open post.
- Infinite scroll: 20 per page, `IntersectionObserver` sentinel, cursor by `created_at`.

### 5. Schema

```text
posts
  id uuid pk
  author_id uuid → auth.users
  content text            (nullable, one of content/image required)
  image_path text         (nullable, storage key in chat-images bucket)
  subject_id text         (nullable, matches subjects.ts ids)
  like_count int default 0
  comment_count int default 0
  created_at, updated_at

post_likes
  post_id uuid → posts
  user_id uuid → auth.users
  primary key (post_id, user_id)
  created_at

post_comments
  id uuid pk
  post_id uuid → posts
  author_id uuid → auth.users
  content text
  created_at, updated_at
```

- Triggers keep `like_count` / `comment_count` in sync.
- RLS: signed-in users read all; users insert/delete only their own rows; author owns their post/comment updates.
- GRANTs to `authenticated` + `service_role` on every new table.
- Enable realtime on `posts` and `post_comments`.

### 6. What is explicitly NOT in this turn
Reactions (only 👍 like), followers/reputation/badges, nested comment replies, @mentions, PDFs, polls, study groups, notifications, search, AI-on-post, moderation queue, voice notes, read receipts, typing indicators, DMs. Each is its own follow-up turn once the foundation is in.

### Technical notes
- All queries via TanStack Query + `useSuspenseQuery` in a loader-primed pattern; feed uses `useInfiniteQuery`.
- Server writes go through `createServerFn` with `requireSupabaseAuth` where useful; simple reads/writes can go through the browser Supabase client since RLS gates them.
- Types regenerate after the migration; feed code lands after that.

Approve and I'll execute in this order: migration → configure Google → delete old chat files → auth route + gate → profiles rewrite → feed + post detail → home card cleanup.
