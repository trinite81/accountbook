-- Migration 002: invitations 테이블에 from_email 추가
-- Supabase SQL Editor에서 실행하세요.

alter table public.invitations add column if not exists from_email text not null default '';
