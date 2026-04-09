alter table clients
  add column if not exists provisioning_status text not null default 'pending'
    check (provisioning_status in ('pending', 'provisioning', 'ready', 'failed')),
  add column if not exists provisioning_started_at timestamptz,
  add column if not exists provisioning_completed_at timestamptz,
  add column if not exists provisioning_last_error text;

update clients
set provisioning_status = case
  when onboarding_completed = true and sheet_id is not null then 'ready'
  when invite_accepted_at is not null then 'failed'
  else 'pending'
end
where provisioning_status is null
   or provisioning_status not in ('pending', 'provisioning', 'ready', 'failed');
