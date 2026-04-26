-- ① accounts 테이블
create table if not exists public.accounts (
  id          text primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  type        text not null,
  description text,
  color       text not null default '#64748b',
  icon        text not null default 'more',
  is_active   boolean not null default true,
  is_default  boolean not null default false,
  start_date  text not null,
  end_date    text,
  created_at  text not null
);

alter table public.accounts enable row level security;

create policy "Users can manage own accounts"
  on public.accounts for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ② entries 테이블 (lines 는 JSONB 로 내장)
create table if not exists public.entries (
  id          text primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date        text not null,
  description text not null,
  lines       jsonb not null default '[]',
  created_at  text not null,
  updated_at  text not null
);

alter table public.entries enable row level security;

create policy "Users can manage own entries"
  on public.entries for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
