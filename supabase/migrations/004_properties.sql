-- SAK Lending — Subject Properties
-- Properties a contact wants to finance (separate from SREO, which is their existing portfolio)

create table properties (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  contact_id       uuid references contacts(id) on delete cascade,
  -- Address
  address_street   text,
  address_city     text,
  address_state    text,
  address_zip      text,
  property_type    text,
  -- SREO / mortgage fields
  date_acquired    date,
  purchase_price   numeric,
  mortgage_holder  text,
  mortgage_balance numeric,
  monthly_payment  numeric,
  interest_rate    numeric,
  loan_maturity_date date,
  notes            text
);

alter table properties enable row level security;
-- Only service role can read/write (admin only, no borrower access needed)
