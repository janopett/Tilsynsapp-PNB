# Tilsynsapp-PNB

Web application for conducting and archiving building inspections in Norwegian municipalities. Inspectors fill in structured checklists, generate inspection reports, and send them directly to the municipality's records management system (Plan & Building / Public 360°) via the SIF API integration.

---

## Contents

- [Features](#features)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database migrations](#database-migrations)
- [Architecture](#architecture)
- [Admin functionality](#admin-functionality)

---

## Features

### Inspectors

| Feature | Description |
|---------|-------------|
| New inspection | Multi-step form with case reference, property data, and measure type |
| Structured checklist | 100+ checkpoints organised by category (formal conditions, technical standard, etc.), dynamically filtered by measure type and property attributes |
| Finding registration | Record status per checkpoint (ok / deviation / not checked) with free-text comment |
| Attachments | Upload images and documents to an inspection |
| PDF report | Generate a professional inspection report with signature and map |
| Archiving | Submit a completed inspection to the municipal records system (Public 360°) — create a new document or update an existing one on the case |
| Dashboard | Overview of active and archived inspections with filtering and status information |
| Map picker | Select coordinates for the inspection site via an interactive map |
| Dark/light theme | Automatic system theme with manual override (light / dark / system) |

### SIF integration (Plan & Building / Public 360°)

- Case search and lookup of property and parties directly from PNB
- Synchronisation of participants and contacts to 360°
- Automatic document creation and file upload to the case
- **Document lookup during archiving** — fetch existing documents on the case and choose between creating a new document or updating an existing one (adds a new version of the report/attachments)
- Supports two authentication modes:
  - **AuthKey** — simple key-based access
  - **OAuth2 Client Credentials (combined_daemon)** — Azure AD-based enterprise authentication

---

## Technology

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (email + password, JWT, cookie sessions) |
| File storage | Supabase Storage |
| PDF generation | jsPDF + jspdf-autotable |
| External integration | SIF API – Public 360° (SOAP/RPC over HTTPS) |
| Deployment | Vercel |
| Testing | Jest |

---

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project (or local Supabase)

### Installation

```bash
git clone <repo-url>
cd Tilsynsapp-PNB
npm install
cp .env.example .env.local   # Fill in values — see table below
npm run dev                  # Starts at http://localhost:3000
```

### Available commands

```bash
npm run dev           # Development server
npm run build         # Production build
npm run start         # Start production server
npm run lint          # ESLint
npm run test          # Run tests
npm run test:watch    # Tests in watch mode
npm run test:coverage # Test coverage
npm run db:generate   # Generate Supabase TypeScript types
npm run set-admin     # Grant admin access to a user
```

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

### Supabase

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL to the Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |

### SIF / Public 360°

| Variable | Description |
|----------|-------------|
| `SIF_BASE_URL` | Base URL of the 360° instance, e.g. `https://customer.public360online.com` |
| `SIF_RPC_PATH` | API path, typically `/rpc/v2` |
| `SIF_AUTH_MODE` | `authkey` or `combined_daemon` |
| `SIF_AUTHKEY` | API key (GUID) for authkey mode |
| `SIF_BEARER_TOKEN_URL` | Azure AD token endpoint (combined_daemon) |
| `SIF_CLIENT_ID` | OAuth2 client ID |
| `SIF_CLIENT_SECRET` | OAuth2 client secret |
| `SIF_CLIENT_ID_OAUTH` | OAuth2 application ID |
| `SIF_SCOPE` | OAuth2 scope, e.g. `api://…/.default` |
| `SIF_TIMEOUT_MS` | API call timeout in ms (default `30000`) |

### Other

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Production URL (used by Vercel) |

> SIF settings can also be configured via the admin interface (`/dashboard/admin/sif-config`) and are then stored in the database.

---

## Database migrations

Migrations are located in `supabase/migrations/` and run via the Supabase CLI:

```bash
supabase db push          # Apply migrations to remote
supabase db reset         # Reset local database
```

### Migration history

| File | Contents |
|------|----------|
| `001_initial.sql` | Core tables: inspections, answers, attachments, list_items |
| `002_sif_settings.sql` | SIF configuration table |
| `013_auto_dispatch.sql` | Automatic dispatch |
| `015_checkpoint_definitions.sql` | Dynamic checkpoint library |
| `020_audit_log.sql` | Audit log for admin actions (ISO 27001 A.12.4.1) |
| … | (20 migrations in total) |

---

## Architecture

```
app/
├── api/                    # API routes (Next.js Route Handlers)
│   ├── admin/              # Admin endpoints (require admin role)
│   │   ├── users/          # User administration
│   │   ├── checkpoints/    # Checkpoint definitions
│   │   ├── inspection-config/  # Configurable lists
│   │   └── archivals/      # Archival log
│   └── sif/                # SIF integration endpoints
│       ├── case-lookup/    # Single case lookup
│       ├── case-search/    # Case search (title/number)
│       ├── case-documents/ # Fetch documents on a case
│       ├── case-contacts/  # Parties on a case
│       ├── case-stages/    # Case stages
│       └── …               # Additional SIF endpoints
├── dashboard/              # Authenticated pages
│   ├── inspections/[id]/   # Inspection details and checklist
│   ├── inspections/new/    # New inspection
│   └── admin/              # Administration pages
└── login/                  # Login page

lib/
├── sif/                    # SIF API client and services
│   ├── client.ts           # Core RPC call logic
│   ├── archival.ts         # Full archival flow (create + update)
│   ├── auth.ts             # AuthKey / OAuth2 handling
│   ├── case-service.ts     # GetCases, search
│   ├── document-service.ts # CreateDocument, UpdateDocument, DispatchDocuments, GetCases(IncludeDocuments)
│   ├── file-service.ts     # FileService/Upload
│   ├── contact-service.ts  # SynchronizeContactPerson
│   └── estate-service.ts   # GetEstates
├── pdf/                    # PDF report generation
├── checklist/              # Checkpoint filter engine
├── audit-log.ts            # Admin action logging
└── api-auth.ts             # JWT guards (requireUser / requireAdmin)

supabase/migrations/        # PostgreSQL schema changes
data/seed/                  # Checkpoint and measure type definitions
```

---

## Admin functionality

Admin users get access to a dedicated administration interface at `/dashboard/admin/`:

| Page | Function |
|------|----------|
| Users | Create users, grant/revoke admin access, update names |
| Checkpoints | View and manage checkpoint definitions |
| Inspection configuration | Configure inspection area, type, and background |
| SIF configuration | Configure SIF endpoint, authentication, and archive mappings |
| SIF test | Test and debug SIF connection |
| Archival log | Overview of all archival attempts with status and error messages |

### Audit logging

All admin actions are automatically logged to the `audit_logs` table in accordance with ISO 27001 A.12.4.1:

| Action | Trigger |
|--------|---------|
| `user.create` | New user created |
| `user.set_admin` | Admin access granted or revoked |
| `user.update_name` | Name updated |
| `checkpoint.create/update/deactivate/delete` | Checkpoint changed |
| `inspection_config.create/delete` | List item added or removed |
| `sif_settings.update` | SIF settings saved (sensitive fields excluded) |

---

## Accessibility (WCAG 2.1 AA)

- **Skip-to-content link** — keyboard focus jumps directly to main content (WCAG 2.4.1)
- **Colour contrast** — all text elements meet the 4.5:1 requirement in both light and dark theme
- **Visible focus indicators** — `focus-visible` rings on all interactive elements
- **ARIA attributes** — `aria-expanded`, `aria-haspopup`, `aria-pressed`, `aria-live`, `role="dialog"` and `role="alert"` used throughout
- **Semantic HTML** — `<nav aria-label>`, `role="menu"`, `role="listbox"`, `role="group"` on relevant elements
- **Keyboard navigation** — dropdowns and modals close with the Escape key
- **Attachment buttons** — remove button visible on hover *and* keyboard focus
- **Screen reader support** — `aria-label` on all icon buttons, `aria-hidden` on decorative elements

## Security

- **RLS (Row Level Security)** on all Supabase tables
- **JWT validation** on all API routes via `requireUser()` / `requireAdmin()`
- **Admin role** stored in `app_metadata.is_admin` — can only be set server-side
- **CSP headers** configured in `next.config.mjs`
- **HSTS**, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- Sensitive fields (authkey, client_secret) are never logged in the audit log
