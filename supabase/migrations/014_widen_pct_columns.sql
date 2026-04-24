-- Remove tight numeric(5,2) constraints from percentage fields.
-- numeric(5,2) only allows values up to 999.99 which can trigger overflow
-- if an out-of-range value is entered. These fields don't need a precision cap.

ALTER TABLE loans
  ALTER COLUMN occupancy_pct TYPE numeric,
  ALTER COLUMN vacancy_factor_pct TYPE numeric;
