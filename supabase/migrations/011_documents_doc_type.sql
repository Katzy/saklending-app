-- Widen the doc_type check constraint on the documents table
-- to match all types offered in the upload UI.

alter table documents
  drop constraint if exists documents_doc_type_check;

alter table documents
  add constraint documents_doc_type_check
  check (doc_type in (
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
    'other'
  ));
