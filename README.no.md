# Tilsynsapp-PNB

Webapplikasjon for gjennomføring og arkivering av befaringer i kommunen. Inspektører fyller ut strukturerte sjekklister, genererer befaringsrapporter og sender disse direkte til kommunens arkivsystem (Plan & Bygg / Public 360°) via SIF-API-integrasjon.

---

## Innhold

- [Funksjoner](#funksjoner)
- [Teknologi](#teknologi)
- [Kom i gang](#kom-i-gang)
- [Miljøvariabler](#miljøvariabler)
- [Databasemigrasjoner](#databasemigrasjoner)
- [Arkitektur](#arkitektur)
- [SIF-integrasjon](#sif-integrasjon)
- [Arkiveringsflyt](#arkiveringsflyt)
- [Admin-funksjonalitet](#admin-funksjonalitet)
- [Testing](#testing)
- [Universell utforming](#universell-utforming-wcag-21-aa)
- [Sikkerhet](#sikkerhet)

---

## Funksjoner

### Inspektører

| Funksjon | Beskrivelse |
|----------|-------------|
| Ny befaring | Flertrinns skjema med saksreferanse, eiendomsdata og tiltakstype |
| Befaringsområde og tiltakstype | Multi-select klassifisering hentet direkte fra PNB-kodetabellene «eBy Supervision area» og «eBy Measure type» — brukes til å filtrere hvilke sjekkpunkter som vises |
| Strukturert sjekkliste | 100+ sjekkpunkter fordelt på kategorier, dynamisk filtrert etter tiltakstype, eiendomsegenskaper, befaringsområde og tiltakstype fra PNB |
| Registrering av funn | Registrer status per sjekkpunkt (ok / avvik / ikke kontrollert) med kommentar, ansvarlig kontakt og GPS-koordinater |
| Vedlegg | Last opp bilder og dokumenter til enkeltpunkter eller befaringen generelt. Bilder med GPS-data i EXIF (f.eks. tatt med mobilkamera med stedstjeneste) får adressen automatisk stemplet inn på bildet (reverse geocoding via Nominatim); faller tilbake til koordinater hvis oppslaget mislykkes |
| PDF-rapport | Generer profesjonell befaringsrapport med saksopplysninger, sjekkliste, avviksoppsummering, innebygde bilder og kart |
| Arkivering | Send ferdig befaring til kommunens arkivsystem (Public 360°) — opprett nytt dokument eller oppdater et eksisterende |
| Dashboard | Oversikt over aktive og arkiverte befaringer med filtrering etter status, dato og eiendom |
| Mine PNB-saker | Egen dashbordfane som henter alle saker fra PNB der innlogget bruker er ansvarlig saksbehandler — viser eiendommer, kontakter, behandlingstrinn og frister |
| Saksfil-visning | Filer-fanen på hver befaring viser alle dokumenter fra tilknyttet PNB-sak. PDF-filer åpnes i innebygd iframe-viewer (bytes hentes via proxy → Blob → `URL.createObjectURL`); bilder åpnes i lysboks; andre filtyper lastes ned direkte |
| Kartplukking | Velg koordinater for befaringsstedet via interaktivt OpenStreetMap-kart |
| Mørkt/lyst tema | Automatisk systemtema med manuell overstyring (lys/mørk/system) |

### SIF-integrasjon (Plan & Bygg / Public 360°)

- Sakssøk og oppslag av eiendom og parter direkte fra PNB
- Automatisk innlasting av behandlingstrinn basert på saksnummer; inspektøren velger trinn i arkiveringspanelet for å knytte dokumentet til riktig trinn i 360° via `AdditionalFields.ToStage`
- Synkronisering av eksterne deltakere (f.eks. brannvernleder) til 360° som kontaktpersoner
- Automatisk oppretting av dokument med PDF-rapport, JSON-metadata og vedlegg
- **Oppdatering av eksisterende dokument** — hent dokumenter som allerede ligger på saken og legg til ny versjon
- Automatisk utsending (auto-dispatch) av dokumenter etter arkivering
- Støtter to autentiseringsmoduser:
  - **AuthKey** — enkel nøkkelbasert tilgang (GUID-header)
  - **OAuth2 Client Credentials (combined_daemon)** — Azure AD enterprise-autentisering

---

## Teknologi

| Lag | Valg |
|-----|------|
| Rammeverk | Next.js 15 (App Router, TypeScript strict mode) |
| UI-bibliotek | React 19 |
| Styling | Tailwind CSS v4 med mørkt tema |
| Internasjonalisering | next-intl (norsk / engelsk via cookie) |
| Database | Supabase (PostgreSQL) |
| Autentisering | Supabase Auth (e-post + passord, JWT, cookie-sesjoner via @supabase/ssr) |
| Fillagring | Supabase Storage |
| PDF-generering | jsPDF + jspdf-autotable + pdf-lib (sammenslåing av vedlegg) |
| Kart | OpenStreetMap (klient-side Leaflet) + Kartverket WMS (statisk kart server-side) |
| Ekstern integrasjon | SIF API – Public 360° (RPC over HTTPS) |
| Linting / formatering | Biome (erstatter ESLint + Prettier) |
| Pakkebehandler | Bun |
| Deployment | Vercel |
| Testing | Jest |
| Kodekvalitet | SonarQube (`sonar-project.properties`) |

---

## Kom i gang

### Forutsetninger

- [Bun](https://bun.sh) (erstatter Node.js / npm)
- Et Supabase-prosjekt (eller lokal Supabase via `supabase start`)

### Installasjon

```bash
git clone <repo-url>
cd Tilsynsapp-PNB
bun install
cp .env.example .env.local   # Fyll inn verdier, se tabellen nedenfor
bun run dev                  # Starter på http://localhost:3000
```

### Tilgjengelige kommandoer

```bash
bun run dev           # Utviklingsserver
bun run build         # Produksjonsbygg
bun run start         # Start produksjonsserver
bun run lint          # Biome (sjekk + rett)
bun run format        # Biome (kun formatering)
bun run typecheck     # TypeScript-typesjekk (tsc --noEmit)
bun run test          # Kjør tester
bun run test:watch    # Tester med watch-modus
bun run test:coverage # Testdekningsrapport
bun run db:generate   # Generer Supabase TypeScript-typer fra schema
bun run set-admin     # Gi admin-tilgang til en bruker (via e-post)
```

---

## Miljøvariabler

Kopier `.env.example` til `.env.local` og fyll inn verdiene.

### Supabase

| Variabel | Beskrivelse |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL til Supabase-prosjektet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Offentlig anon-nøkkel (trygg å eksponere til nettleseren) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role-nøkkel — kun server, eksponeres aldri til nettleseren |

### SIF / Public 360°

| Variabel | Beskrivelse |
|----------|-------------|
| `SIF_BASE_URL` | Basis-URL til 360°-instansen, f.eks. `https://kunde.public360online.com` |
| `SIF_RPC_PATH` | RPC-sti, typisk `/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC` |
| `SIF_AUTH_MODE` | `authkey` eller `combined_daemon` |
| `SIF_AUTHKEY` | API-nøkkel (GUID) for authkey-modus |
| `SIF_BEARER_TOKEN_URL` | Azure AD token-endepunkt (combined_daemon) |
| `SIF_CLIENT_ID` | OAuth2 klient-ID, sendes som `ClientID`-header |
| `SIF_CLIENT_SECRET` | OAuth2 klient-hemmelighet |
| `SIF_CLIENT_ID_OAUTH` | OAuth2 applikasjons-ID for tokenforespørsler |
| `SIF_SCOPE` | OAuth2 scope, f.eks. `api://…/.default` |
| `SIF_TIMEOUT_MS` | Timeout for API-kall i ms (standard: `30000`) |

### Annet

| Variabel | Beskrivelse |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Produksjons-URL (brukes av Vercel) |

> SIF-innstillinger kan også konfigureres via admin-grensesnittet (`/dashboard/admin/sif-config`). Innstillinger i databasen overstyrer miljøvariabler. En intern cache (60 sek TTL) unngår gjentatte DB-oppslag per RPC-kall.

---

## Databasemigrasjoner

Migrasjoner ligger i `supabase/migrations/` og kjøres via Supabase CLI:

```bash
supabase db push          # Kjør migrasjoner mot remote-prosjekt
supabase db reset         # Nullstill lokal database og kjør alle migrasjoner på nytt
```

### Migrasjonshistorikk

| Fil | Innhold |
|-----|---------|
| `001_initial.sql` | Kjernetabeller: `inspections`, `inspection_answers`, `attachments`, `list_items` |
| `002_sif_settings.sql` | SIF-konfigurasjonstabell (`sif_settings`) |
| `005_external_participants.sql` | Eksterne deltakere (ikke del av byggesaken) |
| `010_sif_stage.sql` | Behandlingstrinn-felt på tilsyn |
| `013_auto_dispatch.sql` | Auto-dispatch-flagg i SIF-innstillinger |
| `015_checkpoint_definitions.sql` | Dynamisk sjekkpunkt-bibliotek i databasen |
| `017_applicant_recno.sql` | Søkers 360°-recno lagret på befaringen |
| `020_audit_log.sql` | Audit-logg for admin-handlinger (ISO 27001 A.12.4.1) |
| `021_befaring_rename.sql` | Nye felt `befaringsomrade text[]` og `tiltakstype text[]` på `inspections`; `applies_to_omrade` og `applies_to_type_codes` på `checkpoint_definitions` |
| `022_measure_type_optional.sql` | `measure_type_id` gjøres valgfri (nullable) etter fjerning av Step 2 i ny-befaring-flyten |
| `023_checkpoint_omrade_mapping.sql` | Setter `applies_to_omrade` på sjekkpunkter basert på faglig innhold (første utkast, erstattes av 024) |
| `024_checkpoint_full_mapping.sql` | Fullstendig mapping mot bekreftet SIF-kodetabell: retter feil navn fra 023, setter alle befaringsområder (Plassering, Planløsning UU, Produkter til byggverk, Installasjoner og anlegg, Sluttdokumentasjon, Avfallsplaner) og setter `applies_to_type_codes` for fasade-, bruksendring-, riving-, blokkbygg- og VA-spesifikke sjekkpunkter |
| `025_checkpoint_tiltakstype_extended.sql` | Utvidet tiltakstype-mapping basert på PBL, TEK17 og SAK10: FF004/FF005 (ansvarlige foretak), UK001/KS001 (TK2+), BR003 (brannteknisk TK2+), BF001 (UU-pliktige bygg), PRD001 (CE-krav ved byggevareprodukter), RAD001 (grunnkontakt-tiltak), KO001 (geotekniske tiltak) — **rullet tilbake pga. null-feil** |
| `026_fix_missing_checkpoints_and_025.sql` | Setter inn 5 manglende sjekkpunkter (UK001, PRD001, KS001, LB001, NB001) som bare fantes i TypeScript og gjentar alle 025-oppdateringer med eksplisitte ARRAY-verdier (ingen subqueries) |
| `027_inspection_avvik_frist.sql` | Legger til `avvik_frist DATE` på `inspections` — frist for lukking av avvik, jf. SAK10 § 15-3 |
| `028_answer_frist.sql` | Legger til `frist DATE` på `inspection_answers` — per-avvik-frist for retting, vises i sjekkliste, HTML-rapport og PDF |
| `029_inspection_area_polygon.sql` | Legger til `area_polygon JSONB` på `inspections` — lagrer GeoJSON-polygon for tilsynsområdet |
| `030_user_profiles.sql` | Legger til tabellen `user_profiles` — lagrer brukerens PNB/360°-kontaktrecno (`pnb_contact_recno`) for automatisk tildeling av ViewFile-tillatelse ved arkivering |
| `031_activity_log.sql` | Legger til tabellen `activity_logs` — strukturert aktivitetslogg for saksbehandlere (tilsyn opprettet, sjekkpunkt besvart, arkivert til SIF, sakssøk) |

---

## Arkitektur

```
app/
├── api/                        # Next.js Route Handlers (server-side)
│   ├── archive/                # POST /api/archive — fullstendig arkiveringsflyt
│   │   └── preview/            # POST /api/archive/preview — forhåndsvisning uten arkivering
│   ├── inspections/            # CRUD for befaringer + svar + vedlegg
│   ├── inspection-codetables/  # GET — henter befaringsomrade / tiltakstype fra PNB-kodetabell
│   ├── admin/                  # Admin-endepunkter (krever is_admin = true)
│   │   ├── users/              # Brukeradministrasjon
│   │   ├── checkpoints/        # Sjekkpunkt-definisjoner
│   │   ├── inspection-config/  # Konfigurerbare lister (bakgrunn)
│   │   └── archivals/          # Arkiveringslogg
│   └── sif/                    # SIF-proxy-endepunkter (20+)
│       ├── case-lookup/        # Enkelt saksoppslag (saksnummer / uid / externalId)
│       ├── case-search/        # Søk etter saker på del av nummer eller tittel
│       ├── case-contacts/      # Parter på en sak
│       ├── case-stages/        # Behandlingstrinn
│       ├── case-documents/     # Eksisterende dokumenter på saken
│       ├── case-estates/       # Eiendommer knyttet til saken
│       ├── enterprise-search/  # Foretakssøk (GetEnterprises)
│       ├── my-cases/           # GET — henter PNB-saker der bruker er ansvarlig (filtrert på ResponsiblePersonName)
│       ├── pnb-case/[recno]/   # GET — henter én PNB-sak med full detalj (kontakter, trinn, milepæler)
│       ├── user-profile/       # GET/POST — les og synkroniser brukerens 360°-kontaktrecno
│       ├── code-tables/        # Arkivkoder, kategorier, statuser (admin)
│       ├── file-proxy/         # GET — last ned filer fra 360° (autentisert proxy)
│       ├── sync-contact-person/ # POST — synkroniser ekstern deltaker til 360°
│       ├── update-contact-person/ # POST — oppdater eksisterende kontakt i 360°
│       ├── settings/           # Les gjeldende SIF-konfigurasjon
│       ├── health/             # Tilkoblingskontroll
│       └── debug-raw/          # Rå RPC-kall for testing
├── dashboard/                  # Autentiserte sider
│   ├── inspections/[id]/       # Befaringsarbeidsrom (sjekkliste, vedlegg, arkivering)
│   ├── inspections/new/        # Skjema for ny befaring
│   ├── pnb-cases/[recno]/      # Detaljside for én PNB-sak (kontakter, trinn, milepæler)
│   └── admin/                  # Administrasjonssider
│       ├── checkpoints/        # Sjekkpunkt-editor
│       ├── users/              # Brukeradministrasjon
│       ├── sif-config/         # SIF-innstillingsskjema
│       ├── sif-test/           # SIF-tilkoblingstester
│       ├── tilsyn-config/      # Befaringskonfigurasjon (bakgrunn-liste)
│       └── archivals/          # Arkiverings-audit-logg
└── login/                      # Innloggingsside

lib/
├── sif/                        # SIF API-klient og tjenester
│   ├── client.ts               # Lavnivå RPC-dispatcher (autentisering, retry, feilmapping)
│   ├── auth.ts                 # AuthKey / OAuth2 token-håndtering (med caching)
│   ├── settings.ts             # Last og cache SIF-konfig fra DB eller env-variabler
│   ├── archival.ts             # Arkiveringsorkestrator (sak → opplasting → dokument)
│   ├── case-service.ts         # GetCases (oppslag + søk)
│   ├── contact-service.ts      # SynchronizeContactPerson, GetEnterprises
│   ├── document-service.ts     # CreateDocument, UpdateDocument, GetDocuments, DispatchDocuments
│   ├── file-service.ts         # FileService/Upload (enkelt + batch)
│   ├── errors.ts               # Typede domenefeil (SifCaseNotFoundError, osv.)
│   ├── types.ts                # Fullstendige SIF API-typedefinisjoer (~1000 linjer)
│   └── extensions/             # Høynivå-verktøy (ikke integrert i appen)
│       ├── referred-cases.ts   # Hent refererte saker og godkjente dokumenter
│       ├── file-download.ts    # Last ned filer fra 360° via SIF-autentisering
│       ├── user-service.ts     # UserService/GetUsers
│       └── search-service.ts   # SearchService/Search + dokument-/sakssøk
├── pdf/
│   ├── generate.ts             # PDF-rapportgenerator (jsPDF) + JSON-eksport
│   ├── map-image.ts            # Hent statisk kart fra Kartverket WMS
│   └── map-capture.ts          # Klient-side OSM-flisopptak (canvas → JPEG)
├── checklist/
│   └── filter-engine.ts        # Filtrering, gruppering og oppsummering av sjekkpunkter
├── i18n/                       # Norske/engelske oversettelser (next-intl-kompatibilitetsadapter)
├── supabase/                   # Supabase server-/nettleserklient-fabrikker
├── api-auth.ts                 # JWT-vakter: requireUser() / requireAdmin()
├── audit-log.ts                # Strukturert logging: admin-audit-logg + saksbehandler-aktivitetslogg
├── pnb-cache.ts                # Klient-side cache-ugyldiggjøring (dirty-flagg i localStorage, 30 min TTL)
└── legal-reference.ts          # Lovdata URL-bygger fra lovhenvisningsstrenger

config/
└── sif-mapping.ts              # Dokumentarkivkoder, kontaktroller, tittelmal

data/seed/
├── checkpoint-definitions.ts   # 100+ sjekkpunkt-definisjoner med lovhenvisninger
└── measure-types.ts            # 10 tiltakstyper (enebolig, tilbygg m.fl.)

types/
└── index.ts                    # Kjernedomenetyper (Inspection, CheckpointDefinition, osv.)

i18n/
└── request.ts                  # next-intl server-konfig (locale fra cookie)

messages/
├── nb.json                     # Norske oversettelser (ICU-format)
└── en.json                     # Engelske oversettelser (ICU-format)

biome.json                      # Biome-konfig for linting + formatering (erstatter ESLint + Prettier)
sonar-project.properties        # SonarQube-prosjektkonfigurasjon
```

---

## SIF-integrasjon

### Autentisering

To modi støttes, konfigurert via `SIF_AUTH_MODE`:

**`authkey`** — API-nøkkelen (GUID) legges til som query-parameter:
```
POST https://kunde.public360online.com/Biz/v2/api/call/SI.Data.RPC/CaseService/GetCases?authkey=<guid>
```

**`combined_daemon`** — OAuth2 Client Credentials Grant (Azure AD):
- Henter bearer-token fra konfigurert token-endepunkt
- Token caches i prosessen med 60 sekunders buffer før utløp
- Sender `Authorization: Bearer <token>` + valgfri `ClientID`-header

### Feilhåndtering og retry

RPC-klienten (`lib/sif/client.ts`) gjenprøver automatisk ved HTTP 429 med eksponentiell backoff:
- Forsøk 1: 2 sek
- Forsøk 2: 4 sek
- Forsøk 3: 8 sek
- Respekterer `Retry-After`-headeren hvis tilstede

### SIF-mappingskonfigurasjon

`config/sif-mapping.ts` inneholder dokumentarkivkoder som må konfigureres for hver 360°-installasjon. Erstatt plassholderverdiene før deployment:

```ts
inspectionReport: {
  archive: "recno:2",       // TODO: Bytt ut med korrekt arkiv-recno
  category: "recno:111",    // TODO: Bytt ut med korrekt kategori
  status: "J",              // J = Journalført
  titleTemplate: "{{title}} - Tilsynsrapport - {{date}}",
  mainFileRelationType: "H",      // H = hoveddokument
  attachmentRelationType: "V",    // V = vedlegg
},
contactRoles: {
  applicantRecipientRole: "Mottaker",
  copyRecipientRole: "Kopi til",
},
```

Finn korrekte verdier via `SupportService/GetCodeTableRows` eller 360°-admin-portalen. Alle verdier kan også overstyres via admin-grensesnittet (`/dashboard/admin/sif-config`).

### Tittelmal-variabler

Dokumenttittelen i 360° genereres fra en konfigurerbar mal. Tilgjengelige variabler:

| Variabel | Beskrivelse |
|----------|-------------|
| `{{propertyAddress}}` | Eiendomsadresse fra tilsynet |
| `{{caseNumber}}` | Saksnummer fra PNB |
| `{{title}}` | Sakstittel fra PNB |
| `{{date}}` | Tilsynsdato (DD.MM.ÅÅÅÅ) |
| `{{year}}` | Tilsynsår (ÅÅÅÅ) |
| `{{inspectorName}}` | Tilsynsmannens navn |
| `{{applicantName}}` | Søkers navn |
| `{{gnrBnr}}` | Gårds-/bruksnummer |
| `{{measureType}}` | Tiltakstype |
| `{{inspectionId}}` | Intern tilsyns-UUID |

Eksempel: `{{title}} - Tilsynsrapport - {{date}}`

---

## Arkiveringsflyt

Arkiveringsendepunktet (`POST /api/archive`) orkestrerer følgende steg, optimalisert med parallell kjøring:

```
1. (parallelt)
   ├── Start SIF-saksoppslag (findCaseInSif) — trenger kun request-body-data
   ├── Last inn tilsyn + svar + vedlegg fra DB
   └── (etter DB-lasting, parallelt)
       ├── Last ned vedleggsfilene fra Supabase Storage
       └── Hent statisk kartbilde fra Kartverket WMS

2. (parallelt)
   ├── Generer PDF-rapport (jsPDF + innebygde bilder)
   └── Sett inn ventende arkiveringspost i DB

3. archiveInspectionToSif() — (parallelt)
   ├── Last opp filer til SIF (PDF + JSON + vedlegg)
   └── Synkroniser eksterne deltakere via SynchronizeContactPerson

4. Opprett (eller oppdater) dokument i 360° via DocumentService/CreateDocument

5. (valgfritt) Auto-dispatch av dokument til mottakere

6. (parallelt)
   ├── Oppdater arkiveringspost i DB (success / failed)
   └── Oppdater befaringsstatus til "archived"
```

Det pre-hentede SIF-tilfellet (steg 1) sendes direkte til `archiveInspectionToSif()` for å hoppe over et redundant oppslag.

**ViewFile-tillatelser** — arkiveringsruten henter også den innloggede brukerens PNB-kontaktrecno fra `user_profiles` (parallelt med DB-spørringene). Ved cache-miss kalles `UserService/GetUsers` med brukerens e-post som AD-login og resultatet lagres. Recno-en legges deretter inn som en `Permissions`-post (`ContactExternalId: "recno:XXXX", ViewFile: true`) på det opprettede dokumentet, slik at brukeren kan se de opplastede filene i Saksfiler-fanen.

---

## Admin-funksjonalitet

Admin-brukere får tilgang til `/dashboard/admin/`:

| Side | Funksjon |
|------|----------|
| Brukere | Opprett brukere, gi/fjern admin-tilgang, endre visningsnavn |
| Sjekkpunkter | Se, rediger, aktiver/deaktiver sjekkpunkt-definisjoner; konfigurer `applies_to_omrade` og `applies_to_type_codes` for kodetabell-basert filtrering |
| Befaringskonfigurasjon | Konfigurer bakgrunn-listen (befaringsområde og tiltakstype hentes fra PNB-kodetabell) |
| SIF-konfigurasjon | Konfigurer SIF-endepunkt, autentisering, arkivmapping og tittelmal |
| SIF-test | Test SIF-tilkobling og inspiser rå RPC-svar |
| Arkiveringslogg | Alle arkiveringsforsøk med status, dokumentnumre og feilmeldinger |

### Audit-logging

Alle admin-handlinger logges automatisk til `audit_logs`-tabellen (ISO 27001 A.12.4.1):

| Handling | Trigger |
|----------|---------|
| `user.create` | Ny bruker opprettet |
| `user.set_admin` | Admin-tilgang gitt eller fjernet |
| `user.update_name` | Visningsnavn oppdatert |
| `checkpoint.create/update/deactivate/delete` | Sjekkpunkt-definisjon endret |
| `inspection_config.create/delete` | Dropdown-listeelement lagt til eller slettet |
| `sif_settings.update` | SIF-innstillinger lagret (sensitive felt utelatt fra logg) |

### Aktivitetslogging (saksbehandlere)

Alle saksbehandlerhandlinger logges til `activity_logs`-tabellen. Hver post inneholder brukerens ID, e-postadresse (snapshot), handlingstype, eventuell tilsyns-ID og et metadata-JSON-objekt. Logging er fire-and-forget — en loggfeil blokkerer aldri selve handlingen.

| Handling | Trigger | Nøkkelmetadata |
|----------|---------|----------------|
| `inspection.create` | Nytt tilsyn opprettet | `propertyAddress`, `caseNumber`, `inspectorName`, `inspectionDate` |
| `inspection.answer` | Sjekkpunkt besvart eller endret | `checkpointDefinitionId`, `status` (`ok`/`deviation`/`not_checked`), `hasComment` |
| `inspection.archive` | Arkivering til SIF/360° vellykket | `caseNumber`, `documentNumber`, `documentRecno`, `pdfFileName` |
| `inspection.archive_failed` | Arkivering til SIF/360° feilet | `caseNumber`, `pdfFileName`, `errorMessage` |
| `sif.case_lookup` | Sak funnet i PNB | Søkekriterium og `foundCaseNumber`, `foundRecno` |
| `sif.case_lookup_not_found` | Sak ikke funnet i PNB | Søkekriterium |

Kommentartekst ekskluderes bevisst fra `inspection.answer`-logger — kun tilstedeværelse av kommentar (`hasComment: true/false`) registreres.

---

## Testing

Tester kjøres med Jest 29 + ts-jest. All forretningslogikk i `lib/` er testet; UI-komponenter og Next.js-infrastruktur er utelatt.

```bash
bun run test              # Kjør alle testsuiter
bun run test:watch        # Watch-modus
bun run test:coverage     # Dekningsrapport (skrives til coverage/)
```

### Testsuiter (22 filer)

| Fil | Dekker |
|-----|--------|
| `audit-log.test.ts` | `writeAuditLog` + `writeActivityLog` — innsetting, feilhåndtering |
| `filter-engine.test.ts` | Sjekkpunkt-filtrering, gruppering, statusoppsummering |
| `legal-reference.test.ts` | Lovdata URL-generering for pbl / sak10 / tek17 / tek10 / bsl |
| `pnb-cache.test.ts` | `markPnbCacheDirty` / `isPnbCacheDirty` — TTL, dirty-flagg |
| `pnb-case-mapper.test.ts` | Mapping fra SIF-sak til appens domenemodell |
| `sif-archival.test.ts` | Fullstendig arkiveringsflyt (saksoppslag → opplasting → dokumentoppretting) |
| `sif-auth.test.ts` | AuthKey-header-bygging + OAuth2 token-caching |
| `sif-case-service.test.ts` | `findCaseInSif` — oppslag via saksnummer / uid / externalId, feiltilfeller |
| `sif-client.test.ts` | RPC-dispatcher, HTTP 429 retry med eksponentiell backoff |
| `sif-contact-service.test.ts` | `getCaseContacts`, `searchEnterprises`, `synchronizeContactPerson` |
| `sif-document-service.test.ts` | `createDocument`, `updateDocument`, `getDocuments`, `dispatchDocuments` |
| `sif-errors.test.ts` | SIF-feiltypemapping |
| `sif-estate-service.test.ts` | `getEstateByMatrikkel`, `getCaseEstates` — matrikkelnummer-oppløsning |
| `sif-file-download.test.ts` | Autentisert fil-proxy-nedlasting, relativ URL-oppløsning, parallell batch |
| `sif-file-service.test.ts` | Filopplasting, multipart-bygging, batch |
| `sif-mapping.test.ts` | Variabelsubstitusjon i dokumenttittelmal |
| `sif-referred-cases.test.ts` | Traversering av refererte saker, dokument-/filfiltrering |
| `sif-search-service.test.ts` | `searchSif`, `searchDocumentsInCase`, `searchCasesGlobal`, `searchDocumentsGlobal` |
| `sif-settings.test.ts` | Innstillinger fra DB/env, intern 60 sek cache |
| `sif-user-service.test.ts` | `getSifUsers`, `getSifUserByLogin`, `getActiveSifUsers` |

### Dekning

Dekningsgrense: **70 % linjer + funksjoner** for alle inkluderte `lib/`-filer.

Faktisk dekning (siste kjøring): ~92 % linjer / ~92 % funksjoner.

Utelatt fra dekning (med begrunnelse):

| Sti | Årsak |
|-----|-------|
| `lib/sif/types.ts` | Rene TypeScript-deklarasjoner (~1100 linjer); ingen kjørbar kode |
| `lib/api-auth.ts` | Krever live `NextRequest` + Supabase-sesjon — integrasjonstestdomene |
| `lib/pdf/` | Canvas API-kall (jsPDF) kan ikke kjøres i jsdom |
| `lib/supabase/` | Klientfabrikk-initialisering — testet indirekte via service-mocks |
| `lib/i18n/` | next-intl hooks — krever Next.js render-kontekst |
| `lib/pdf/stamp-gps.ts` | Canvas 2D API — ikke tilgjengelig i jsdom |

---

## Universell utforming (WCAG 2.1 AA)

- **Skip-to-content-lenke** — tastaturfokus hopper direkte til hovedinnhold (WCAG 2.4.1)
- **Fargekontrast** — alle tekstelementer møter 4,5:1-kravet i både lyst og mørkt tema
- **Synlige fokusindikatorer** — `focus-visible`-ringer på alle interaktive elementer
- **ARIA-attributter** — `aria-expanded`, `aria-haspopup`, `aria-pressed`, `aria-live`, `role="dialog"`, `role="alert"` brukt gjennomgående
- **Semantisk HTML** — `<nav aria-label>`, `role="menu"`, `role="listbox"`, `role="group"` på relevante elementer
- **Tastaturnavigasjon** — dropdowns og modaler lukkes med Escape-tasten
- **Skjermleserstøtte** — `aria-label` på alle ikon-knapper, `aria-hidden` på dekorative elementer

---

## Sikkerhet

- **Row Level Security (RLS)** på alle Supabase-tabeller — brukere kan kun aksessere egne data
- **JWT-validering** på alle API-ruter via `requireUser()` / `requireAdmin()`
- **Admin-rolle** lagret i `app_metadata.is_admin` — kan kun settes server-side via service role-nøkkel
- **Hemmeligheter logges aldri** — authkey, client_secret og bearer-tokens maskeres i all loggutdata
- **CSP-headers** konfigurert i `next.config.mjs`
- **HSTS**, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- **SIF-legitimasjon** lagret kryptert i Supabase DB — eksponeres aldri til nettleseren
- **Audit-logg** fanger alle privilegerte admin-handlinger med bruker-ID og tidsstempel
- **Aktivitetslogg** fanger alle saksbehandlerhandlinger (tilsyn, arkivering, sakssøk) med bruker-ID, e-post-snapshot og strukturert metadata
