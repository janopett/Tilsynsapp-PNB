-- ============================================================
-- Checkpoint definitions — moved from hardcoded seed to database.
-- Admins can add, edit and toggle checkpoints via the admin panel.
-- ============================================================

CREATE TABLE IF NOT EXISTS checkpoint_definitions (
  id            TEXT        PRIMARY KEY,
  title         TEXT        NOT NULL,
  category      TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  applies_to    TEXT[]      NOT NULL DEFAULT '{}',
  required_tags TEXT[]      NOT NULL DEFAULT '{}',
  severity      TEXT        NOT NULL DEFAULT 'info',
  legal_reference TEXT,
  active        BOOLEAN     NOT NULL DEFAULT true,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row-level security
ALTER TABLE checkpoint_definitions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active checkpoints
CREATE POLICY "authenticated_read_active" ON checkpoint_definitions
  FOR SELECT TO authenticated USING (active = true);

-- Service role has full access (used by admin API routes)
CREATE POLICY "service_role_all" ON checkpoint_definitions
  FOR ALL TO service_role USING (true);

-- ── Seed from existing TypeScript definitions ─────────────────────────────────
-- 33 checkpoints across 10 categories

INSERT INTO checkpoint_definitions (id, title, category, description, applies_to, required_tags, severity, legal_reference, sort_order) VALUES

-- FORMELLE FORHOLD
('FF001', 'Søknad og tillatelse foreligger', 'formelle_forhold',
 'Kontroller at gyldig byggetillatelse foreligger og er tydelig tilgjengelig på byggeplass.',
 ARRAY['garasje_carport','tilbygg','paabygg','enebolig','bruksendring','terrasse_balkong','stoettemur','riving'],
 ARRAY['soeknadspliktig'], 'critical', 'pbl § 21-4', 10),

('FF002', 'Tiltaket er i samsvar med tillatelsen', 'formelle_forhold',
 'Sammenlign faktisk utførelse med godkjente tegninger og vilkår i tillatelsen.',
 ARRAY['garasje_carport','tilbygg','paabygg','enebolig','bruksendring','terrasse_balkong','stoettemur','riving'],
 ARRAY['soeknadspliktig'], 'critical', 'pbl § 31-3', 20),

('FF003', 'Dispensasjon er innvilget og vilkår overholdt', 'formelle_forhold',
 'Kontroller at dispensasjonsvedtaket foreligger og at eventuelle vilkår er oppfylt.',
 ARRAY['garasje_carport','tilbygg','paabygg','enebolig','bruksendring','terrasse_balkong','stoettemur','riving'],
 ARRAY['har_dispensasjon'], 'critical', 'pbl § 19-1', 30),

('FF004', 'Ansvarlige foretak er i samsvar med søknaden', 'formelle_forhold',
 'Kontroller at foretak som utfører arbeidet er identisk med dem som er angitt i ansvarsretten.',
 ARRAY['tilbygg','paabygg','enebolig','bruksendring'],
 ARRAY['har_ansvarlige_foretak'], 'warning', 'pbl § 23-1', 40),

('FF005', 'Kontrollerklæringer foreligger', 'formelle_forhold',
 'Kontroller at nødvendige kontrollerklæringer er innhentet og oversendt kommunen.',
 ARRAY['tilbygg','paabygg','enebolig','bruksendring'],
 ARRAY['har_ansvarlige_foretak'], 'warning', 'SAK10 § 14-8', 50),

-- PLASSERING
('PL001', 'Avstand til nabogrense overholdt', 'plassering',
 'Mål og kontroller at tiltakets avstand til nabogrense er i samsvar med godkjent situasjonsplan.',
 ARRAY['garasje_carport','tilbygg','paabygg','enebolig','terrasse_balkong','stoettemur'],
 ARRAY['naer_nabogrense'], 'critical', 'pbl § 29-4', 10),

('PL002', 'Plassering stemmer med situasjonsplan', 'plassering',
 'Kontroller at tiltakets plassering på tomten samsvarer med godkjent situasjonsplan og kotehøyder.',
 ARRAY['garasje_carport','tilbygg','paabygg','enebolig','stoettemur'],
 ARRAY[]::TEXT[], 'warning', 'pbl § 29-4', 20),

('PL003', 'Høyde på støttemur er innenfor tillatt grense', 'plassering',
 'Mål høyde på støttemur og kontroller mot tillatelsen.',
 ARRAY['stoettemur'],
 ARRAY[]::TEXT[], 'warning', 'pbl § 1-6', 30),

-- UTNYTTELSE / STØRRELSE
('US001', 'BRA/BYA er innenfor tillatt utnyttelse', 'utnyttelse_stoerrelse',
 'Beregn og kontroller bruksareal og bebygd areal mot tillatt utnyttelse i reguleringsplan/kommuneplan.',
 ARRAY['garasje_carport','tilbygg','paabygg','enebolig','terrasse_balkong'],
 ARRAY[]::TEXT[], 'critical', 'pbl § 29-4, TEK17', 10),

('US002', 'Høyde er innenfor tillatt grense', 'utnyttelse_stoerrelse',
 'Mål gesimshøyde og mønehøyde og kontroller mot tillatt høyde i reguleringsplan.',
 ARRAY['garasje_carport','tilbygg','paabygg','enebolig'],
 ARRAY[]::TEXT[], 'warning', 'TEK17 § 6-1', 20),

-- KONSTRUKSJON
('KO001', 'Grunnarbeid utført etter godkjent prosjektering', 'konstruksjon',
 'Kontroller at grunnarbeider er i samsvar med geoteknisk rapport og godkjente tegninger.',
 ARRAY['enebolig','tilbygg','garasje_carport','stoettemur'],
 ARRAY[]::TEXT[], 'critical', 'TEK17 § 9-1', 10),

('KO002', 'Bærende konstruksjoner er i samsvar med prosjektering', 'konstruksjon',
 'Kontroller bærende vegger, søyler, bjelker og dekker mot prosjekteringstegninger.',
 ARRAY['enebolig','tilbygg','paabygg'],
 ARRAY[]::TEXT[], 'critical', 'TEK17 § 10-1', 20),

('KO003', 'Terrasse/balkong er tilfredsstillende festet', 'konstruksjon',
 'Kontroller forankring og festedetaljer for terrasse eller balkong. Sjekk kapasitet for laster.',
 ARRAY['terrasse_balkong'],
 ARRAY[]::TEXT[], 'critical', 'TEK17 § 10-1', 30),

-- BRANN
('BR001', 'Brannskille er korrekt utført', 'brann',
 'Kontroller at brannskillekonstruksjoner (vegger/etasjeskiller) har riktig brannklasse og er tett.',
 ARRAY['garasje_carport','tilbygg','paabygg','enebolig','bruksendring'],
 ARRAY['har_brannskille'], 'critical', 'TEK17 § 11-3', 10),

('BR002', 'Rømningsveier er tilgjengelige og korrekte', 'brann',
 'Kontroller at rømningsveier, utgangsdører og nødbelysning oppfyller kravene.',
 ARRAY['enebolig','bruksendring','tilbygg','paabygg'],
 ARRAY[]::TEXT[], 'critical', 'TEK17 § 11-13', 20),

('BR003', 'Brannteknisk prosjektering er fulgt', 'brann',
 'Kontroller at det branntekniske prosjektet er lagt til grunn for utførelsen.',
 ARRAY['enebolig','bruksendring','tilbygg','paabygg'],
 ARRAY['har_ansvarlige_foretak'], 'warning', 'TEK17 § 11-1', 30),

-- FUKT / OVERVANN
('FU001', 'Våtrom er korrekt utført (membran, sluk m.m.)', 'fukt_overvann',
 'Kontroller at membran er korrekt utlagt, at sluk er korrekt montert og at fall mot sluk er tilstrekkelig.',
 ARRAY['enebolig','tilbygg','paabygg','bruksendring'],
 ARRAY['inneholder_vaatrom'], 'critical', 'TEK17 § 13-9', 10),

('FU002', 'Drenering og fuktsperre er utført', 'fukt_overvann',
 'Kontroller drenering rundt grunnmur og at fuktsperre er lagt korrekt.',
 ARRAY['enebolig','tilbygg','garasje_carport'],
 ARRAY[]::TEXT[], 'warning', 'TEK17 § 13-7', 20),

('FU003', 'Overvannshåndtering er ivaretatt', 'fukt_overvann',
 'Kontroller at overvann fra tiltaket håndteres i samsvar med godkjent plan og lokale krav.',
 ARRAY['enebolig','tilbygg','paabygg','garasje_carport','stoettemur'],
 ARRAY['har_va_overvann'], 'warning', 'pbl § 27-2', 30),

('FU004', 'VA-tilkobling er korrekt utført', 'fukt_overvann',
 'Kontroller at tilkobling til vann og avløp er fagmessig utført og i samsvar med VA-norm.',
 ARRAY['enebolig','tilbygg','bruksendring'],
 ARRAY['har_va_overvann'], 'warning', 'pbl § 27-1', 40),

-- TERRENG
('TE001', 'Terrengendring er i samsvar med godkjent plan', 'terreng',
 'Kontroller at faktisk terrengendring samsvarer med godkjent situasjonsplan og kotekart.',
 ARRAY['enebolig','tilbygg','garasje_carport','stoettemur'],
 ARRAY['har_terrengendring'], 'warning', 'pbl § 29-4', 10),

('TE002', 'Naboeiendom og vei er ikke skadet', 'terreng',
 'Kontroller at terrengarbeider ikke har forårsaket skade eller ulempe for naboer eller vei.',
 ARRAY['enebolig','tilbygg','stoettemur'],
 ARRAY['har_terrengendring'], 'warning', 'pbl § 28-1', 20),

-- TEKNISK
('TK001', 'Elektriske installasjoner er dokumentert', 'teknisk',
 'Kontroller at elektriske installasjoner er fagmessig utført og at samsvarserklæring foreligger.',
 ARRAY['garasje_carport','tilbygg','paabygg','enebolig','bruksendring','terrasse_balkong'],
 ARRAY['har_elektrisk_arbeid'], 'warning', 'el-tilsynsloven', 10),

('TK002', 'Ventilasjon er tilfredsstillende', 'teknisk',
 'Kontroller at ventilasjonsanlegget er dimensjonert og utført i samsvar med TEK17.',
 ARRAY['enebolig','tilbygg','paabygg','bruksendring'],
 ARRAY[]::TEXT[], 'warning', 'TEK17 § 13-2', 20),

('TK003', 'Energikrav er oppfylt', 'teknisk',
 'Kontroller at energirapporten er i samsvar med godkjent energiramme og at tiltak er gjennomført.',
 ARRAY['enebolig','tilbygg','paabygg','bruksendring'],
 ARRAY[]::TEXT[], 'info', 'TEK17 kap 14', 30),

-- BRUK / FUNKSJON
('BF001', 'Universell utforming er ivaretatt', 'bruk_funksjon',
 'Kontroller tilgjengelighet – rampe, trinnfri adkomst, snuheis, HC-toalett m.m.',
 ARRAY['enebolig','tilbygg','bruksendring'],
 ARRAY['krever_tilgjengelighet'], 'critical', 'TEK17 § 12-1', 10),

('BF002', 'Bruksendring er fagmessig gjennomført', 'bruk_funksjon',
 'Kontroller at bygget er tilpasset ny bruk, inkl. krav til brannsikkerhet, ventilasjon og sanitær.',
 ARRAY['bruksendring'],
 ARRAY[]::TEXT[], 'critical', 'pbl § 31-2', 20),

('BF003', 'Rekkverk og sikkerhet er korrekt utført', 'bruk_funksjon',
 'Kontroller høyde og utforming av rekkverk på terrasse/balkong. Min. 1,0 m for høyder > 1,0 m.',
 ARRAY['terrasse_balkong','tilbygg','paabygg','enebolig'],
 ARRAY[]::TEXT[], 'critical', 'TEK17 § 12-17', 30),

-- DOKUMENTASJON / FERDIGATTEST
('DOK001', 'Ferdigattest/midlertidig brukstillatelse er søkt', 'dokumentasjon_ferdigattest',
 'Kontroller at ferdigattest eller midlertidig brukstillatelse er søkt om eller mottatt.',
 ARRAY['garasje_carport','tilbygg','paabygg','enebolig','bruksendring','terrasse_balkong','stoettemur'],
 ARRAY['soeknadspliktig'], 'warning', 'pbl § 21-10', 10),

('DOK002', 'Sluttkontrollerklæring foreligger', 'dokumentasjon_ferdigattest',
 'Kontroller at ansvarlig kontrollerende har oversendt sluttkontrollerklæring til kommunen.',
 ARRAY['tilbygg','paabygg','enebolig','bruksendring'],
 ARRAY['har_ansvarlige_foretak'], 'warning', 'SAK10 § 14-8', 20),

('DOK003', 'Tegninger/dokumentasjon er à jour', 'dokumentasjon_ferdigattest',
 'Kontroller at byggetegninger er oppdatert med eventuelle avvik og endringer under byggetiden (as-built).',
 ARRAY['garasje_carport','tilbygg','paabygg','enebolig','bruksendring'],
 ARRAY[]::TEXT[], 'info', 'pbl § 31-3', 30),

('DOK004', 'Riving er ferdigstilt og dokumentert', 'dokumentasjon_ferdigattest',
 'Kontroller at rivingsarbeidet er fullført, avfall sortert og dokumentasjon oversendt.',
 ARRAY['riving'],
 ARRAY[]::TEXT[], 'warning', 'pbl § 28-2', 40),

('DOK005', 'Farlig avfall fra riving er håndtert korrekt', 'dokumentasjon_ferdigattest',
 'Kontroller at kartlegging av farlig avfall er utført og at avfall er levert godkjent mottak.',
 ARRAY['riving'],
 ARRAY[]::TEXT[], 'critical', 'Forurensningsloven', 50)

ON CONFLICT (id) DO NOTHING;
