-- ============================================================
-- Fullstendig mapping av sjekkpunkter mot SIF-kodetabellene
-- "eBy Supervision area" og "eBy Measure type".
--
-- Del 1: Retter feil fra migrasjon 023 (feil navn brukt).
-- Del 2: Setter befaringsområde for sjekkpunkter som manglet.
-- Del 3: Setter tiltakstype der sjekkpunktet klart er
--        avgrenset til bestemte tiltakstyper.
--
-- Tom matrise = sjekkpunktet gjelder for ALLE verdier.
-- Alle Description-verdier er hentet fra kodetabellene i SIF.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- DEL 1 — Korriger feil befaringsområde-navn fra mig. 023
-- ══════════════════════════════════════════════════════════════

-- "Brannsikkerhet" er ikke en verdi i "eBy Supervision area"
-- → rett navn er "Sikkerhet ved brann"
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Sikkerhet ved brann']
WHERE applies_to_omrade @> ARRAY['Brannsikkerhet'];

-- "Fuktsikring" finnes ikke → "Miljø og helse"
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Miljø og helse']
WHERE applies_to_omrade @> ARRAY['Fuktsikring'];

-- "Tilgjengelighet" finnes ikke → "Planløsning, UU"
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Planløsning, UU']
WHERE applies_to_omrade @> ARRAY['Tilgjengelighet'];


-- ══════════════════════════════════════════════════════════════
-- DEL 2 — Befaringsområde for sjekkpunkter som manglet i 023
-- ══════════════════════════════════════════════════════════════

-- ── Plassering ────────────────────────────────────────────────
-- Avstand til nabogrense, situasjonsplan, støttemur, terreng,
-- høyde og utnyttelse kontrolleres under Plassering.
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Plassering']
WHERE id IN (
  'PL001',  -- Avstand til nabogrense overholdt
  'PL002',  -- Plassering stemmer med situasjonsplan
  'PL003',  -- Høyde på støttemur
  'FA002',  -- Fasadeendring i tråd med plan og estetikk
  'TE001',  -- Terrengendring i samsvar med godkjent plan
  'TE002',  -- Naboeiendom og vei ikke skadet
  'US001',  -- BRA/BYA innenfor tillatt utnyttelse
  'US002'   -- Høyde innenfor tillatt grense
);

-- ── Planløsning, UU ───────────────────────────────────────────
-- Separate innganger og bruksendring-gjennomføring knyttes til
-- planløsning/funksjonsoppfyllelse.
-- (BF001 er allerede rettet ovenfor fra "Tilgjengelighet")
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Planløsning, UU']
WHERE id IN (
  'TOM003', -- Separate innganger og adkomst
  'BF002'   -- Bruksendring er fagmessig gjennomført
);

-- ── Produkter til byggverk ────────────────────────────────────
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Produkter til byggverk']
WHERE id = 'PRD001';  -- CE-merking og DoP

-- ── Installasjoner og anlegg ──────────────────────────────────
-- Elektriske installasjoner og VA-tilkobling er tekniske
-- installasjonsanlegg.
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Installasjoner og anlegg']
WHERE id IN (
  'TK001',  -- Elektriske installasjoner
  'FU004'   -- VA-tilkobling
);

-- ── Sluttdokumentasjon ────────────────────────────────────────
-- Ferdigattest, kontrollerklæringer, tegningsarkiv,
-- uavhengig kontroll og KS-rutiner er alle
-- sluttdokumentasjonskrav.
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Sluttdokumentasjon']
WHERE id IN (
  'DOK001', -- Ferdigattest/midlertidig brukstillatelse
  'DOK002', -- Sluttkontrollerklæring
  'DOK003', -- Tegninger/dokumentasjon à jour
  'FF005',  -- Kontrollerklæringer foreligger
  'UK001',  -- Uavhengig kontroll etablert
  'KS001'   -- Kvalitetssikringsrutiner dokumentert
);

-- ── Avfallsplaner, miljøsanering ──────────────────────────────
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Avfallsplaner, miljøsanering']
WHERE id IN (
  'DOK004', -- Riving ferdigstilt og dokumentert
  'DOK005'  -- Farlig avfall fra riving håndtert korrekt
);

