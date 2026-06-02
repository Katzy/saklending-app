-- Add decision tracking and selected flag to bank_share_links
ALTER TABLE bank_share_links
  ADD COLUMN IF NOT EXISTS decision text CHECK (decision IN ('interested', 'pass')),
  ADD COLUMN IF NOT EXISTS is_selected boolean NOT NULL DEFAULT false;

-- Lender-uploaded documents (separate from borrower/admin documents)
CREATE TABLE IF NOT EXISTS lender_documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id        uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  bank_link_id   uuid NOT NULL REFERENCES bank_share_links(id) ON DELETE CASCADE,
  file_name      text NOT NULL,
  doc_label      text NOT NULL DEFAULT 'other',
  storage_path   text NOT NULL,
  file_size      bigint,
  created_at     timestamptz NOT NULL DEFAULT now()
);
