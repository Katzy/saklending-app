ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS broker_fee_sent text,
  ADD COLUMN IF NOT EXISTS broker_agreement_sent_at timestamptz;
