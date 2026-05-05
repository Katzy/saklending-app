ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_doc_type_check;

ALTER TABLE documents ADD CONSTRAINT documents_doc_type_check
CHECK (doc_type IN (
  'purchase_contract',
  'scope_of_work',
  'appraisal',
  'environmental',
  'personal_financial_statement',
  'rent_roll',
  'lease',
  't12',
  'tax_return',
  'bank_statement',
  'pfs',
  'broker_agreement',
  'other'
));
