ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS show_rate_to_borrower boolean NOT NULL DEFAULT false;
