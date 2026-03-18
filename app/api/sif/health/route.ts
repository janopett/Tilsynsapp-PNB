import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { testSifConnection } from "@/lib/sif/support-service";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const result = await testSifConnection();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
