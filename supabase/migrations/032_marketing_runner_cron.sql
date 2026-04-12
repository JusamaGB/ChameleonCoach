create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists vault;

create or replace function public.trigger_marketing_runner()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  runner_url text;
  runner_api_key text;
begin
  select decrypted_secret
    into runner_url
  from vault.decrypted_secrets
  where name = 'marketing_runner_url'
  order by created_at desc
  limit 1;

  select decrypted_secret
    into runner_api_key
  from vault.decrypted_secrets
  where name = 'chameleon_mcp_api_key'
  order by created_at desc
  limit 1;

  if runner_url is null or runner_api_key is null then
    raise notice 'Marketing runner cron skipped because required Vault secrets are missing.';
    return;
  end if;

  perform net.http_post(
    url := runner_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-chameleon-api-key', runner_api_key,
      'x-agent', 'SUPABASE_CRON'
    ),
    body := '{}'::jsonb
  );
end;
$$;

select cron.unschedule('marketing-runner-every-5-minutes')
where exists (
  select 1
  from cron.job
  where jobname = 'marketing-runner-every-5-minutes'
);

select cron.schedule(
  'marketing-runner-every-5-minutes',
  '*/5 * * * *',
  $$select public.trigger_marketing_runner();$$
)
where not exists (
  select 1
  from cron.job
  where jobname = 'marketing-runner-every-5-minutes'
);
