create table if not exists public.devices (
  id uuid primary key,
  secret_hash text not null,
  created_at timestamptz not null default now()
);

revoke all on public.devices from anon, authenticated;
grant all on public.devices to service_role;
alter table public.devices enable row level security;

drop policy if exists "anyone can create codes" on public.access_codes;
drop policy if exists "anyone can delete codes" on public.access_codes;
drop policy if exists "anyone can read codes" on public.access_codes;
drop policy if exists "anyone can redeem codes" on public.access_codes;
revoke all on public.access_codes from anon, authenticated;
grant all on public.access_codes to service_role;

drop policy if exists "guest posts insertable" on public.posts;
drop policy if exists "guest posts updatable" on public.posts;
drop policy if exists "guest posts deletable" on public.posts;

drop policy if exists "guest comments insertable" on public.post_comments;
drop policy if exists "guest comments updatable" on public.post_comments;
drop policy if exists "guest comments deletable" on public.post_comments;

drop policy if exists "guest likes insertable" on public.post_likes;
drop policy if exists "guest likes deletable" on public.post_likes;

drop policy if exists "guest profiles insertable" on public.profiles;
drop policy if exists "guest profiles updatable" on public.profiles;

revoke insert, update, delete on public.posts from anon, authenticated;
revoke insert, update, delete on public.post_comments from anon, authenticated;
revoke insert, update, delete on public.post_likes from anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;

grant select on public.posts to anon, authenticated;
grant select on public.post_comments to anon, authenticated;
grant select on public.post_likes to anon, authenticated;
grant select on public.profiles to anon, authenticated;

grant all on public.posts to service_role;
grant all on public.post_comments to service_role;
grant all on public.post_likes to service_role;
grant all on public.profiles to service_role;

drop policy if exists "chat-images anon read" on storage.objects;
drop policy if exists "chat-images anon insert" on storage.objects;
drop policy if exists "chat-images anon delete" on storage.objects;