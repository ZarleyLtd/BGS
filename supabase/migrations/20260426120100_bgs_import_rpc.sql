-- Destructive helper for one-shot sheet import (service_role only).

create or replace function public.bgs_truncate_for_sheet_import()
returns void
language plpgsql
security definer
set search_path = bgs, pg_temp
as $$
begin
  truncate bgs.fixtures restart identity;
  truncate bgs.handicap_rows restart identity;
  delete from bgs.scores;
  delete from bgs.config_kv;
  delete from bgs.course_defs;
end;
$$;

revoke all on function public.bgs_truncate_for_sheet_import() from public;
grant execute on function public.bgs_truncate_for_sheet_import() to service_role;
