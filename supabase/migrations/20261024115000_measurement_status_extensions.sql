-- PostgreSQL requires newly added enum values to be committed before use.
alter type public.measurement_status add value if not exists 'RETURNED_FOR_CORRECTION';
alter type public.measurement_status add value if not exists 'SENT_TO_BILLING';
