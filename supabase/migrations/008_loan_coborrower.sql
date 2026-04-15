alter table loans
  add column if not exists co_borrower_contact_id uuid references contacts(id) on delete set null;
