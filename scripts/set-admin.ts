#!/usr/bin/env node
/**
 * Bootstrap script – set or remove admin status for a user by email.
 *
 * Usage:
 *   npm run set-admin brukernavn@epost.no           # gi admin
 *   npm run set-admin brukernavn@epost.no -- --remove  # fjern admin
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * (loaded automatically from .env.local).
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// ── Load .env.local manually (no dotenv dependency needed) ──────────────────
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    const value = raw.replace(/^["']|["']$/g, "");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

// ── Main ─────────────────────────────────────────────────────────────────────

const email = process.argv[2];
const remove = process.argv.includes("--remove");

if (!email) {
  console.error("Bruk: npm run set-admin <email> [-- --remove]");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Feil: NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY må være satt i .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (listError) {
    console.error("Klarte ikke hente brukere:", listError.message);
    process.exit(1);
  }

  const user = listData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    console.error(`\nFant ingen bruker med e-post: ${email}`);
    if (listData.users.length > 0) {
      console.error(
        "Registrerte brukere:",
        listData.users.map((u) => u.email).join(", ")
      );
    } else {
      console.error("Ingen brukere er registrert ennå.");
    }
    process.exit(1);
  }

  const isAdmin = !remove;
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { app_metadata: { is_admin: isAdmin } }
  );

  if (updateError) {
    console.error("Klarte ikke oppdatere bruker:", updateError.message);
    process.exit(1);
  }

  if (isAdmin) {
    console.log(`✓ ${email} er nå admin.`);
  } else {
    console.log(`✓ Admin-tilgang fjernet for ${email}.`);
  }
}

main();
