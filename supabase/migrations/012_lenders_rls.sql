-- Enable Row Level Security on lenders and lender_contacts.
-- These tables were created directly in the SQL editor and missed the RLS enable step.
-- All app access goes through the service role key (bypasses RLS), so no policies are needed.
-- Enabling RLS simply blocks direct anon/REST access to these tables.

ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lender_contacts ENABLE ROW LEVEL SECURITY;
