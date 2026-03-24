# Tilsynsapp-PNB — Executive Summary

**Et digitalt verktøy for effektiv byggetilsyns­gjennomføring og automatisk arkivering**

---

## Problemet vi løser

Tradisjonell gjennomføring av byggetilsyn er papirbasert og tidkrevende:

- Inspektører bruker manuelle sjekklister og håndskrevne notater i felt
- Tilsynsrapporter skrives om fra bunnen av etter hvert besøk
- Dokumenter arkiveres manuelt i kommunens saksbehandlingssystem
- Risiko for at funn forsvinner, feil dokumentnummer brukes, eller arkivering glemmes

Dette skaper merarbeid for inspektørene, forsinkelser i saksbehandlingen og potensielle avvik i dokumentasjonen.

---

## Løsningen

**Tilsynsapp-PNB** er en webapplikasjon som digitaliserer hele tilsynsprosessen — fra forberedelse til arkivering — i én sammenhengende arbeidsflyt.

```
Forberedelse  →  Gjennomføring i felt  →  Rapportgenerering  →  Arkivering i 360°
  (5 min)           (på stedet)              (automatisk)          (ett klikk)
```

Inspektøren arbeider i nettleseren på PC, nettbrett eller mobil. Når tilsynet er fullført, genereres rapporten automatisk og arkiveres direkte i kommunens Plan & Bygg-system (Public 360°).

---

## Nøkkelfunksjoner

### For inspektøren i felt

| Funksjon | Verdi |
|----------|-------|
| Strukturert sjekkliste | 100+ standardiserte sjekkpunkter, automatisk filtrert etter tiltakstype |
| Avviksregistrering | Marker funn med kommentar direkte på sjekkpunktet |
| Vedlegg | Last opp bilder og dokumenter fra tilsynsstedet |
| Karttilknytning | Plasser tilsynet geografisk med ett trykk |
| Sakssøk | Søk opp saken fra PNB direkte i appen — ingen manuell kopiering |

### For organisasjonen

| Funksjon | Verdi |
|----------|-------|
| Automatisk PDF-rapport | Ferdig formatert tilsynsrapport genereres uten manuelt arbeid |
| Arkivering med ett klikk | Rapporten sendes direkte til riktig sak i Public 360° — opprett nytt dokument eller oppdater et eksisterende |
| Sporbarhet | Alle tilsyn, avvik og arkiveringer er loggede og søkbare |
| Brukeradministrasjon | Enkel styring av tilganger via admin-panel |
| Audit-logg | Alle admin-handlinger logges automatisk (ISO 27001 A.12.4.1) |

---

## Integrasjon med eksisterende systemer

Appen er bygget for å leve **inne i** kommunens eksisterende infrastruktur — ikke ved siden av den:

- **Public 360° / Løsøre** — Saker, parter, eiendom og dokumenter hentes og lagres direkte via SIF-API
- **Kommunal innlogging** — Støtter Azure AD via OAuth2 (samme innlogging som resten av kommunens systemer)
- **Nettleserbasert** — Ingen installasjon, fungerer på alle enheter

---

## Gevinster

### Tidsbesparelse per tilsyn
- Eliminerer dobbeltarbeid med omskriving av rapport etter besøk
- Automatisk arkivering erstatter manuell dokumenthåndtering
- Sakssøk direkte i appen — slipper å bytte mellom systemer

### Kvalitet og etterlevelse
- Standardiserte sjekklister sikrer at ingenting glemmes
- Lovhenvisninger er koblet til sjekkpunktene (teknisk forskrift, plan- og bygningsloven)
- Komplett sporbarhet fra tilsyn til arkiv

### Skalerbarhet
- Sjekkpunkter og lister kan konfigureres uten utvikling
- Nye tiltakstyper legges til via admin-panel
- Rollestyrt tilgang — skiller mellom inspektør og administrator

---

## Teknisk plattform

Applikasjonen er bygget på moderne, vedlikeholdsvennlig teknologi:

- **Webapplikasjon** (Next.js / React) — fungerer i alle nettlesere, ingen app-installasjon
- **Databasevert**: Supabase (PostgreSQL) med full kryptering og tilgangskontroll (RLS)
- **Hosting**: Vercel — automatisk skalering, ingen serveradministrasjon
- **Sikkerhet**: HTTPS, HSTS, CSP-headers, audit-logging, rollebasert tilgang

---

## Status og veikart

| Status | Område |
|--------|--------|
| ✅ Produksjonsklar | Tilsynsgjennomføring og sjekklister |
| ✅ Produksjonsklar | PDF-rapportgenerering |
| ✅ Produksjonsklar | Arkivering til Public 360° — opprett nytt eller oppdater eksisterende dokument |
| ✅ Produksjonsklar | Bruker- og tilgangsadministrasjon |
| ✅ Produksjonsklar | Audit-logging (ISO 27001) |
| 🔄 Konfigurerbart | Tilpasning av sjekkpunkter og lister per kommune |

---

## Kontakt og neste steg

For demo, teknisk gjennomgang eller spørsmål om tilpasning til din kommunes oppsett — ta kontakt med prosjektansvarlig.

---

*Tilsynsapp-PNB — utviklet for norske kommuner med Plan & Bygg-integrasjon*
