# Tilsynsapp-PNB — Executive Summary

**A digital tool for efficient building site visits and automatic archiving**

---

## The problem we solve

Traditional building site visits are paper-based and time-consuming:

- Inspectors use manual checklists and handwritten notes in the field
- Site visit reports are written up from scratch after each visit
- Documents are manually archived in the municipality's case management system
- Risk of findings going missing, wrong document numbers being used, or archiving being forgotten

This creates extra work for inspectors, delays in case processing, and potential gaps in documentation.

---

## The solution

**Tilsynsapp-PNB** is a web application that digitalises the entire site visit process — from preparation to archiving — in one seamless workflow.

```
Preparation  →  Field visit  →  Report generation  →  Archive in 360°
  (5 min)       (on site)        (automatic)           (one click)
```

The inspector works in a browser on PC, tablet, or mobile. When the site visit is complete, the report is generated automatically and archived directly in the municipality's Plan & Building system (Public 360°).

---

## Key features

### For the inspector in the field

| Feature | Value |
|---------|-------|
| Structured checklist | 100+ standardised checkpoints, filtered by measure type, property attributes, survey area, and measure type from PNB |
| Survey area & measure type | Multi-select classification pulled from PNB code tables — controls which checkpoints are displayed |
| Deviation registration | Mark findings with a comment, responsible contact, and GPS coordinates directly on the checkpoint |
| Attachments | Upload photos and documents from the site visit, linked to individual checkpoints. The address is automatically resolved from the photo's GPS data and stamped onto the image |
| Map integration | Pin the site visit location geographically with one tap |
| Case search | Look up the case from PNB directly in the app — no manual copying or switching between systems |
| My PNB cases | Dashboard tab showing all PNB cases where the logged-in user is the responsible case officer — with properties, contacts, case stages, and deadlines at a glance |

### For the organisation

| Feature | Value |
|---------|-------|
| Automatic PDF report | Fully formatted site visit report generated without manual effort — includes case metadata, checklist, deviation summary, photos, and map |
| Archive with one click | Report sent directly to the correct case in Public 360° — select a case stage (behandlingstrinn), create a new document or update an existing one |
| Traceability | All site visits, deviations, and archival events are logged and searchable |
| User management | Simple access control via admin panel — no IT department involvement needed |
| Audit log | All admin actions logged automatically (ISO 27001 A.12.4.1) |

---

## Integration with existing systems

The application is built to live **inside** the municipality's existing infrastructure — not alongside it:

- **Public 360° / Plan & Building** — Cases, parties, property, and documents are fetched and stored directly via the SIF API. No duplicate data entry.
- **Municipal login** — Supports Azure AD via OAuth2 (same single sign-on as the rest of the municipality's systems)
- **Browser-based** — No installation required, works on all devices (PC, tablet, mobile)

---

## Benefits

### Time savings per inspection

**Example: inspection of a new single-family house with 3 deviations**

#### The current process

| Step | Description | Time |
|------|-------------|------|
| Preparation | Review relevant documentation, drawings, and case history; look up the case in PNB, note down case number, address, applicant, and measure type | 130 min |
| On site | Carry out the inspection with running notes on a phone or paper; take photos on a phone | 60 min |
| Write report | Open the Word document in PNB, go through notes and photos, write the report, insert photos from the phone | 60 min |
| Archiving | Finalise and dispatch the document in PNB | 10 min |
| **Total** | | **260 min** |

#### With Tilsynsapp-PNB

| Step | Description | Time |
|------|-------------|------|
| Preparation | Review relevant documentation, drawings, and case history; look up the case in the app — address, applicant, property, and measure type are fetched automatically from PNB | 122 min |
| On site | Carry out the inspection using a structured checklist, record deviations with comments, take photos linked directly to each checkpoint | 60 min |
| Report and archiving | Press "Generate report", press "Archive" — PDF sent directly to the correct case in PNB | 2 min |
| **Total** | | **184 min** |

#### Result

| | Today | With the app | Saved |
|-|-------|--------------|-------|
| The inspection itself (unchanged) | 60 min | 60 min | — |
| Preparation and follow-up work | 200 min | 124 min | **76 min** |
| **Total per inspection** | **260 min** | **184 min** | **76 min (29 %)** |

A case officer conducting **2 inspections per week** saves around **2.5 hours per week** — equivalent to approximately **100 hours, or 2.5 working weeks, per year**.

### Quality and compliance
- Standardised checklists ensure nothing is missed — 100+ checkpoints with legal references (technical regulations, Planning and Building Act)
- Responsible contact can be recorded per deviation for clear accountability
- Complete traceability from inspection to archived document in 360°

### Scalability
- Checkpoints and dropdown lists can be configured without development work via the admin panel
- New measure types, inspection areas, and types added through the UI
- Role-based access — separates inspector and administrator responsibilities

---

## Technical platform

The application is built on modern, maintainable technology with no single points of failure:

- **Web application** (Next.js 15 / React 19) — works in all modern browsers, no app installation
- **Database**: Supabase (PostgreSQL) with full encryption and row-level access control (RLS)
- **File storage**: Supabase Storage — inspection attachments stored securely with access control
- **Hosting**: Vercel — automatic scaling, zero server administration, global CDN
- **Security**: HTTPS everywhere, HSTS, CSP headers, audit logging, role-based access, secrets never exposed to browser
- **Code quality**: Biome (linting + formatting), SonarQube integration, and TypeScript strict mode

### Performance

The archival flow is optimised for speed through parallel execution:
- SIF case lookup starts immediately alongside database queries
- PDF generation runs in parallel with the pending archival record insert
- File uploads and participant synchronisation run concurrently
- Map image fetch (Kartverket WMS) runs in parallel with attachment downloads

---

## Status and roadmap

| Status | Area |
|--------|------|
| ✅ Production-ready | Inspection workflow and structured checklists |
| ✅ Production-ready | PDF report generation with inline images, deviation summary, legal references per deviation, and closure deadline (SAK10 § 15-3) |
| ✅ Production-ready | Archiving to Public 360° — create new or update existing document |
| ✅ Production-ready | Auto-dispatch of archived documents to recipients |
| ✅ Production-ready | User and access administration |
| ✅ Production-ready | Audit logging (ISO 27001 A.12.4.1) |
| 🔄 Configurable | Checkpoint library and dropdown lists customisable per municipality |
| 🔄 Configurable | SIF archive codes, contact roles, and title template set per installation |

---

## Contact and next steps

For a demo, technical walkthrough, or questions about adapting the application to your municipality's setup — contact the project lead.

---

*Tilsynsapp-PNB — developed for Norwegian municipalities with Plan & Building integration*
