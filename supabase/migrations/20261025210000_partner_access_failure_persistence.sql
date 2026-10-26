-- Registra tentativas inválidas em transação própria, pois a função de validação
-- precisa retornar erro e não deve depender de update antes de EXCEPTION.
create or replace function public.record_partner_access_failure(target_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.service_order_partner_accesses
     set validation_count = least(validation_count + 1, 5)
   where token_hash = encode(sha256(convert_to(target_token, 'UTF8')), 'hex')
     and revoked_at is null
     and expires_at > clock_timestamp()
     and validation_count < 5;
end;
$$;

revoke all on function public.record_partner_access_failure(text) from public;
grant execute on function public.record_partner_access_failure(text) to anon;
