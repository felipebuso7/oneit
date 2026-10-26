-- Kept isolated because PostgreSQL must commit a new enum value before it is used by a function.
alter type public.sgsti_approval_status add value if not exists 'PENDING_REVIEW';
