import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateInspectionSchema = z.object({
  property_address: z.string().min(1),
  case_number: z.string().optional(),
  case_title: z.string().optional(),
  gnr: z.string().optional(),
  bnr: z.string().optional(),
  snr: z.string().optional(),
  fnr: z.string().optional(),
  applicant_name: z.string().optional(),
  inspector_name: z.string().optional(),
  inspection_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  measure_type_id: z.string().optional(),
  selected_tags: z.array(z.string()).default([]),
  applicant_recno: z.number().optional(),
  participants: z.array(z.record(z.unknown())).default([]),
  external_participants: z.array(z.record(z.unknown())).default([]),
  estates: z.array(z.record(z.unknown())).default([]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  area_geojson: z
    .object({
      type: z.literal("Polygon"),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
    })
    .nullable()
    .optional(),
  sif_stage_recno: z.number().optional(),
  bakgrunn: z.array(z.string()).default([]),
  befaringsomrade: z.array(z.string()).default([]),
  tiltakstype: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateInspectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("inspections")
    .insert({ ...parsed.data, user_id: user.id, status: "draft" })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating inspection", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
