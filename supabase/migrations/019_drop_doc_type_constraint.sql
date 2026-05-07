-- Drop the doc_type check constraint to allow custom "Other" labels
-- stored directly as the doc_type value (matching borrower portal behavior).
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_doc_type_check;
