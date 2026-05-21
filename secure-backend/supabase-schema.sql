create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  nickname_key text not null unique,
  role text not null default 'member' check (role in ('member', 'ceo')),
  nickname_changed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 3 and 600),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  ceo_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.comments enable row level security;

create or replace function public.is_ceo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ceo'
  );
$$;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_ceo());

drop policy if exists "profiles self update safe" on public.profiles;
create policy "profiles self update safe"
on public.profiles for update
to authenticated
using (id = auth.uid() and role = 'member')
with check (id = auth.uid() and role = 'member');

drop policy if exists "approved comments public read" on public.comments;
create policy "approved comments public read"
on public.comments for select
to anon, authenticated
using (status = 'approved' or user_id = auth.uid() or public.is_ceo());

drop policy if exists "members insert pending comments" on public.comments;
create policy "members insert pending comments"
on public.comments for insert
to authenticated
with check (user_id = auth.uid() and status = 'pending' and ceo_reply is null);

drop policy if exists "members update own pending comments" on public.comments;
create policy "members update own pending comments"
on public.comments for update
to authenticated
using (user_id = auth.uid() and status = 'pending')
with check (user_id = auth.uid() and status = 'pending' and ceo_reply is null);

-- Le azioni CEO vere passano dal Cloudflare Worker con service role.
-- Non esporre mai la service role key nel frontend.

create index if not exists comments_status_created_at_idx
on public.comments (status, created_at desc);

create index if not exists profiles_nickname_key_idx
on public.profiles (nickname_key);
