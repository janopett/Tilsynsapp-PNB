-- ============================================================
-- Utvidet tiltakstype-mapping basert på PBL, TEK17 og SAK10.
--
-- Prinsipp: Tom matrise = gjelder alle tiltakstyper.
-- Sett kun applies_to_type_codes der sjekkpunktet klart er
-- avgrenset til bestemte søknadstyper etter regelverket.
--
-- Juridisk grunnlag for hvert sett er kommentert.
-- ============================================================

-- ── Hjelpevariabel: tiltakstyper som gjelder søknadspliktige ──────────────────
-- tiltak med ansvarlige foretak (typisk tiltaksklasse 2+).
-- Kilde: pbl § 23-1, SAK10 kap. 10 og 14.
-- Brukes for FF004, FF005, UK001, KS001, BR003.

-- ── FF004 — Ansvarlige foretak i samsvar med søknaden ────────────────────────
-- Pbl § 23-1: ansvarsrett kreves ved søknadspliktige tiltak i TK 2 og 3.
-- Meldingspliktige tiltak "(melding)" trenger ikke ansvarlig foretak.
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
  'Endring av driftsbygg/landbruksbygg under 5000 m2 (BRA) (melding)',
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

-- ── FF005 — Kontrollerklæringer foreligger ────────────────────────────────────
-- SAK10 § 14-8: kontrollerklæringer kun ved tiltak med ansvarlig kontrollerende.
-- Samme type-sett som FF004.
UPDATE checkpoint_definitions
SET applies_to_type_codes = (
  SELECT applies_to_type_codes FROM checkpoint_definitions WHERE id = 'FF004'
)
WHERE id = 'FF005';

-- ── UK001 — Uavhengig kontroll er etablert ────────────────────────────────────
-- SAK10 § 14-2: uavhengig kontroll påkrevd for tiltaksklasse 2 og 3.
-- TK2+ inkluderer: leilighetsbygg, næringsbygg over visse størrelser,
-- konstruksjonsendringer og større tilbygg.
-- Meldingspliktige tiltak og enkel TK1-bygging er unntatt.
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
WHERE id = 'UK001';

-- ── KS001 — Kvalitetssikringsrutiner dokumentert ─────────────────────────────
-- SAK10 § 10-1: KS-rutiner kreves av alle ansvarlige foretak.
-- Gjelder samme type-sett som UK001 (TK2+ tiltak).
UPDATE checkpoint_definitions
SET applies_to_type_codes = (
  SELECT applies_to_type_codes FROM checkpoint_definitions WHERE id = 'UK001'
)
WHERE id = 'KS001';

-- ── BR003 — Brannteknisk prosjektering er fulgt ───────────────────────────────
-- TEK17 § 11-1: brannteknisk prosjektering kreves ved TK2+ bygg.
-- Gjelder samme type-sett som UK001.
UPDATE checkpoint_definitions
SET applies_to_type_codes = (
  SELECT applies_to_type_codes FROM checkpoint_definitions WHERE id = 'UK001'
)
WHERE id = 'BR003';

-- ── BF001 — Universell utforming er ivaretatt ────────────────────────────────
-- TEK17 § 12-1: UU-krav gjelder boligbygning med krav om heis
-- (leilighetsbygg ≥ 3 etasjer) samt arbeids- og publikumsbygninger.
-- Gjelder IKKE enebolig, småhus eller meldingspliktige tiltak.
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

-- ── PRD001 — Produktdokumentasjon (CE-merking / DoP) ─────────────────────────
-- Pbl § 29-7 og DOK-forskriften: CE-krav gjelder ved bruk av byggevarer
-- i bærende konstruksjoner, isolasjon, membraner m.m.
-- Gjelder alle nybygg og vesentlige endringer som bruker byggevareprodukter.
-- Gjelder IKKE: riving, oppretting av matrikkelenhet, veg, skilt, antenne.
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
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
  'Endring av driftsbygg/landbruksbygg under 5000 m2 (BRA) (melding)',
  'Bygningstekniske installasjoner - Nytt anlegg',
  'Ny anleggskonstruksjon',
  'Nytt utvendig anlegg for vann og avløp'
]
WHERE id = 'PRD001';

-- ── RAD001 — Radonsperre og ventilasjonstiltak ────────────────────────────────
-- TEK17 § 13-5: radonkrav gjelder bygninger med rom for varig opphold
-- mot grunnen. Gjelder nybygg og tilbygg/påbygg med ny grunnkontakt.
-- Gjelder IKKE: fasadeendring, riving, rene installasjoner uten grunnkontakt.
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

-- ── TOM002 — Lydkrav mellom boenheter ────────────────────────────────────────
-- TEK17 § 13-6: lydkrav gjelder mellom separate boenheter.
-- Legg til Sammenslåing er IKKE relevant (færre enheter = ikke nytt skille).
-- Legg til Endring av bygg - Innvendig i bygg (kan berøre skiller).
UPDATE checkpoint_definitions
SET applies_to_type_codes = applies_to_type_codes ||
  ARRAY['Endring av bygg - Innvendig i bygg']::TEXT[]
WHERE id = 'TOM002'
  AND NOT ('Endring av bygg - Innvendig i bygg' = ANY(applies_to_type_codes));

-- ── KO001 — Grunnarbeid utført etter godkjent prosjektering ──────────────────
-- TEK17 § 9-1: geotekniske krav gjelder ved tiltak med grunnarbeider.
-- Gjelder nybygg, vesentlige utvidelser og anleggskonstruksjoner.
-- Gjelder IKKE: fasadeendring, riving av enkeltdeler, rene installasjoner.
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
