-- ============================================================
-- Audit log for admin actions (ISO 27001 A.12.4.1)
-- Records who did what, when, and to which entity.
-- ============================================================

create table if not exists audit_logs (
  id           uuid        primary key default gen_random_uuid(),
  admin_id     uuid        not null,           -- auth.users.id of the admin
  action       text        not null,           -- e.g. "user.create", "user.set_admin"
  target_type  text        not null,           -- e.g. "user", "checkpoint", "sif_settings"
  target_id    text,                           -- ID of the affected entity (nullable for bulk/global actions)
  metadata     jsonb       not null default '{}', -- additional context (new values, etc.)
  created_at   timestamptz not null default now()
);

-- Index for querying by admin or by time range
create index if not exists audit_logs_admin_id_idx    on audit_logs (admin_id);
create index if not exists audit_logs_created_at_idx  on audit_logs (created_at desc);
create index if not exists audit_logs_action_idx      on audit_logs (action);

-- RLS: only admins can read audit logs; no one can update or delete them
alter table audit_logs enable row level security;

-- Service role bypasses RLS (used for inserts from API routes)
-- Regular users cannot read audit logs at all
create policy "admins_can_read_audit_logs"
  on audit_logs for select
  using (
    (select raw_app_meta_data->>'is_admin' from auth.users where id = auth.uid()) = 'true'
  );

-- No insert/update/delete via client — only service role may write
