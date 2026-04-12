alter table admin_settings
  add column if not exists marketing_openai_api_key_ciphertext text,
  add column if not exists marketing_openai_api_key_last4 text,
  add column if not exists marketing_openai_api_key_set_at timestamptz,
  add column if not exists marketing_budget_mode boolean not null default true,
  add column if not exists marketing_model_discovery text,
  add column if not exists marketing_model_drafting text,
  add column if not exists marketing_model_revision text,
  add column if not exists marketing_max_draft_variants integer,
  add column if not exists marketing_max_output_tokens integer,
  add column if not exists marketing_autoscan_enabled boolean not null default true,
  add column if not exists marketing_reddit_subreddits text[],
  add column if not exists marketing_reddit_search_terms text[];

alter table chameleon_memory_entries
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

alter table chameleon_messages
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

alter table chameleon_inbox
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

alter table chameleon_audit
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_chameleon_memory_entries_owner_sector_updated
  on chameleon_memory_entries (owner_user_id, sector, updated_at desc);

create index if not exists idx_chameleon_messages_owner_created
  on chameleon_messages (owner_user_id, created_at desc);

create index if not exists idx_chameleon_inbox_owner_recipient_status
  on chameleon_inbox (owner_user_id, recipient, status, created_at desc);

create index if not exists idx_chameleon_audit_owner_ts
  on chameleon_audit (owner_user_id, ts desc);
