-- SAK Lending — Initial Schema
-- Run this in the Supabase SQL editor

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- CONTACTS
-- ============================================================
create table contacts (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  first_name      text not null,
  last_name       text not null,
  email           text,
  phone           text,
  entity_name     text,
  credit_score_estimate integer,
  can_provide_tax_returns boolean,
  sponsor_bio     text,
  source          text not null default 'manual'
                    check (source in ('quote_form','contact_form','manual')),
  notes           text
);

-- ============================================================
-- LOANS
-- ============================================================
create table loans (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  contact_id      uuid references contacts(id) on delete set null,

  -- Loan request
  loan_amount             numeric(15,2),
  loan_purpose            text check (loan_purpose in ('purchase','refinance')),
  loan_program            text check (loan_program in ('bridge','permanent','rehab','ground_up')),
  financing_preference    text check (financing_preference in ('institutional','private')),
  property_type           text,
  state                   text,
  comments                text,

  -- Property details
  address_street          text,
  address_city            text,
  address_state           text,
  address_zip             text,
  purchase_price          numeric(15,2),
  arv                     numeric(15,2),
  property_use            text check (property_use in ('investment','owner_user')),
  total_units             integer,
  commercial_units        integer,
  residential_units       integer,
  section8_units          integer,
  occupied_commercial_units integer,
  occupied_residential_units integer,
  building_sqft           numeric(12,2),
  lot_size_sf             numeric(12,2),
  year_built              integer,
  floors                  integer,
  buildings               integer,
  occupancy_pct           numeric(5,2),
  deferred_maintenance    boolean,
  code_violations         boolean,
  annual_taxes            numeric(15,2),
  annual_insurance        numeric(15,2),

  -- SFR features (conditional)
  bedrooms                integer,
  bathrooms               numeric(4,1),
  garage_spaces           integer,

  -- Income & expenses
  income_actual_or_proforma text check (income_actual_or_proforma in ('actual','proforma')),
  gross_annual_income     numeric(15,2),
  vacancy_factor_pct      numeric(5,2) default 5,
  annual_operating_expenses numeric(15,2),

  -- Refinance fields (conditional)
  date_acquired           date,
  original_purchase_price numeric(15,2),
  existing_loan_balance   numeric(15,2),
  refinance_purpose       text,
  prepayment_penalty      boolean,
  mortgage_current        boolean,
  cashout_amount          numeric(15,2),
  existing_lender         text,
  capex_summary           text,

  -- Construction/rehab fields (conditional)
  capex_spent_to_date     numeric(15,2),
  new_construction_costs  numeric(15,2),

  -- Deal summary
  nnn_leases              integer,
  exit_strategy           text,
  full_loan_summary       text,

  -- Pipeline
  stage         text not null default 'lead'
                  check (stage in ('lead','qualified','application','underwriting','approved','funded')),
  is_dead       boolean not null default false,
  dead_reason   text,
  dead_at       timestamptz,
  stage_updated_at timestamptz not null default now()
);

-- ============================================================
-- LOAN NOTES
-- ============================================================
create table loan_notes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  loan_id     uuid not null references loans(id) on delete cascade,
  content     text not null
);

