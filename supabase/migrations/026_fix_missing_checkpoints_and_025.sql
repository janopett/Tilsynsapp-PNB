-- ============================================================
-- To feil rettet:
-- 1. Setter inn sjekkpunkter som fantes i TypeScript-definisjonen
--    men aldri ble lagt til i databasen:
--    UK001, PRD001, KS001, LB001, NB001
-- 2. Gjentar alle applies_to_type_codes-oppdateringer fra
--    migrasjon 025 (den rullet tilbake pga. null-feil fra
--    subquery mot UK001 som ikke fantes).
--    Subqueries er erstattet med eksplisitte ARRAY-verdier.
-- ============================================================

-- ── 1. Sett inn manglende sjekkpunkter ───────────────────────────────────────

INSERT INTO checkpoint_definitions
  (id, title, category, description, applies_to, required_tags,
   severity, legal_reference, active, sort_order,
   applies_to_omrade, applies_to_type_codes)
VALUES

  ('UK001',
   'Uavhengig kontroll er etablert og gjennomføres',
   'formelle_forhold',
   'Kontroller at uavhengig kontrollerende er angitt i søknaden, at kontrollplan foreligger, og at stikkprøvekontroll er gjennomført for påkrevde kontrollområder (konstruksjoner, geoteknikk, brannsikkerhet, fuktsikring av våtrom).',
   ARRAY['tilbygg','paabygg','enebolig','tomannsbolig','leilighetsbygg','fritidsbolig','naeringsbygg','bruksendring'],
   ARRAY['har_ansvarlige_foretak'],
   'warning', 'SAK10 § 14-2', true, 60,
   ARRAY['Sluttdokumentasjon'],
   ARRAY[
     'Nytt bygg - Blokkbygg',
     'Nytt bygg - Over 70 m2 - ikke boligformål',
     'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal over 1000 m2',
     'Endring av bygg - Konstruksjons løsninger i bygg',
     'Endring av bygg - innvendig - Påbygg',
     'Endring av bygg - innvendig - Tilbygg med samlet areal større enn 50 m2',
     'Endring av bygg - innvendig - Fundamenter i bygg',
     'Endring av bygg - Innvendig i bygg',
     'Endring av bygg - Hovedombygging',
     'Bruksendring',
     'Ny anleggskonstruksjon',
     'Bygningstekniske installasjoner - Nytt anlegg'
   ]),

  ('PRD001',
   'Byggevarer har produktdokumentasjon (CE-merking / DoP)',
   'formelle_forhold',
   'Kontroller at vesentlige byggevarer (bærende elementer, isolasjon, vinduer, membraner m.m.) er CE-merket og at ytelseserklæring (DoP) foreligger på byggeplassen. Gjelder produkter som er dekket av harmoniserte produktstandarder.',
   ARRAY['tilbygg','paabygg','enebolig','tomannsbolig','leilighetsbygg','fritidsbolig','naeringsbygg','bruksendring'],
   ARRAY['har_ansvarlige_foretak'],
   'warning', 'pbl § 29-7, DOK-forskriften', true, 70,
   ARRAY['Produkter til byggverk'],
   ARRAY[
     'Mikrohus til boligformål - Inntil 30 m2 BRA',
     'Nytt bygg - Blokkbygg',
     'Nytt bygg - Over 70 m2 - ikke boligformål',
     'Nytt bygg - Under 70 m2 - ikke boligformål (melding)',
     'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal over 1000 m2',
     'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal under 1000 m2 (melding)',
     'Endring av bygg - Konstruksjons løsninger i bygg',
     'Endring av bygg - innvendig - Fundamenter i bygg',
     'Endring av bygg - innvendig - Påbygg',
     'Endring av bygg - innvendig - Tilbygg med samlet areal større enn 50 m2',
     'Endring av bygg - innvendig - Tilbygg med samlet areal under 50 m2 (melding)',
     'Endring av bygg - innvendig - Underbygg',
     'Endring av bygg - Innvendig i bygg',
     'Endring av bygg - Hovedombygging',
     'Bygningstekniske installasjoner - Nytt anlegg',
     'Ny anleggskonstruksjon',
     'Nytt utvendig anlegg for vann og avløp'
   ]),

  ('KS001',
   'Foretakets kvalitetssikringsrutiner er dokumentert og i bruk',
   'formelle_forhold',
   'Kontroller at ansvarlig foretak har tilpassede kvalitetssikringsrutiner for dette tiltaket (sjekklister, prosedyrer for avviksbehandling m.m.) og at disse er i aktiv bruk på byggeplassen, jf. SAK10 § 10-1.',
   ARRAY['tilbygg','paabygg','enebolig','tomannsbolig','leilighetsbygg','fritidsbolig','naeringsbygg','bruksendring'],
   ARRAY['har_ansvarlige_foretak'],
   'info', 'SAK10 § 10-1', true, 80,
   ARRAY['Sluttdokumentasjon'],
   ARRAY[
     'Nytt bygg - Blokkbygg',
     'Nytt bygg - Over 70 m2 - ikke boligformål',
     'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal over 1000 m2',
     'Endring av bygg - Konstruksjons løsninger i bygg',
     'Endring av bygg - innvendig - Påbygg',
     'Endring av bygg - innvendig - Tilbygg med samlet areal større enn 50 m2',
     'Endring av bygg - innvendig - Fundamenter i bygg',
     'Endring av bygg - Innvendig i bygg',
     'Endring av bygg - Hovedombygging',
     'Bruksendring',
     'Ny anleggskonstruksjon',
     'Bygningstekniske installasjoner - Nytt anlegg'
   ]),

  ('LB001',
   'Risikoklasse og brannklasse er korrekt fastslått',
   'brann',
   'Kontroller at byggets risikoklasse (RKL) og brannklasse (BKL) er korrekt fastslått og lagt til grunn for brannteknisk prosjektering. Flermannsboliger er normalt risikoklasse 4.',
   ARRAY['leilighetsbygg'],
   ARRAY['har_ansvarlige_foretak'],
   'critical', 'TEK17 § 11-2, § 11-4', true, 40,
   ARRAY['Sikkerhet ved brann'],
   ARRAY['Nytt bygg - Blokkbygg', 'Endring av boligene - Oppdeling av bolig']),

  ('NB001',
   'Risikoklasse og brannklasse er korrekt fastslått',
   'brann',
   'Kontroller at byggets risikoklasse (RKL) og brannklasse (BKL) er korrekt fastslått og lagt til grunn for brannteknisk prosjektering. Risikoklasse avhenger av byggets bruk og antall personer.',
   ARRAY['naeringsbygg'],
   ARRAY['har_ansvarlige_foretak'],
   'critical', 'TEK17 § 11-2, § 11-4', true, 50,
   ARRAY['Sikkerhet ved brann'],
   ARRAY[
     'Nytt bygg - Over 70 m2 - ikke boligformål',
     'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal over 1000 m2',
     'Endring av bygg - Konstruksjons løsninger i bygg'
   ])

