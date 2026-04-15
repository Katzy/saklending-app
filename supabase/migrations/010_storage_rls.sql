-- Storage RLS: lock down the loan-documents bucket so that
-- neither the anon key nor a user JWT can read or write objects directly.
-- All access goes through server-side API routes using the service role key,
-- which bypasses RLS entirely. These policies are a defense-in-depth layer
-- in case the anon/user key is ever misused or leaked.

-- Deny all direct access by the anon role
create policy "deny anon read loan-documents"
  on storage.objects for select
  to anon
  using (bucket_id = 'loan-documents' and false);

create policy "deny anon insert loan-documents"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'loan-documents' and false);

-- Deny all direct access by authenticated users
-- (they must go through our API which validates ownership first)
create policy "deny authenticated direct read loan-documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'loan-documents' and false);

create policy "deny authenticated direct insert loan-documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'loan-documents' and false);

create policy "deny authenticated direct update loan-documents"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'loan-documents' and false);

create policy "deny authenticated direct delete loan-documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'loan-documents' and false);
