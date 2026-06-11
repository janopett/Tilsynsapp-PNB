# Tilsynsapp-PNB — Executive Summary

**Et digitalt verktøy for effektiv gjennomføring av befaringer og automatisk arkivering**

---

## Problemet vi løser

Tradisjonell gjennomføring av befaringer er papirbasert og tidkrevende:

- Inspektører bruker manuelle sjekklister og håndskrevne notater i felt
- Befaringsrapporter skrives om fra bunnen av etter hvert besøk
- Dokumenter arkiveres manuelt i kommunens saksbehandlingssystem
- Risiko for at funn forsvinner, feil dokumentnummer brukes, eller arkivering glemmes

Dette skaper merarbeid for inspektørene, forsinkelser i saksbehandlingen og potensielle avvik i dokumentasjonen.

---

## Løsningen

**Tilsynsapp-PNB** er en webapplikasjon som digitaliserer hele befaringsprosessen — fra forberedelse til arkivering — i én sammenhengende arbeidsflyt.

```
Forberedelse  →  Gjennomføring i felt  →  Rapportgenerering  →  Arkivering i 360°
  (5 min)           (på stedet)              (automatisk)          (ett klikk)
```

Inspektøren arbeider i nettleseren på PC, nettbrett eller mobil. Når befaringen er fullført, genereres rapporten automatisk og arkiveres direkte i kommunens Plan & Bygg-system (Public 360°).

---

## Nøkkelfunksjoner

### For inspektøren i felt

| Funksjon | Verdi |
|----------|-------|
| Strukturert sjekkliste | 100+ standardiserte sjekkpunkter, automatisk filtrert etter tiltakstype, eiendomsegenskaper, befaringsområde og tiltakstype fra PNB |
| Befaringsområde og tiltakstype | Multi-select klassifisering hentet direkte fra PNB-kodetabellene — styrer hvilke sjekkpunkter som vises |
| Avviksregistrering | Marker funn med kommentar, ansvarlig kontakt og GPS-koordinater direkte på sjekkpunktet |
| Vedlegg | Last opp bilder og dokumenter fra befaringsstedet, koblet til enkeltpunkter. Adressen hentes automatisk fra GPS-data i bildet og stemples inn på bildet |
| Karttilknytning | Plasser befaringen geografisk med ett trykk |
| Sakssøk | Søk opp saken fra PNB direkte i appen — ingen manuell kopiering eller systembytte |
| Mine PNB-saker | Oversiktsfane som viser alle saker i PNB der innlogget bruker er ansvarlig — med eiendommer, kontakter, behandlingstrinn og frister direkte i dashbordet |

### For organisasjonen

| Funksjon | Verdi |
|----------|-------|
| Automatisk PDF-rapport | Ferdig formatert befaringsrapport genereres uten manuelt arbeid — inkluderer saksopplysninger, sjekkliste, avviksoppsummering, bilder og kart |
| Arkivering med ett klikk | Rapporten sendes direkte til riktig sak i Public 360° — velg behandlingstrinn, opprett nytt dokument eller oppdater et eksisterende |
| Sporbarhet | Alle befaringer, avvik og arkiveringer er loggede og søkbare |
| Brukeradministrasjon | Enkel tilgangsstyring via admin-panel — ingen IT-avdeling nødvendig |
| Audit-logg | Alle admin-handlinger logges automatisk (ISO 27001 A.12.4.1) |

---

## Integrasjon med eksisterende systemer

Appen er bygget for å leve **inne i** kommunens eksisterende infrastruktur — ikke ved siden av den:

- **Public 360° / Plan & Bygg** — Saker, parter, eiendom og dokumenter hentes og lagres direkte via SIF-API. Ingen dobbeltregistrering.
- **Kommunal innlogging** — Støtter Azure AD via OAuth2 (samme single sign-on som resten av kommunens systemer)
- **Nettleserbasert** — Ingen installasjon, fungerer på alle enheter (PC, nettbrett, mobil)

---

## Gevinster

### Tidsbesparelse per tilsyn

**Eksempel: tilsyn på ny enebolig med 3 avvik**

#### Slik gjøres det i dag

| Steg | Beskrivelse | Tid |
|------|-------------|-----|
| Forberedelse | Les gjennom relevant dokumentasjon, tegninger og historikk; søk opp saken i PNB, noter saksnummer, adresse, søker og tiltakstype | 130 min |
| På stedet | Gjennomfør tilsynet med løpende notater på mobil eller papir; ta bilder på telefon | 60 min |
| Skriv rapport | Åpne Word-dokumentet i PNB, gå gjennom notater og bilder, skriv rapport, sett inn bilder fra telefon | 60 min |
| Arkivering | Ferdigstill og ekspeder dokumentet i PNB | 10 min |
| **Totalt** | | **260 min** |

