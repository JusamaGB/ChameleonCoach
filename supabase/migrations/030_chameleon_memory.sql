create table if not exists chameleon_memory_entries (
  sector text not null,
  key text not null,
  data jsonb not null default '{}'::jsonb,
  search_text text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (sector, key)
);

create index if not exists idx_chameleon_memory_entries_sector_updated
  on chameleon_memory_entries (sector, updated_at desc);

create index if not exists idx_chameleon_memory_entries_search
  on chameleon_memory_entries using gin (to_tsvector('english', coalesce(search_text, '')));

create table if not exists chameleon_messages (
  id text primary key,
  sender text not null,
  msg_type text not null default 'broadcast',
  tag text not null default 'GENERAL',
  channel text not null default 'logs',
  recipients text[] not null default '{}'::text[],
  priority text not null default 'normal',
  content text not null default '',
  ref_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_chameleon_messages_created
  on chameleon_messages (created_at desc);

create index if not exists idx_chameleon_messages_channel_created
  on chameleon_messages (channel, created_at desc);

create table if not exists chameleon_inbox (
  id text primary key,
  sender text not null,
  recipient text not null,
  content text not null default '',
  priority text not null default 'high',
  status text not null default 'pending',
  response text,
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_chameleon_inbox_recipient_status
  on chameleon_inbox (recipient, status, created_at desc);

create table if not exists chameleon_read_cursors (
  agent text primary key,
  cursor_ts timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists chameleon_audit (
  id bigserial primary key,
  ts timestamptz not null default timezone('utc', now()),
  op text not null,
  sector text,
  key text,
  agent text,
  summary text not null default '',
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_chameleon_audit_ts
  on chameleon_audit (ts desc);

create index if not exists idx_chameleon_audit_agent
  on chameleon_audit (agent, ts desc);

create index if not exists idx_chameleon_audit_sector
  on chameleon_audit (sector, ts desc);
