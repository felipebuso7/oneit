-- New operational technicians are dispatchable by default.
-- Existing rows are intentionally not changed: their current availability is
-- an operational decision and must be updated explicitly by a manager.
alter table public.technicians
  alter column status set default 'AVAILABLE';
