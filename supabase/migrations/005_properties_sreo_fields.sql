-- SAK Lending — Add SREO fields to properties table
-- Run this if you already ran 004_properties.sql

alter table properties
  add column if not exists date_acquired      date,
  add column if not exists purchase_price     numeric,
  add column if not exists mortgage_holder    text,
  add column if not exists mortgage_balance   numeric,
  add column if not exists monthly_payment    numeric,
  add column if not exists interest_rate      numeric,
  add column if not exists loan_maturity_date date;
