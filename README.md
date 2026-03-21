# Tilsynsapp-PNB

Webapplikasjon for gjennomføring og arkivering av byggetilsyn i kommunen. Inspektører fyller ut strukturerte sjekklister, genererer tilsynsrapporter og sender disse direkte til kommunens arkivsystem (Plan & Bygg / Public 360°) via SIF-API-integrasjon.

---

## Innhold

- [Funksjoner](#funksjoner)
- [Teknologi](#teknologi)
- [Kom i gang](#kom-i-gang)
- [Miljøvariabler](#miljøvariabler)
- [Databasemigrasjoner](#databasemigrasjoner)
- [Arkitektur](#arkitektur)
- [Admin-funksjonalitet](#admin-funksjonalitet)

---

## Funksjoner

### Inspektører

| Funksjon | Beskrivelse |
|----------|-------------|
| Nytt tilsyn | Flertrinns skjema med saksreferanse, eiendomsdata og tiltakstype |
| Strukturert sjekkliste | 100+ sjekkpunkter fordelt på kategorier (formelle forhold, teknisk standard m.fl.), dynamisk filtrert etter tiltakstype og eiendomsegenskaper |
| Registrering av funn | Registrer status per sjekkpunkt (ok / avvik / ikke kontrollert) med kommentar |
| Vedlegg | Last opp bilder og dokumenter til et tilsyn |
| PDF-rapport | Generer profesjonell tilsynsrapport med underskrift og kart |
| Arkivering | Send ferdig tilsyn til kommunens arkivsystem (Public 360°) med ett klikk |
| Dashboard | Oversikt over aktive og arkiverte tilsyn med filtrering og statusinformasjon |
| Kartplukking | Velg koordinater for tilsynsstedet via interaktivt kart |
| Mørkt/lyst tema | Automatisk systemtema med manuell overstyring (lys/mørk/system) |

### SIF-integrasjon (Plan & Bygg / Public 360°)

- Sakssøk og oppslag av eiendom og parter direkte fra PNB
- Synkronisering av deltakere og kontakter til 360°
- Automatisk oppretting av dokument og opplasting av filer til saken
- Støtter to autentiseringsmoduser:
  - **AuthKey** – enkel nøkkelbasert tilgang
  - **OAuth2 Client Credentials (combined_daemon)** – Azure AD-basert enterprise-autentisering

---

## Teknologi

| Lag | Valg |
|-----|------|
| Rammeverk | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Autentisering | Supabase Auth (e-post + passord, JWT, cookie-sesjoner) |
| Fillagring | Supabase Storage |
| PDF-generering | jsPDF + jspdf-autotable |
| Ekstern integrasjon | SIF API – Public 360° (SOAP/RPC over HTTPS) |
| Deployment | Vercel |
| Testing | Jest |

---

## Kom i gang

### Forutsetninger

- Node.js 18+
- En Supabase-prosjekt (eller lokal Supabase)

### Installasjon

```bash
git clone <repo-url>
cd Tilsynsapp-PNB
npm install
cp .env.example .env.local   # Fyll inn verdier, se tabellen nedenfor
npm run dev                  # Starter på http://localhost:3000
```

### Tilgjengelige kommandoer

```bash
npm run dev           # Utviklingsserver
npm run build         # Produksjonsbygg
npm run start         # Start produksjonsserver
npm run lint          # ESLint
npm run test          # Kjør tester
npm run test:watch    # Tester med watch-modus
npm run test:coverage # Testdekning
npm run db:generate   # Generer Supabase TypeScript-typer
npm run set-admin     # Gi admin-tilgang til en bruker
```

---

## Miljøvariabler

Kopier `.env.example` til `.env.local` og fyll inn verdiene:

### Supabase

| Variabel | Beskrivelse |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL til Supabase-prosjektet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Offentlig anon-nøkkel |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role-nøkkel (kun server) |

### SIF / Public 360°

| Variabel | Beskrivelse |
|----------|-------------|
| `SIF_BASE_URL` | Basis-URL til 360°-instansen, f.eks. `https://kunde.public360online.com` |
| `SIF_RPC_PATH` | API-sti, typisk `/rpc/v2` |
| `SIF_AUTH_MODE` | `authkey` eller `combined_daemon` |
| `SIF_AUTHKEY` | API-nøkkel (GUID) for authkey-modus |
| `SIF_BEARER_TOKEN_URL` | Azure AD token-endepunkt (combined_daemon) |
| `SIF_CLIENT_ID` | OAuth2 klient-ID |
| `SIF_CLIENT_SECRET` | OAuth2 klient-hemmelighet |
| `SIF_CLIENT_ID_OAUTH` | OAuth2 applikasjons-ID |
| `SIF_SCOPE` | OAuth2 scope, f.eks. `api://…/.default` |
| `SIF_TIMEOUT_MS` | Timeout for API-kall i ms (standard `30000`) |

### Annet

| Variabel | Beskrivelse |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Produksjons-URL (brukes av Vercel) |

> SIF-innstillingene kan også konfigureres via admin-grensesnittet (`/dashboard/admin/sif-config`) og lagres da i databasen.

---

## Databasemigrasjoner

Migrasjoner ligger i `supabase/migrations/` og kjøres via Supabase CLI:

```bash
supabase db push          # Kjør migrasjoner mot remote
supabase db reset         # Nullstill lokal database
```

### Migrasjonshistorikk

| Fil | Innhold |
|-----|---------|
| `001_initial.sql` | Kjernetabeller: inspections, answers, attachments, list_items |
| `002_sif_settings.sql` | SIF-konfigurasjonstabell |
| `013_auto_dispatch.sql` | Automatisk arkivering |
| `015_checkpoint_definitions.sql` | Dynamisk sjekkpunkt-bibliotek |
| `020_audit_log.sql` | Audit-logg for admin-handlinger (ISO 27001 A.12.4.1) |
| … | (20 migrasjoner totalt) |

---

## Arkitektur

```
app/
├── api/                    # API-ruter (Next.js Route Handlers)
│   ├── admin/              # Admin-endepunkter (krever admin-rolle)
│   │   ├── users/          # Brukeradministrasjon
│   │   ├── checkpoints/    # Sjekkpunkt-definisjoner
│   │   ├── inspection-config/  # Konfigurerbare lister
│   │   └── archivals/      # Arkiveringslogg
│   └── sif/                # SIF-integrasjonsendepunkter
├── dashboard/              # Autentiserte sider
│   ├── inspections/[id]/   # Tilsynsdetaljer og sjekkliste
│   ├── inspections/new/    # Nytt tilsyn
│   └── admin/              # Administrasjonssider
└── login/                  # Innloggingsside

lib/
├── sif/                    # SIF API-klient og tjenester
│   ├── client.ts           # Kjernelogikk for RPC-kall
│   ├── archival.ts         # Fullstendig arkiveringsflyt
│   ├── auth.ts             # AuthKey / OAuth2-håndtering
│   └── *-service.ts        # Case, Contact, Document, File, Estate
├── pdf/                    # PDF-rapportgenerering
├── checklist/              # Filtermotor for sjekkpunkter
├── audit-log.ts            # Logging av admin-handlinger
└── api-auth.ts             # JWT-vakter (requireUser / requireAdmin)

supabase/migrations/        # PostgreSQL-skjema-endringer
data/seed/                  # Definisjoner for sjekkpunkter og tiltakstyper
```

---

## Admin-funksjonalitet

Admin-brukere får tilgang til et eget administrasjonsgrensesnitt under `/dashboard/admin/`:

| Side | Funksjon |
|------|----------|
| Brukere | Opprett brukere, gi/fjern admin-tilgang, endre navn |
| Sjekkpunkter | Se og administrer sjekkpunkt-definisjoner |
| Tilsynskonfigurasjon | Konfigurer tilsynsområde, tilsynstype og bakgrunn |
| SIF-konfigurasjon | Konfigurer SIF-endepunkt, autentisering og arkivmappinger |
| SIF-test | Test og feilsøk SIF-tilkobling |
| Arkiveringslogg | Oversikt over alle arkiveringsforsøk med status og feilmeldinger |

### Audit-logging

Alle admin-handlinger logges automatisk til `audit_logs`-tabellen i henhold til ISO 27001 A.12.4.1:

| Handling | Trigger |
|----------|---------|
| `user.create` | Ny bruker opprettet |
| `user.set_admin` | Admin-tilgang gitt eller fjernet |
| `user.update_name` | Navn oppdatert |
| `checkpoint.create/update/deactivate/delete` | Sjekkpunkt endret |
| `inspection_config.create/delete` | Listeelement lagt til eller slettet |
| `sif_settings.update` | SIF-innstillinger lagret (sensitive felt utelatt) |

---

## Universell utforming (WCAG 2.1 AA)

- **Skip-to-content-lenke** — tastaturfokus hopper direkte til hovedinnhold (WCAG 2.4.1)
- **Fargekontrast** — alle tekstelementer møter 4.5:1-kravet i både lyst og mørkt tema
- **Synlige fokusindikatorer** — `focus-visible`-ringer på alle interaktive elementer
- **ARIA-attributter** — `aria-expanded`, `aria-haspopup`, `aria-pressed`, `aria-live`, `role="dialog"` og `role="alert"` brukt gjennomgående
- **Semantisk HTML** — `<nav aria-label>`, `role="menu"`, `role="listbox"`, `role="group"` på relevante elementer
- **Tastaturnavigasjon** — dropdowns og modaler lukkes med Escape-tasten
- **Vedleggsknapper** — fjern-knapp vises ved hover *og* tastaturfokus
- **Skjermleserstøtte** — `aria-label` på alle ikon-knapper, `aria-hidden` på dekorative elementer

## Sikkerhet

- **RLS (Row Level Security)** på alle Supabase-tabeller
- **JWT-validering** på alle API-ruter via `requireUser()` / `requireAdmin()`
- **Admin-rolle** lagres i `app_metadata.is_admin` – kan kun settes server-side
- **CSP-headers** konfigurert i `next.config.mjs`
- **HSTS**, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- Sensitive felt (authkey, client_secret) logges aldri i audit-loggen
