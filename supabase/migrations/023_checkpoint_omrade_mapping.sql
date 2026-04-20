-- ============================================================
-- Koble sjekkpunkter til befaringsområde (applies_to_omrade)
-- basert på faglig innhold.
--
-- VIKTIG: Verdiene MÅ stemme overens med Code/Description
-- som returneres av SIF GetCodeTableRows for kodetabellen
-- "code table: eBy Supervision area".
-- Verifiser i PNB 360 Admin > Kodetabeller og juster via
-- admin-panelet om nødvendig.
--
-- Tom matrise (standard) = sjekkpunktet gjelder for ALLE
-- befaringsområder. Dette er den trygge standardverdien.
--
-- applies_to_type_codes settes IKKE her — tiltakstype-koder
-- må hentes fra SIF-kodetabellen "code table: eBy Measure type"
-- og knyttes manuelt via admin-panelet per sjekkpunkt.
-- ============================================================

-- ── Konstruksjon: bærende konstruksjoner og grunnarbeid ───────────────────────
-- Disse kontrollerer strukturell sikkerhet og geoteknikk.
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Sikkerhet, bæreevne']
WHERE id IN ('KO001', 'KO002', 'KO003');

-- ── Brann: brannskiller, rømningsveier, brannteknisk prosjektering ────────────
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Brannsikkerhet']
WHERE id IN ('BR001', 'BR002', 'BR003', 'TOM001', 'LB001', 'NB001');

-- ── Fukt og overvann: våtrom, drenering, VA-tilkobling ───────────────────────
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Fuktsikring']
WHERE id IN ('FU001', 'FU002', 'FU003', 'FU004');

-- ── Energibruk: energikrav og vinduers energiytelse ──────────────────────────
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Energibruk']
WHERE id IN ('TK003', 'FA003');

-- ── Tilgjengelighet: universell utforming ────────────────────────────────────
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Tilgjengelighet']
WHERE id IN ('BF001');

-- ── Sikkerhet, bæreevne: rekkverk, naturfare, fasadebefestelse ───────────────
-- Rekkverk (BF003) og naturfare (FAR001) er sikkerhetskrav etter TEK17 § 12-17
-- og TEK17 kap. 7 — hører under "Sikkerhet, bæreevne" som overordnet tilsynsområde.
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Sikkerhet, bæreevne']
WHERE id IN ('BF003', 'FAR001');

-- ── Ventilasjon: inneklima ────────────────────────────────────────────────────
-- TK002 ventilasjon hører under energi/inneklima-kontroll.
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Energibruk']
WHERE id IN ('TK002');

-- ── Radon: ────────────────────────────────────────────────────────────────────
-- Radon er teknisk inneklima/fuktsikring-tiltak.
UPDATE checkpoint_definitions
SET applies_to_omrade = ARRAY['Fuktsikring']
WHERE id IN ('RAD001');

-- ── Følgende checkpoints beholder tom applies_to_omrade (= gjelder alle) ──────
--
-- Formelle forhold (FF001–FF005, FA001, UK001, PRD001, KS001):
--   Disse er administrative/juridiske krav som gjelder uavhengig av tilsynsområde.
--
-- Plassering (PL001–PL003, FA002, TE001–TE002):
--   Plassering og avstandskrav er tverrfaglige og inngår i alle befaringer.
--
-- Utnyttelse/størrelse (US001–US002):
--   BRA/BYA og høyde er reguleringsplan-krav, ikke tilsynsområde-spesifikke.
--
-- Bruk/funksjon (BF002, TOM003):
--   Bruksendring og separate innganger er generelle krav.
--
-- Dokumentasjon/ferdigattest (DOK001–DOK005):
--   Ferdigattest og sluttkontroll gjelder for alle tilsynsområder.
--
-- Lyd (TOM002):
--   Lydkrav er et eget fagfelt — sett manuelt om supervision-area finnes.
--
-- Elektro (TK001):
--   El-tilsyn håndteres av DSB/el-tilsynsloven, ikke kommunens tilsynsområder.
