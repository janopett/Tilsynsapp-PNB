-- ============================================================
-- Expand checkpoint_definitions with new measure types and
-- property tags:
--   New tiltakstyper: tomannsbolig, fasadeendring
--   New egenskaper:   har_radon_tiltak, krever_lydkrav
-- ============================================================

-- ── 1. Tomannsbolig: inherit all checkpoints from enebolig ────────────────────
-- Tomannsbolig has the same requirements as enebolig, plus extras below.
UPDATE checkpoint_definitions
SET applies_to = applies_to || ARRAY['tomannsbolig']
WHERE 'enebolig' = ANY(applies_to)
  AND NOT ('tomannsbolig' = ANY(applies_to));

-- ── 2. Fasadeendring: add to relevant checkpoints ──────────────────────────────
UPDATE checkpoint_definitions
SET applies_to = applies_to || ARRAY['fasadeendring']
WHERE id IN (
  'FF001',  -- Søknad og tillatelse foreligger
  'FF002',  -- Tiltaket er i samsvar med tillatelsen
  'FF003',  -- Dispensasjon er innvilget
  'FF004',  -- Ansvarlige foretak er i samsvar med søknaden
  'FF005',  -- Kontrollerklæringer foreligger
  'TK001',  -- Elektriske installasjoner (ved vindus-/dørskifte)
  'TK003',  -- Energikrav (fasade påvirker energibalanse)
  'DOK001', -- Ferdigattest er søkt
  'DOK003'  -- Tegninger/dokumentasjon er à jour
)
  AND NOT ('fasadeendring' = ANY(applies_to));

-- ── 3. New checkpoints for tomannsbolig (lyd og brannskille mellom enheter) ───
INSERT INTO checkpoint_definitions
  (id, title, category, description, applies_to, required_tags, severity, legal_reference, sort_order)
VALUES
  ('TOM001',
   'Brannskille mellom boenheter er korrekt utført',
   'brann',
   'Kontroller at brannskillekonstruksjonen mellom de to boenhetene (vegg/etasjeskiller) har riktig brannklasse (minimum EI 60) og er uten hull eller svake punkter.',
   ARRAY['tomannsbolig'],
   ARRAY['har_brannskille'],
   'critical',
   'TEK17 § 11-3',
   25),

  ('TOM002',
   'Lydkrav mellom boenheter er dokumentert oppfylt',
   'teknisk',
   'Kontroller at lydisolasjon mellom boenheter er prosjektert og utført i samsvar med TEK17. Krav: Rw ≥ 55 dB for luftlyd, L''n,w ≤ 53 dB for trinnlyd.',
   ARRAY['tomannsbolig'],
   ARRAY['krever_lydkrav'],
   'warning',
   'TEK17 § 13-6',
   35),

  ('TOM003',
   'Separate innganger og adkomst er etablert',
   'bruk_funksjon',
   'Kontroller at begge boenheter har separate innganger og at adkomstforhold er i samsvar med søknaden.',
   ARRAY['tomannsbolig'],
   ARRAY[]::TEXT[],
   'info',
   'pbl § 29-4',
   25)

ON CONFLICT (id) DO NOTHING;

-- ── 4. New checkpoints for fasadeendring ──────────────────────────────────────
INSERT INTO checkpoint_definitions
  (id, title, category, description, applies_to, required_tags, severity, legal_reference, sort_order)
VALUES
  ('FA001',
   'Fasade er i samsvar med godkjente tegninger',
   'formelle_forhold',
   'Kontroller at faktisk fasadeutforming, materialer og fargevalg stemmer overens med godkjente fasadetegninger.',
   ARRAY['fasadeendring'],
   ARRAY['soeknadspliktig'],
   'critical',
   'pbl § 31-3',
   45),

  ('FA002',
   'Fasadeendring er i tråd med plan og estetikk',
   'plassering',
   'Kontroller at fasadeendringen er i tråd med reguleringsplanens krav til estetikk, materialbruk og fargesetting. Sjekk ev. krav i bebyggelsesplan eller SEFRAK-register.',
   ARRAY['fasadeendring'],
   ARRAY[]::TEXT[],
   'warning',
   'pbl § 29-2',
   40),

  ('FA003',
   'Vinduer og dører er i samsvar med energikrav',
   'teknisk',
   'Kontroller at eventuelle nye vinduer eller dører tilfredsstiller U-verdikrav i TEK17, og at totalt energitap ikke øker.',
   ARRAY['fasadeendring'],
   ARRAY[]::TEXT[],
   'info',
   'TEK17 kap 14',
   35)

ON CONFLICT (id) DO NOTHING;

-- ── 5. New checkpoints for radon-tiltak ───────────────────────────────────────
INSERT INTO checkpoint_definitions
  (id, title, category, description, applies_to, required_tags, severity, legal_reference, sort_order)
VALUES
  ('RAD001',
   'Radonsperre og ventilasjonstiltak er utført',
   'teknisk',
   'Kontroller at radonsperre er lagt under gulv mot grunn, og at evt. avtrekksrør for radonventilering er installert i samsvar med prosjektering og TEK17 § 13-5.',
   ARRAY['enebolig','tomannsbolig','tilbygg','paabygg','bruksendring','garasje_carport'],
   ARRAY['har_radon_tiltak'],
   'warning',
   'TEK17 § 13-5',
   25)

ON CONFLICT (id) DO NOTHING;
