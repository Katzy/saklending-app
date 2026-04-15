-- SAK Lending — RLS policies for borrower access
-- Borrowers can only read/write their own data via authenticated role

-- contacts: borrower can read their own record
create policy "Borrowers can read own contact"
  on contacts for select
  using (
    id = (select contact_id from user_profiles where id = auth.uid())
  );

create policy "Borrowers can update own contact"
  on contacts for update
  using (
    id = (select contact_id from user_profiles where id = auth.uid())
  );

-- loans: borrower can read their own loans
create policy "Borrowers can read own loans"
  on loans for select
  using (
    contact_id = (select contact_id from user_profiles where id = auth.uid())
  );

-- documents: borrower can read and insert documents on their own loans
create policy "Borrowers can read own documents"
  on documents for select
  using (
    loan_id in (
      select id from loans
      where contact_id = (select contact_id from user_profiles where id = auth.uid())
    )
  );

create policy "Borrowers can insert documents on own loans"
  on documents for insert
  with check (
    loan_id in (
      select id from loans
      where contact_id = (select contact_id from user_profiles where id = auth.uid())
    )
  );

-- properties: borrower can read their own properties
create policy "Borrowers can read own properties"
  on properties for select
  using (
    contact_id = (select contact_id from user_profiles where id = auth.uid())
  );
