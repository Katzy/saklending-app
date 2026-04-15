alter table loans
  add column if not exists property_id uuid references properties(id) on delete set null;