-- ============================================================
-- PFS — Personal Financial Statement (borrower-level)
-- ============================================================
create table pfs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  contact_id  uuid not null references contacts(id) on delete cascade,

  -- Identity
  application_type    text check (application_type in ('individual','joint')),
  pfs_date            date,
  applicant_initials  text,
  coapplicant_name    text,
  coapplicant_address text,
  coapplicant_phone   text,
  coapplicant_dob     date,
  coapplicant_email   text,
  coapplicant_initials text,

  -- Assets
  cash_on_hand              numeric(15,2),
  marketable_securities     numeric(15,2),
  other_equity              numeric(15,2),
  retirement_accounts       numeric(15,2),
  real_estate_owned_value   numeric(15,2),
  autos_and_property        numeric(15,2),
  accounts_loans_receivable numeric(15,2),
  cash_in_life_insurance    numeric(15,2),
  equity_llcs_scorps        numeric(15,2),
  other_assets              numeric(15,2),

  -- Liabilities
  notes_payable         numeric(15,2),
  accounts_bills_due    numeric(15,2),
  unpaid_taxes          numeric(15,2),
  real_estate_mortgages numeric(15,2),
  life_insurance_loans  numeric(15,2),
  other_liabilities     numeric(15,2),

  -- Income
  income_salary             numeric(15,2),
  income_bonus_commissions  numeric(15,2),
  income_dividends          numeric(15,2),
  income_real_estate        numeric(15,2),
  income_other              numeric(15,2),

  -- Contingent liabilities
  contingent_guarantor    numeric(15,2),
  contingent_legal_claims numeric(15,2),
  contingent_federal_taxes numeric(15,2),
  contingent_other        numeric(15,2),

  -- General info (yes/no)
  assets_pledged          boolean,
  pending_legal_actions   boolean,
  has_will_estate_plan    boolean,
  obligations_past_due    boolean,
  prior_bankruptcy        boolean,
  unsatisfied_judgments   boolean,
  irs_audited             boolean,
  irs_audit_when          text,
  criminal_offense        boolean,

  -- Schedules stored as JSONB arrays
  -- Schedule A: [{institution_name, account_type, owner, balance, pledged_to}]
  schedule_a jsonb default '[]'::jsonb,
  -- Schedule B: [{shares_or_face_value, description, owner, exchange, pledged_or_held_by}]
  schedule_b jsonb default '[]'::jsonb,
  -- Schedule C: [{location, title_held_by, ownership_pct, date_acquired, cost, market_value, mortgage_holder, mortgage_balance, monthly_payment}]
  schedule_c jsonb default '[]'::jsonb,
  -- Schedule D: [{company, policy_owner, beneficiary, face_amount, policy_loans, cash_surrender_value}]
  schedule_d jsonb default '[]'::jsonb,
  -- Schedule E: [{creditor, original_amount, balance, secured_by, is_joint, monthly_payment}]
  schedule_e jsonb default '[]'::jsonb,

  -- Signature
  applicant_signature   text,  -- base64 canvas data
  coapplicant_signature text,
  signed_at             timestamptz,
  signed_pdf_path       text   -- path in Supabase Storage if PDF uploaded
);

-- ============================================================
-- SREO — Schedule of Real Estate Owned (one row per property)
-- ============================================================
create table sreo_properties (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  contact_id      uuid not null references contacts(id) on delete cascade,

  location        text,
  title_held_by   text,
  ownership_pct   numeric(5,2),
  date_acquired   date,
  cost            numeric(15,2),
  market_value    numeric(15,2),
  mortgage_holder text,
  mortgage_balance numeric(15,2),
  monthly_payment numeric(15,2)
);

-- ============================================================
-- PROPERTY DOCUMENTS — T-12, rent rolls, leases per SREO property
-- ============================================================
create table property_documents (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  sreo_property_id    uuid not null references sreo_properties(id) on delete cascade,

  doc_type            text not null check (doc_type in ('t12','rent_roll','lease','other')),

  -- File upload fields
  file_name           text,
  storage_path        text,
  file_size           bigint,

  -- Structured T-12 data (alternative to file upload)
  -- [{month, year, gross_income, vacancy, operating_expenses, noi}]
  t12_data            jsonb,

  uploaded_via        text check (uploaded_via in ('dashboard','borrower_portal'))
);

-- ============================================================
-- DOCUMENTS — loan-level files
-- ============================================================
create table documents (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  loan_id           uuid not null references loans(id) on delete cascade,

  doc_type          text not null default 'other'
                      check (doc_type in (
                        'purchase_contract','scope_of_work','appraisal',
                        'environmental','personal_financial_statement',
                        'rent_roll','lease','other'
                      )),
  file_name         text not null,
  storage_path      text not null,
  file_size         bigint,
  uploaded_by_label text,
  upload_token_id   uuid  -- FK added after borrower_portal_tokens is created
);

-- ============================================================
-- BORROWER PORTAL TOKENS
-- ============================================================
create table borrower_portal_tokens (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  contact_id  uuid not null references contacts(id) on delete cascade,
  loan_id     uuid references loans(id) on delete cascade,

  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at  timestamptz,
  label       text,
  access_type text not null default 'full'
                check (access_type in ('pfs','upload','full'))
);

-- Add FK from documents to borrower_portal_tokens
alter table documents
  add constraint documents_upload_token_fk
  foreign key (upload_token_id) references borrower_portal_tokens(id) on delete set null;

-- ============================================================
-- BANK SHARE LINKS
-- ============================================================
create table bank_share_links (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  loan_id     uuid not null references loans(id) on delete cascade,

  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  password_hash text not null,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  label       text
);

-- ============================================================
-- ROW LEVEL SECURITY
-- All tables locked down — only the service role (used server-side)
-- can read/write. Public access only via API routes with token validation.
-- ============================================================
alter table contacts               enable row level security;
alter table loans                  enable row level security;
alter table loan_notes             enable row level security;
alter table pfs                    enable row level security;
alter table sreo_properties        enable row level security;
alter table property_documents     enable row level security;
alter table documents              enable row level security;
alter table borrower_portal_tokens enable row level security;
alter table bank_share_links       enable row level security;

-- No public access — all queries go through server-side Supabase service role key
-- Dashboard routes are protected by Supabase Auth middleware