#### Med Tilsynsapp-PNB

| Steg | Beskrivelse | Tid |
|------|-------------|-----|
| Forberedelse | Les gjennom relevant dokumentasjon, tegninger og historikk; søk opp saken i appen — adresse, søker, eiendom og tiltakstype hentes automatisk fra PNB | 122 min |
| På stedet | Gjennomfør tilsynet med strukturert sjekkliste, registrer avvik med kommentar, ta bilder direkte koblet til hvert sjekkpunkt | 60 min |
| Rapport og arkivering | Trykk «Generer rapport», trykk «Arkiver» — PDF sendes direkte til riktig sak i PNB | 2 min |
| **Totalt** | | **184 min** |

#### Resultat

| | I dag | Med appen | Spart |
|-|-------|-----------|-------|
| Selve tilsynet (uendret) | 60 min | 60 min | — |
| Forberedelse og etterarbeid | 200 min | 124 min | **76 min** |
| **Totalt per tilsyn** | **260 min** | **184 min** | **76 min (29 %)** |

En saksbehandler med **2 tilsyn per uke** sparer rundt **2,5 time per uke** — tilsvarende cirka **100 timer, eller 2,5 arbeidsuke, per år**.

### Kvalitet og etterlevelse
- Standardiserte sjekklister sikrer at ingenting glemmes — 100+ sjekkpunkter med lovhenvisninger (teknisk forskrift, plan- og bygningsloven)
- Ansvarlig kontakt kan registreres per avvik for tydelig ansvarsplassering
- Komplett sporbarhet fra tilsyn til arkivert dokument i 360°

### Skalerbarhet
- Sjekkpunkter og dropdown-lister konfigureres uten utviklingsarbeid via admin-panel
- Nye tiltakstyper, tilsynsområder og -typer legges til via brukergrensesnittet
- Rollestyrt tilgang — skiller mellom inspektør og administrator

---

## Teknisk plattform

Applikasjonen er bygget på moderne, vedlikeholdsvennlig teknologi uten enkeltpunkter for svikt:

- **Webapplikasjon** (Next.js 15 / React 19) — fungerer i alle moderne nettlesere, ingen app-installasjon
- **Database**: Supabase (PostgreSQL) med full kryptering og rad-nivå tilgangskontroll (RLS)
- **Fillagring**: Supabase Storage — vedlegg lagres sikkert med tilgangskontroll
- **Hosting**: Vercel — automatisk skalering, ingen serveradministrasjon, globalt CDN
- **Sikkerhet**: HTTPS overalt, HSTS, CSP-headers, audit-logging, rollebasert tilgang, hemmeligheter eksponeres aldri til nettleseren
- **Kodekvalitet**: Biome (linting + formatering), SonarQube-integrasjon og TypeScript strict mode

### Ytelse

Arkiveringsflyten er optimalisert for hastighet gjennom parallell kjøring:
- SIF-saksoppslag starter umiddelbart parallelt med databasespørringer
- PDF-generering kjøres parallelt med innsetting av ventende arkiveringspost
- Filopplasting og deltaker-synkronisering kjøres parallelt
- Kartbilde-henting (Kartverket WMS) kjøres parallelt med nedlasting av vedlegg

---

## Status og veikart

| Status | Område |
|--------|--------|
| ✅ Produksjonsklar | Tilsynsgjennomføring og strukturerte sjekklister |
| ✅ Produksjonsklar | PDF-rapportgenerering med innebygde bilder, avviksoppsummering, lovhenvisninger per avvik og frist for lukking (SAK10 § 15-3) |
| ✅ Produksjonsklar | Arkivering til Public 360° — opprett nytt eller oppdater eksisterende dokument |
| ✅ Produksjonsklar | Automatisk utsending av arkiverte dokumenter til mottakere |
| ✅ Produksjonsklar | Bruker- og tilgangsadministrasjon |
| ✅ Produksjonsklar | Audit-logging (ISO 27001 A.12.4.1) |
| 🔄 Konfigurerbart | Sjekkpunkt-bibliotek og dropdown-lister tilpasset per kommune |
| 🔄 Konfigurerbart | SIF-arkivkoder, kontaktroller og tittelmal settes per installasjon |

---

## Kontakt og neste steg

For demo, teknisk gjennomgang eller spørsmål om tilpasning til din kommunes oppsett — ta kontakt med prosjektansvarlig.

---

*Tilsynsapp-PNB — utviklet for norske kommuner med Plan & Bygg-integrasjon*
