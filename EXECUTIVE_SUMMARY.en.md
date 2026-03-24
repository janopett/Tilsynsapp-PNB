# Tilsynsapp-PNB — Executive Summary

**A digital tool for efficient building inspection and automatic archiving**

---

## The problem we solve

Traditional building inspection is paper-based and time-consuming:

- Inspectors use manual checklists and handwritten notes in the field
- Inspection reports are written up from scratch after each visit
- Documents are manually archived in the municipality's case management system
- Risk of findings going missing, wrong document numbers being used, or archiving being forgotten

This creates extra work for inspectors, delays in case processing, and potential gaps in documentation.

---

## The solution

**Tilsynsapp-PNB** is a web application that digitalises the entire inspection process — from preparation to archiving — in one seamless workflow.

```
Preparation  →  Field inspection  →  Report generation  →  Archive in 360°
  (5 min)        (on site)            (automatic)           (one click)
```

The inspector works in a browser on PC, tablet, or mobile. When the inspection is complete, the report is generated automatically and archived directly in the municipality's Plan & Building system (Public 360°).

---

## Key features

### For the inspector in the field

| Feature | Value |
|---------|-------|
| Structured checklist | 100+ standardised checkpoints, automatically filtered by measure type |
| Deviation registration | Mark findings with a comment directly on the checkpoint |
| Attachments | Upload photos and documents from the inspection site |
| Map integration | Pin the inspection location geographically with one tap |
| Case search | Look up the case from PNB directly in the app — no manual copying |

### For the organisation

| Feature | Value |
|---------|-------|
| Automatic PDF report | Fully formatted inspection report generated without manual effort |
| Archive with one click | Report sent directly to the correct case in Public 360° — create a new document or update an existing one |
| Traceability | All inspections, deviations, and archival events are logged and searchable |
| User management | Simple access control via admin panel |
| Audit log | All admin actions logged automatically (ISO 27001 A.12.4.1) |

---

## Integration with existing systems

The application is built to live **inside** the municipality's existing infrastructure — not alongside it:

- **Public 360° / Løsøre** — Cases, parties, property, and documents are fetched and stored directly via the SIF API
- **Municipal login** — Supports Azure AD via OAuth2 (same login as the rest of the municipality's systems)
- **Browser-based** — No installation required, works on all devices

---

## Benefits

### Time savings per inspection
- Eliminates duplicate effort rewriting the report after the visit
- Automatic archiving replaces manual document handling
- Case search directly in the app — no need to switch between systems

### Quality and compliance
- Standardised checklists ensure nothing is missed
- Legal references are linked to checkpoints (technical regulations, Planning and Building Act)
- Complete traceability from inspection to archive

### Scalability
- Checkpoints and lists can be configured without development work
- New measure types added via admin panel
- Role-based access — separates inspector and administrator

---

## Technical platform

The application is built on modern, maintainable technology:

- **Web application** (Next.js / React) — works in all browsers, no app installation
- **Database host**: Supabase (PostgreSQL) with full encryption and access control (RLS)
- **Hosting**: Vercel — automatic scaling, no server administration
- **Security**: HTTPS, HSTS, CSP headers, audit logging, role-based access

---

## Status and roadmap

| Status | Area |
|--------|------|
| ✅ Production-ready | Inspection workflow and checklists |
| ✅ Production-ready | PDF report generation |
| ✅ Production-ready | Archiving to Public 360° — create new or update existing document |
| ✅ Production-ready | User and access administration |
| ✅ Production-ready | Audit logging (ISO 27001) |
| 🔄 Configurable | Customisation of checkpoints and lists per municipality |

---

## Contact and next steps

For a demo, technical walkthrough, or questions about adapting the application to your municipality's setup — contact the project lead.

---

*Tilsynsapp-PNB — developed for Norwegian municipalities with Plan & Building integration*
