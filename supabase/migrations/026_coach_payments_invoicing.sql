create table if not exists coach_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade unique,
  stripe_account_id text not null unique,
  account_type text not null default 'express'
    check (account_type in ('express')),
  onboarding_completed boolean not null default false,
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  default_currency text not null default 'gbp',
  country text not null default 'GB',
  last_account_link_url text,
  last_account_link_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists coach_client_payment_customers (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  stripe_account_id text not null,
  stripe_customer_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (coach_id, client_id)
);

create table if not exists client_invoices (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  stripe_account_id text not null,
  stripe_customer_id text,
  stripe_invoice_id text unique,
  stripe_invoice_number text,
  stripe_hosted_invoice_url text,
  stripe_invoice_pdf_url text,
  source_appointment_id uuid references appointments(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  currency text not null default 'gbp',
  subtotal_amount integer not null default 0,
  total_amount integer not null default 0,
  due_date timestamptz,
  description text,
  internal_note text,
  paid_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists client_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references client_invoices(id) on delete cascade,
  label text not null,
  description text,
  quantity integer not null default 1,
  unit_amount integer not null,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_coach_payment_accounts_coach_id
  on coach_payment_accounts(coach_id);

create index if not exists idx_coach_client_payment_customers_coach_client
  on coach_client_payment_customers(coach_id, client_id);

create index if not exists idx_client_invoices_coach_id
  on client_invoices(coach_id, created_at desc);

create index if not exists idx_client_invoices_client_id
  on client_invoices(client_id, created_at desc);

create index if not exists idx_client_invoices_status
  on client_invoices(status, created_at desc);

create index if not exists idx_client_invoices_stripe_invoice_id
  on client_invoices(stripe_invoice_id);

create index if not exists idx_client_invoice_items_invoice_id
  on client_invoice_items(invoice_id, sort_order);

alter table coach_payment_accounts enable row level security;
alter table coach_client_payment_customers enable row level security;
alter table client_invoices enable row level security;
alter table client_invoice_items enable row level security;
