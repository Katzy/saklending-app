-- Tasks / to-do list for the dashboard.
-- Tasks can be standalone or linked to a specific loan.
-- Tasks without a due_date appear in every daily reminder email until completed.
-- Tasks with a due_date appear in the email on or after that date.

CREATE TABLE tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  title        text NOT NULL,
  notes        text,
  due_date     date,
  loan_id      uuid REFERENCES loans(id) ON DELETE SET NULL,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
