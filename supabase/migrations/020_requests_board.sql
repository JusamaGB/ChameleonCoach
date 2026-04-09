create table product_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  problem_statement text not null,
  desired_outcome text,
  requester_user_id uuid references auth.users(id) on delete set null,
  requester_role text not null
    check (requester_role in ('coach', 'client', 'admin')),
  coach_id uuid references auth.users(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  module_area text not null,
  feature_area text,
  urgency text not null default 'important'
    check (urgency in ('nice_to_have', 'important', 'high_impact', 'blocking')),
  niche text not null default 'general',
  request_type text not null default 'workflow_improvement'
    check (request_type in (
      'new_feature',
      'module_expansion',
      'workflow_improvement',
      'ux_improvement',
      'bug_friction',
      'integration',
      'data_reporting'
    )),
  status text not null default 'submitted'
    check (status in (
      'submitted',
      'under_review',
      'gathering_demand',
      'planned',
      'in_design',
      'in_build',
      'released',
      'merged',
      'not_now',
      'declined'
    )),
  public_note text,
  duplicate_of_request_id uuid references product_requests(id) on delete set null,
  reward_state text not null default 'none'
    check (reward_state in ('none', 'under_review', 'eligible', 'granted')),
  implementation_note text,
  implemented_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table product_request_votes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references product_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (request_id, user_id)
);

create table product_request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references product_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null
    check (role in ('coach', 'client', 'admin')),
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table product_request_follows (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references product_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (request_id, user_id)
);

create table product_request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references product_requests(id) on delete cascade,
  from_status text
    check (from_status in (
      'submitted',
      'under_review',
      'gathering_demand',
      'planned',
      'in_design',
      'in_build',
      'released',
      'merged',
      'not_now',
      'declined'
    )),
  to_status text not null
    check (to_status in (
      'submitted',
      'under_review',
      'gathering_demand',
      'planned',
      'in_design',
      'in_build',
      'released',
      'merged',
      'not_now',
      'declined'
    )),
  note text,
  changed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table contributor_rewards (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references product_requests(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_type text not null
    check (reward_type in (
      'account_credit',
      'extended_trial',
      'free_month',
      'module_unlock',
      'premium_access',
      'early_access',
      'contributor_badge'
    )),
  title text not null,
  description text,
  reward_value text,
  granted_by_user_id uuid references auth.users(id) on delete set null,
  granted_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table product_requests enable row level security;
alter table product_request_votes enable row level security;
alter table product_request_comments enable row level security;
alter table product_request_follows enable row level security;
alter table product_request_status_history enable row level security;
alter table contributor_rewards enable row level security;

create policy "authenticated_read_product_requests" on product_requests
  for select using (auth.uid() is not null);

create policy "authenticated_insert_product_requests" on product_requests
  for insert with check (auth.uid() = requester_user_id);

create policy "requester_update_own_product_requests" on product_requests
  for update using (
    auth.uid() = requester_user_id
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "authenticated_read_request_votes" on product_request_votes
  for select using (auth.uid() is not null);

create policy "authenticated_insert_own_request_votes" on product_request_votes
  for insert with check (auth.uid() = user_id);

create policy "authenticated_delete_own_request_votes" on product_request_votes
  for delete using (auth.uid() = user_id);

create policy "authenticated_read_request_comments" on product_request_comments
  for select using (auth.uid() is not null);

create policy "authenticated_insert_own_request_comments" on product_request_comments
  for insert with check (auth.uid() = user_id);

create policy "author_update_own_request_comments" on product_request_comments
  for update using (
    auth.uid() = user_id
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "authenticated_read_request_follows" on product_request_follows
  for select using (auth.uid() is not null);

create policy "authenticated_insert_own_request_follows" on product_request_follows
  for insert with check (auth.uid() = user_id);

create policy "authenticated_delete_own_request_follows" on product_request_follows
  for delete using (auth.uid() = user_id);

create policy "authenticated_read_request_status_history" on product_request_status_history
  for select using (auth.uid() is not null);

create policy "admin_insert_request_status_history" on product_request_status_history
  for insert with check (
    auth.uid() = changed_by_user_id
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "authenticated_read_contributor_rewards" on contributor_rewards
  for select using (auth.uid() is not null);

create policy "admin_manage_contributor_rewards" on contributor_rewards
  for all using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create index idx_product_requests_status on product_requests(status, created_at desc);
create index idx_product_requests_module_area on product_requests(module_area, created_at desc);
create index idx_product_requests_requester on product_requests(requester_user_id, created_at desc);
create index idx_product_requests_coach on product_requests(coach_id, created_at desc);
create index idx_product_request_votes_request on product_request_votes(request_id);
create index idx_product_request_comments_request on product_request_comments(request_id, created_at asc);
create index idx_product_request_follows_request on product_request_follows(request_id);
create index idx_product_request_status_history_request on product_request_status_history(request_id, created_at desc);
create index idx_contributor_rewards_user on contributor_rewards(user_id, granted_at desc);
