-- Add appraised_value to loans for accurate LTV calculation.
-- LTV is now calculated as loan_amount / appraised_value rather than purchase_price or ARV.

ALTER TABLE loans ADD COLUMN IF NOT EXISTS appraised_value numeric(15,2);