-- ── Miljø og helse: legg til TOM002 (lyd) ────────────────────
-- Lydkrav mellom boenheter har helseaspekt → Miljø og helse.
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Miljø og helse']
WHERE id = 'TOM002';  -- Lydkrav mellom boenheter

-- ── Sjekkpunkter uten befaringsområde (gjelder alle) ─────────
-- FF001 Søknad og tillatelse foreligger           → alle
-- FF002 Tiltaket er i samsvar med tillatelsen     → alle
-- FF003 Dispensasjon er innvilget                 → alle
-- FF004 Ansvarlige foretak i samsvar med søknaden → alle
-- FA001 Fasade i samsvar med godkjente tegninger  → alle


-- ══════════════════════════════════════════════════════════════
-- DEL 3 — Tiltakstype (applies_to_type_codes)
-- Bruker Description-verdier fra "eBy Measure type".
-- Tom matrise = sjekkpunktet gjelder alle tiltakstyper.
-- ══════════════════════════════════════════════════════════════

-- ── Fasadeendring-spesifikke sjekkpunkter ─────────────────────
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Endring av bygg - innvendig - fasade'
]
WHERE id IN (
  'FA001',  -- Fasade i samsvar med godkjente tegninger
  'FA002',  -- Fasadeendring i tråd med plan og estetikk
  'FA003'   -- Vinduer og dører i samsvar med energikrav
);

-- ── Bruksendring-spesifikke sjekkpunkter ──────────────────────
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Bruksendring',
  'Bruksendring fra tilleggsdel til hoveddel (melding)'
]
WHERE id = 'BF002';  -- Bruksendring er fagmessig gjennomført

-- ── Riving-spesifikke sjekkpunkter ───────────────────────────
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Riving av bygning under 70 m2 (melding)',
  'Riving av deler av bygg',
  'Riving av driftsbygg/landbruksbygg inntil 1000 m2 (melding)',
  'Riving av tilbygg inntil 50 m2 (melding)',
  'Riving av anlegg'
]
WHERE id IN (
  'DOK004', -- Riving ferdigstilt og dokumentert
  'DOK005'  -- Farlig avfall håndtert korrekt
);

-- ── Leilighetsbygg/blokkbygg-spesifikke sjekkpunkter ─────────
-- LB001 gjelder risikoklasse/brannklasse for flermannsboliger.
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Nytt bygg - Blokkbygg',
  'Endring av boligene - Oppdeling av bolig'
]
WHERE id = 'LB001';

-- ── Næringsbygg-spesifikke sjekkpunkter ──────────────────────
-- NB001 gjelder risikoklasse for næringsbygg/yrkesbygg.
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Nytt bygg - Over 70 m2 - ikke boligformål',
  'Nytt bygg - Driftsbygg/landbruksbygg med samlet areal over 1000 m2',
  'Endring av bygg - Konstruksjons løsninger i bygg'
]
WHERE id = 'NB001';

-- ── Boligdeling/tomannsbolig-spesifikke sjekkpunkter ─────────
-- TOM001-TOM003 er relevant ved deling av bolig og blokkbygg.
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Nytt bygg - Blokkbygg',
  'Endring av boligene - Oppdeling av bolig',
  'Endring av bygg - Konstruksjons løsninger i bygg'
]
WHERE id IN (
  'TOM001', -- Brannskille mellom boenheter
  'TOM002', -- Lydkrav mellom boenheter
  'TOM003'  -- Separate innganger og adkomst
);

-- ── VA-anlegg: FU003 og FU004 ─────────────────────────────────
-- VA-tilkobling og overvann er særlig relevant for nybygg og
-- utvendig VA-anlegg.
UPDATE checkpoint_definitions
SET applies_to_type_codes = ARRAY[
  'Nytt utvendig anlegg for vann og avløp',
  'Endring av anlegg for vann og avløpstjenester',
  'Endring av bygg - Innvendig i bygg',
  'Nytt bygg - Blokkbygg',
  'Nytt bygg - Over 70 m2 - ikke boligformål',
  'Mikrohus til boligformål - Inntil 30 m2 BRA'
]
WHERE id IN (
  'FU003',  -- Overvannshåndtering
  'FU004'   -- VA-tilkobling
);
