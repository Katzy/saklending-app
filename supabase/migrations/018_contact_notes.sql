create table contact_notes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  contact_id  uuid not null references contacts(id) on delete cascade,
  content     text not null
);

alter table contact_notes enable row level security;
