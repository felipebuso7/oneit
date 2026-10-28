-- Keep the partner evidence bucket aligned with the server-side upload contract.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-evidences', 'ticket-evidences', false, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
