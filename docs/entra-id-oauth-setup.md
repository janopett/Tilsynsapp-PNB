# Entra ID — OAuth 2.0 Setup for Public 360 Integration

This guide walks through everything that must be configured in **Microsoft Entra ID** (formerly Azure AD) to enable OAuth 2.0 Client Credentials authentication between the Site Visit Application and Public 360 (via the SIF API).

## Overview

The application uses the **OAuth 2.0 Client Credentials Grant** (machine-to-machine). There is no user login involved — the application authenticates as itself using a client ID and secret issued by Entra ID.

```
Site Visit App  ──POST──►  Entra ID token endpoint
                            (client_id + client_secret)
                ◄──────── access_token (JWT, ~60 min)

Site Visit App  ──POST──►  Public 360 SIF API
                            (Authorization: Bearer <token>)
                ◄──────── case data / documents
```

---

## Prerequisites

- An **Entra ID tenant** (your organisation's Microsoft 365 / Azure subscription).
- Access to **Entra ID** with at minimum the **Application Administrator** role (or Global Administrator).
- A **Public 360 administrator** who can configure the 360 server to accept OAuth tokens from your tenant.

---

## Step 1 — Register the Application

1. Go to [https://entra.microsoft.com](https://entra.microsoft.com) and sign in.
2. Navigate to **Identity → Applications → App registrations**.
3. Click **New registration**.
4. Fill in the following:

   | Field | Value |
   |-------|-------|
   | **Name** | `Tilsynsapp-PNB` (or any descriptive name) |
   | **Supported account types** | *Accounts in this organizational directory only* |
   | **Redirect URI** | Leave blank (not needed for client credentials) |

5. Click **Register**.

You will land on the app's **Overview** page. **Copy and save** the following two values — you will need them later:

| Value | Where to find it |
|-------|-----------------|
| **Application (client) ID** | Shown directly on the Overview page |
| **Directory (tenant) ID** | Shown directly on the Overview page |

---

## Step 2 — Create a Client Secret

1. In your app registration, go to **Certificates & secrets** in the left menu.
2. Click **New client secret**.
3. Enter a description (e.g. `tilsynsapp-prod`) and choose an expiry:
   - **Recommended: 24 months** (set a calendar reminder to rotate before expiry).
4. Click **Add**.
5. **Copy the secret Value immediately** — it is only shown once. Store it in a secure location (a password manager or Azure Key Vault).

> **Important:** The *Secret ID* column is not the secret itself. Always copy the *Value* column.

---

## Step 3 — Expose Public 360 as a Target API (Option A — preferred)

This is the cleanest configuration. It requires your Public 360 administrator to have already registered Public 360 as its own Entra ID application and exposed an API scope.

Ask your Public 360 administrator for:
- The **Application ID URI** of the 360 Entra ID app (e.g. `api://your-360-app-id`)
- The **scope name** the 360 app exposes (e.g. `SIF.Access` or `.default`)

Once you have that:

1. Still in your app registration, go to **API permissions**.
2. Click **Add a permission → APIs my organization uses**.
3. Search for the Public 360 app by name or paste its Application ID.
4. Select **Application permissions** (not Delegated — there is no user context in client credentials).
5. Select the scope provided by the 360 admin (e.g. `SIF.Access`).
6. Click **Add permissions**.
7. Click **Grant admin consent for [your organisation]** — this requires Global Administrator or a privileged role. The status column should show a green ✔ *Granted*.

The **scope** to use in the application config will be:
```
api://<360-app-id>/.default
```

---

## Step 4 — Tenant-Level Trust (Option B — alternative)

If Public 360 is configured to trust *any* token issued by your Entra ID tenant (rather than scoped to a specific API), no API permissions need to be added to your app registration.

In this case:
- The scope is typically left empty or set to `https://graph.microsoft.com/.default` (ask the 360 admin).
- The 360 server is configured with your **Tenant ID** and **Client ID** as allowed issuers.

Confirm the correct approach with your Public 360 administrator before proceeding.

---

## Step 5 — Configure Public 360 (360 Admin Task)

Your **Public 360 administrator** must allow the application to authenticate via OAuth. Provide them with:

| Value | Description |
|-------|-------------|
| **Tenant ID** | From Step 1 |
| **Client ID** | Application (client) ID from Step 1 |
| **Scope** | Agreed upon in Step 3 or 4 |

They will configure the SIF endpoint (combined daemon / OAuth mode) on the 360 server side. This is a server configuration — it cannot be done from the Entra ID portal.

---

## Step 6 — Enter Values in the Application

### Via the Admin UI

Go to `/dashboard/admin/sif-config` and fill in:

| Field | Value |
|-------|-------|
| **Authentication mode** | `OAuth (combined_daemon)` |
| **Token URL** | `https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token` |
| **Client ID (OAuth)** | Application (client) ID from Step 1 |
| **Client Secret** | Secret Value from Step 2 |
| **Scope** | `api://<360-app-id>/.default` (from Step 3) |
| **Client ID (SIF)** | Internal ClientID that Public 360 expects in the header, if any (ask 360 admin) |

### Via environment variables

Alternatively, set these in `.env.local` (or your hosting platform's secret manager):

```env
SIF_AUTH_MODE=combined_daemon
SIF_BEARER_TOKEN_URL=https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token
SIF_CLIENT_ID_OAUTH=<application-client-id>
SIF_CLIENT_SECRET=<client-secret-value>
SIF_SCOPE=api://<360-app-id>/.default
# Optional — only if Public 360 requires a ClientID header
SIF_CLIENT_ID=<internal-360-client-id>
```

---

## Summary — Values to Collect

| # | What | Where | Used in |
|---|------|-------|---------|
| 1 | **Tenant ID** | Entra ID → App registration → Overview | Token URL |
| 2 | **Application (client) ID** | Entra ID → App registration → Overview | `SIF_CLIENT_ID_OAUTH` |
| 3 | **Client secret value** | Entra ID → Certificates & secrets | `SIF_CLIENT_SECRET` |
| 4 | **Scope** | Agreed with 360 admin | `SIF_SCOPE` |
| 5 | **SIF Client ID** (optional) | Provided by 360 admin | `SIF_CLIENT_ID` |

---

## Token URL Format

The token endpoint follows this pattern:

```
https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token
```

Replace `<tenant-id>` with the Directory (tenant) ID from Step 1. Example:

```
https://login.microsoftonline.com/3a4b5c6d-1234-5678-abcd-ef0123456789/oauth2/v2.0/token
```

---

## Secret Rotation

Client secrets expire. To avoid service interruptions:

1. **Before expiry**: create a **new** client secret in Entra ID (keep the old one active).
2. Update `SIF_CLIENT_SECRET` / the admin UI with the new value and save.
3. Verify the integration is working.
4. Delete the old client secret from Entra ID.

Set a calendar reminder at least two weeks before the expiry date.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| `AADSTS700016: Application not found` | Wrong `client_id` or app registered in a different tenant |
| `AADSTS7000215: Invalid client secret` | Secret has expired or was copied incorrectly |
| `AADSTS650057: Invalid resource` | Scope is wrong — check with 360 admin |
| HTTP 401 from SIF API after valid token | 360 server not configured to accept this client/tenant |
| HTTP 403 from SIF API | Token valid but app lacks permissions in 360 |
| `SIF_BEARER_TOKEN_URL, SIF_CLIENT_ID_OAUTH and SIF_CLIENT_SECRET must be set` | Auth mode is `combined_daemon` but env vars are missing |
