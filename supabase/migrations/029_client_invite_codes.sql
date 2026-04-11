alter table clients
  add column if not exists invite_code text unique,
  add column if not exists invite_contact_type text
    check (invite_contact_type in ('email', 'phone')),
  add column if not exists invite_contact_value text;

create index if not exists idx_clients_invite_code on clients(invite_code);
create index if not exists idx_clients_invite_contact on clients(invite_contact_type, invite_contact_value);
