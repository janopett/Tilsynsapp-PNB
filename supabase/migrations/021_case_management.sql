-- ============================================================
-- Migrasjon 021: Saksbehandlingstabeller
-- Legger til: cases, visits, tasks, case_documents, sync_logs
-- Disse brukes av feltarbeids- og saksoppfølgingsmodulen.
-- ============================================================

-- cases: lokal cache av saker fra SIF (Plan & Build)
CREATE TABLE cases (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sif_case_number   TEXT        UNIQUE NOT NULL,
  sif_recno         INTEGER,
  title             TEXT        NOT NULL,
  address           TEXT,
  status            TEXT,
  priority          TEXT        NOT NULL DEFAULT 'normal'
                                CHECK (priority IN ('low', 'normal', 'high')),
  notes             TEXT,
  raw_sif_data      JSONB,
  last_synced_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by        UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- visits: feltbesøk knyttet til saker
CREATE TABLE visits (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID        NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id),
  scheduled_at  TIMESTAMPTZ NOT NULL,
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  status        TEXT        NOT NULL DEFAULT 'planned'
                            CHECK (status IN ('planned', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- tasks: oppgaver per sak
CREATE TABLE tasks (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID    NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id     UUID    NOT NULL REFERENCES auth.users(id),
  title       TEXT    NOT NULL,
  description TEXT,
  status      TEXT    NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'completed')),
  priority    TEXT    NOT NULL DEFAULT 'normal'
                      CHECK (priority IN ('low', 'normal', 'high')),
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- case_documents: lokal referanse til dokumenter i SIF
CREATE TABLE case_documents (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id              UUID        NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sif_document_number  TEXT,
  sif_document_recno   INTEGER,
  title                TEXT,
  category             TEXT,
  status               TEXT,
  document_date        DATE,
  sif_url              TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- sync_logs: logg av SIF-synkroniseringsoperasjoner
CREATE TABLE sync_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT        NOT NULL,
  status        TEXT        NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  payload       JSONB,
  response      JSONB,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indekser for ytelse
-- ============================================================
CREATE INDEX idx_cases_sif_case_number ON cases(sif_case_number);
CREATE INDEX idx_cases_priority        ON cases(priority);
CREATE INDEX idx_cases_status          ON cases(status);
CREATE INDEX idx_visits_case_id        ON visits(case_id);
CREATE INDEX idx_visits_user_id        ON visits(user_id);
CREATE INDEX idx_visits_scheduled_at   ON visits(scheduled_at);
CREATE INDEX idx_tasks_case_id         ON tasks(case_id);
CREATE INDEX idx_tasks_user_id         ON tasks(user_id);
CREATE INDEX idx_tasks_status          ON tasks(status);
CREATE INDEX idx_case_documents_case_id ON case_documents(case_id);
CREATE INDEX idx_sync_logs_created_at  ON sync_logs(created_at);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE cases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs      ENABLE ROW LEVEL SECURITY;

-- cases: alle innloggede brukere kan se og redigere (delt arbeidsregister)
CREATE POLICY "cases_authenticated_all" ON cases
  FOR ALL USING (auth.role() = 'authenticated');

-- visits: brukere ser og endrer kun egne besøk
CREATE POLICY "visits_own_user" ON visits
  FOR ALL USING (auth.uid() = user_id);

-- tasks: brukere ser og endrer kun egne oppgaver
CREATE POLICY "tasks_own_user" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- case_documents: alle innloggede brukere kan se
CREATE POLICY "case_documents_authenticated_all" ON case_documents
  FOR ALL USING (auth.role() = 'authenticated');

-- sync_logs: alle innloggede brukere kan se og opprette loggposter
CREATE POLICY "sync_logs_authenticated_all" ON sync_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- updated_at trigger (gjenbruker pattern fra eksisterende tabeller)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_visits_updated_at
  BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