ON CONFLICT (id) DO NOTHING;


-- ── 2. Gjenta applies_to_type_codes fra migrasjon 025 ────────────────────────
-- (025 rullet tilbake; subqueries er nå byttet ut med eksplisitte arrays)

-- FF004 — ansvarlige foretak (pbl § 23-1)
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Mikrohus til boligformål - Inntil 30 m2 BRA',
  'Endring av bygg - Innvendig i bygg',
  'Endring av bygg - Konstruksjons løsninger i bygg',
  'Endring av bygg - innvendig - Fundamenter i bygg',
  'Endring av bygg - innvendig - Påbygg',
  'Endring av bygg - innvendig - Tilbygg med samlet areal større enn 50 m2',
  'Endring av bygg - innvendig - Underbygg',
  'Endring av bygg - Annet',
  'Endring av bygg - Hovedombygging',
  'Bruksendring',
  'Nytt bygg - Blokkbygg',
  'Nytt bygg - Over 70 m2 - ikke boligformål',
  'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal over 1000 m2',
  'Endring av boligene - Oppdeling av bolig',
  'Bygningstekniske installasjoner - Endring - Særskilte installasjoner i bygg',
  'Bygningstekniske installasjoner - Nytt anlegg',
  'Ny anleggskonstruksjon',
  'Nytt utvendig anlegg for vann og avløp',
  'Endring av anlegg for vann og avløpstjenester'
]
WHERE id = 'FF004';

