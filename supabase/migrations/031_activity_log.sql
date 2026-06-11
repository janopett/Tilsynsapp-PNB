-- ============================================================
-- Activity log for saksbehandler actions.
--
-- Tracks what authenticated users do: creating inspections,
-- archiving to SIF, answering checkpoints, and looking up cases.
-- Separate from audit_logs which is for admin-only system changes.
--
-- user_email is stored as a snapshot so the record remains useful
-- even if the user account is later deleted.
-- ============================================================

create table if not exists activity_logs (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        references auth.users(id) on delete set null,
  user_email     text        not null,
  action         text        not null,   -- e.g. "inspection.create", "inspection.archive"
  inspection_id  uuid        references inspections(id) on delete set null,
  metadata       jsonb       not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists activity_logs_user_id_idx      on activity_logs (user_id);
create index if not exists activity_logs_action_idx       on activity_logs (action);
create index if not exists activity_logs_inspection_id_idx on activity_logs (inspection_id);
create index if not exists activity_logs_created_at_idx   on activity_logs (created_at desc);

alter table activity_logs enable row level security;

-- Users can see their own activity
create policy "users_see_own_activity"
  on activity_logs for select
  using (user_id = auth.uid());

-- Admins can see all activity
create policy "admins_see_all_activity"
  on activity_logs for select
  using (
    (select raw_app_meta_data->>'is_admin' from auth.users where id = auth.uid()) = 'true'
  );

-- Insert/update/delete only via service role (API routes)
