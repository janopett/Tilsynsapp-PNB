import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { testSifConnection } from "@/lib/sif/support-service";
import { loadSifSettingsWithEnvFallback, toSifClientConfig } from "@/lib/sif/settings";
import { buildRpcUrl } from "@/lib/sif/client";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const settings = await loadSifSettingsWithEnvFallback();
  const config = toSifClientConfig(settings);
  const attemptedUrl = config.baseUrl
    ? buildRpcUrl(config, "SupportService", "GetSIFVersion")
    : null;

  const result = await testSifConnection();
  return NextResponse.json(
    { ...result, attemptedUrl },
    { status: result.ok ? 200 : 503 }
  );
}
