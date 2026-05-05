-- ================================================================
-- Migration 001: Shared Books
-- 기존 accounts/entries에 book_id 추가 + 신규 테이블 생성
-- Supabase SQL Editor에서 실행하세요.
-- ================================================================

-- ① books 테이블
create table if not exists public.books (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '가계부',
  created_at timestamptz not null default now()
);

alter table public.books enable row level security;

-- ② book_members 테이블
create table if not exists public.book_members (
  book_id   uuid references public.books(id) on delete cascade not null,
  user_id   uuid references auth.users(id) on delete cascade not null,
  role      text not null default 'owner', -- 'owner' | 'member'
  joined_at timestamptz not null default now(),
  primary key (book_id, user_id)
);

alter table public.book_members enable row level security;

-- ③ invitations 테이블
create table if not exists public.invitations (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid references public.books(id) on delete cascade not null,
  from_user_id uuid references auth.users(id) on delete cascade not null,
  to_email     text not null,
  status       text not null default 'pending', -- 'pending' | 'accepted' | 'rejected'
  created_at   timestamptz not null default now()
);

alter table public.invitations enable row level security;

-- ④ notifications 테이블
-- type: 'invite' | 'invite_accepted' | 'account_merge' | 'unshare_request' | 'entry_review'
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  type       text not null,
  payload    jsonb not null default '{}',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- ⑤ unshare_requests 테이블
create table if not exists public.unshare_requests (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid references public.books(id) on delete cascade not null,
  requested_by uuid references auth.users(id) on delete cascade not null,
  created_at   timestamptz not null default now()
);

alter table public.unshare_requests enable row level security;

-- ⑥ unshare_approvals 테이블
create table if not exists public.unshare_approvals (
  request_id  uuid references public.unshare_requests(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  approved_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

alter table public.unshare_approvals enable row level security;

-- ================================================================
-- 기존 테이블에 book_id 컬럼 추가
-- ================================================================

alter table public.accounts add column if not exists book_id uuid references public.books(id) on delete cascade;
alter table public.entries  add column if not exists book_id uuid references public.books(id) on delete cascade;

-- ================================================================
-- 기존 데이터 마이그레이션: 각 user에게 개인 book 생성
-- ================================================================

do $$
declare
  rec          record;
  new_book_id  uuid;
begin
  for rec in
    select distinct user_id from (
      select user_id from public.accounts
      union
      select user_id from public.entries
    ) u
    where user_id not in (select user_id from public.book_members)
  loop
    insert into public.books (name, created_at)
    values ('가계부', now())
    returning id into new_book_id;

    insert into public.book_members (book_id, user_id, role)
    values (new_book_id, rec.user_id, 'owner');

    update public.accounts set book_id = new_book_id where user_id = rec.user_id and book_id is null;
    update public.entries  set book_id = new_book_id where user_id = rec.user_id and book_id is null;
  end loop;
end $$;

-- book_id NOT NULL 강제 (마이그레이션 완료 후)
alter table public.accounts alter column book_id set not null;
alter table public.entries  alter column book_id set not null;

-- ================================================================
-- Helper function: book 멤버 여부 확인 (RLS recursion 방지)
-- ================================================================

create or replace function public.is_book_member(p_book_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.book_members
    where book_id = p_book_id
      and user_id = auth.uid()
  );
$$;

-- ================================================================
-- RLS 정책 재작성
-- ================================================================

-- accounts
drop policy if exists "Users can manage own accounts" on public.accounts;

create policy "accounts_select" on public.accounts for select to authenticated
  using (public.is_book_member(book_id));

create policy "accounts_insert" on public.accounts for insert to authenticated
  with check (public.is_book_member(book_id));

create policy "accounts_update" on public.accounts for update to authenticated
  using (public.is_book_member(book_id));

create policy "accounts_delete" on public.accounts for delete to authenticated
  using (public.is_book_member(book_id));

-- entries: 읽기/쓰기는 멤버 전체, 수정/삭제는 작성자만
drop policy if exists "Users can manage own entries" on public.entries;

create policy "entries_select" on public.entries for select to authenticated
  using (public.is_book_member(book_id));

create policy "entries_insert" on public.entries for insert to authenticated
  with check (user_id = auth.uid() and public.is_book_member(book_id));

create policy "entries_update" on public.entries for update to authenticated
  using (user_id = auth.uid());

create policy "entries_delete" on public.entries for delete to authenticated
  using (user_id = auth.uid());

-- books
create policy "books_select" on public.books for select to authenticated
  using (public.is_book_member(id));

create policy "books_insert" on public.books for insert to authenticated
  with check (true);

create policy "books_update" on public.books for update to authenticated
  using (
    exists (
      select 1 from public.book_members
      where book_id = books.id and user_id = auth.uid() and role = 'owner'
    )
  );

-- book_members: 본인 행만 읽기, 삽입은 누구나(초대 수락 처리), 삭제는 본인만
create policy "book_members_select" on public.book_members for select to authenticated
  using (user_id = auth.uid());

create policy "book_members_insert" on public.book_members for insert to authenticated
  with check (true);

create policy "book_members_delete" on public.book_members for delete to authenticated
  using (user_id = auth.uid());

-- invitations
create policy "invitations_select" on public.invitations for select to authenticated
  using (from_user_id = auth.uid() or to_email = auth.email());

create policy "invitations_insert" on public.invitations for insert to authenticated
  with check (from_user_id = auth.uid());

create policy "invitations_update" on public.invitations for update to authenticated
  using (from_user_id = auth.uid() or to_email = auth.email());

-- notifications: 본인 알림만
create policy "notifications_select" on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "notifications_insert" on public.notifications for insert to authenticated
  with check (true);

create policy "notifications_update" on public.notifications for update to authenticated
  using (user_id = auth.uid());

-- unshare_requests: 같은 book 멤버만
create policy "unshare_requests_select" on public.unshare_requests for select to authenticated
  using (public.is_book_member(book_id));

create policy "unshare_requests_insert" on public.unshare_requests for insert to authenticated
  with check (requested_by = auth.uid() and public.is_book_member(book_id));

-- unshare_approvals
create policy "unshare_approvals_select" on public.unshare_approvals for select to authenticated
  using (
    exists (
      select 1 from public.unshare_requests ur
      where ur.id = unshare_approvals.request_id
        and public.is_book_member(ur.book_id)
    )
  );

create policy "unshare_approvals_insert" on public.unshare_approvals for insert to authenticated
  with check (user_id = auth.uid());