-- FF005 — kontrollerklæringer (SAK10 § 14-8)
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Mikrohus til boligformål - Inntil 30 m2 BRA',
  'Endring av bygg - Innvendig i bygg',
  'Endring av bygg - Konstruksjons løsninger i bygg',
  'Endring av bygg - innvendig - Fundamenter i bygg',
  'Endring av bygg - innvendig - Påbygg',
  'Endring av bygg - innvendig - Tilbygg med samlet areal større enn 50 m2',
  'Endring av bygg - innvendig - Underbygg',
  'Endring av bygg - Annet',
  'Endring av bygg - Hovedombygging',
  'Bruksendring',
  'Nytt bygg - Blokkbygg',
  'Nytt bygg - Over 70 m2 - ikke boligformål',
  'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal over 1000 m2',
  'Endring av boligene - Oppdeling av bolig',
  'Bygningstekniske installasjoner - Endring - Særskilte installasjoner i bygg',
  'Bygningstekniske installasjoner - Nytt anlegg',
  'Ny anleggskonstruksjon',
  'Nytt utvendig anlegg for vann og avløp',
  'Endring av anlegg for vann og avløpstjenester'
]
WHERE id = 'FF005';

-- BR003 — brannteknisk prosjektering TK2+ (TEK17 § 11-1)
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Nytt bygg - Blokkbygg',
  'Nytt bygg - Over 70 m2 - ikke boligformål',
  'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal over 1000 m2',
  'Endring av bygg - Konstruksjons løsninger i bygg',
  'Endring av bygg - innvendig - Påbygg',
  'Endring av bygg - innvendig - Tilbygg med samlet areal større enn 50 m2',
  'Endring av bygg - innvendig - Fundamenter i bygg',
  'Endring av bygg - Innvendig i bygg',
  'Endring av bygg - Hovedombygging',
  'Bruksendring',
  'Ny anleggskonstruksjon',
  'Bygningstekniske installasjoner - Nytt anlegg'
]
WHERE id = 'BR003';

-- BF001 — universell utforming (TEK17 § 12-1)
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Nytt bygg - Blokkbygg',
  'Nytt bygg - Over 70 m2 - ikke boligformål',
  'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal over 1000 m2',
  'Endring av bygg - Innvendig i bygg',
  'Endring av bygg - Konstruksjons løsninger i bygg',
  'Endring av bygg - Hovedombygging',
  'Bruksendring',
  'Endring av boligene - Oppdeling av bolig'
]
WHERE id = 'BF001';

-- RAD001 — radon, tiltak med gulv mot grunn (TEK17 § 13-5)
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Mikrohus til boligformål - Inntil 30 m2 BRA',
  'Nytt bygg - Blokkbygg',
  'Nytt bygg - Over 70 m2 - ikke boligformål',
  'Nytt bygg - Under 70 m2 - ikke boligformål (melding)',
  'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal over 1000 m2',
  'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal under 1000 m2 (melding)',
  'Endring av bygg - innvendig - Tilbygg med samlet areal større enn 50 m2',
  'Endring av bygg - innvendig - Tilbygg med samlet areal under 50 m2 (melding)',
  'Endring av bygg - innvendig - Underbygg',
  'Endring av bygg - innvendig - Påbygg',
  'Endring av bygg - innvendig - Fundamenter i bygg',
  'Bruksendring'
]
WHERE id = 'RAD001';

-- TOM002 — legg til innvendig bygg hvis ikke allerede satt
UPDATE checkpoint_definitions
SET applies_to_type_codes = applies_to_type_codes ||
  ARRAY['Endring av bygg - Innvendig i bygg']::TEXT[]
WHERE id = 'TOM002'
  AND NOT ('Endring av bygg - Innvendig i bygg' = ANY(applies_to_type_codes));

-- KO001 — grunnarbeid/geoteknikk (TEK17 § 9-1)
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Mikrohus til boligformål - Inntil 30 m2 BRA',
  'Nytt bygg - Blokkbygg',
  'Nytt bygg - Over 70 m2 - ikke boligformål',
  'Nytt bygg - Under 70 m2 - ikke boligformål (melding)',
  'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal over 1000 m2',
  'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal under 1000 m2 (melding)',
  'Endring av bygg - innvendig - Tilbygg med samlet areal større enn 50 m2',
  'Endring av bygg - innvendig - Tilbygg med samlet areal under 50 m2 (melding)',
  'Endring av bygg - innvendig - Underbygg',
  'Endring av bygg - innvendig - Fundamenter i bygg',
  'Endring av bygg - innvendig - Påbygg',
  'Endring av bygg - Konstruksjons løsninger i bygg',
  'Endring av bygg - Hovedombygging',
  'Ny anleggskonstruksjon',
  'Nytt utvendig anlegg for vann og avløp'
]
WHERE id = 'KO001';
