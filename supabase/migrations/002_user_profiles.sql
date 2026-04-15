-- SAK Lending — User Profiles (run after 001_initial_schema.sql)
-- Links Supabase auth.users to contacts and assigns roles

create table user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  contact_id  uuid references contacts(id) on delete set null,
  role        text not null default 'borrower'
                check (role in ('admin', 'borrower'))
);

alter table user_profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on user_profiles for select
  using (auth.uid() = id);

-- Only service role can insert/update (handled server-side)
