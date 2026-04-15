-- SAK Lending — Loan showcase fields for public homepage
-- Run in Supabase SQL editor after 002_user_profiles.sql

alter table loans
  add column if not exists property_image_path text,
  add column if not exists show_on_homepage boolean not null default false;

-- Index for fast homepage query
create index if not exists loans_homepage_idx on loans (show_on_homepage, stage)
  where show_on_homepage = true;
