// ============================================================
// Audit logging for admin actions (ISO 27001 A.12.4.1)
// Activity logging for saksbehandler actions.
//
// All writes go through the service role so RLS is bypassed.
// Failures are non-fatal — a logging error must never block the
// actual operation from completing.
// ============================================================

import { createServiceClient } from "@/lib/supabase/server";

// ── Admin audit log ───────────────────────────────────────────────────────────

export type AuditAction =
  // User management
  | "user.create"
  | "user.set_admin"
  | "user.update_name"
  // Checkpoint definitions
  | "checkpoint.create"
  | "checkpoint.update"
  | "checkpoint.deactivate"
  | "checkpoint.delete"
  // Inspection config (tilsynsomrade, tilsynstype, bakgrunn)
  | "inspection_config.create"
  | "inspection_config.delete"
  // SIF integration settings
  | "sif_settings.update";

export interface AuditEvent {
  adminId: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an admin audit log entry. Fire-and-forget.
 */
export async function writeAuditLog(event: AuditEvent): Promise<void> {
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.from("audit_logs").insert({
      admin_id: event.adminId,
      action: event.action,
      target_type: event.targetType,
      target_id: event.targetId ?? null,
      metadata: event.metadata ?? {},
    });
    if (error) {
      console.error("[audit] Failed to write audit log:", error.message, event);
    }
  } catch (err) {
    console.error("[audit] Unexpected error writing audit log:", err, event);
  }
}

// ── Saksbehandler activity log ────────────────────────────────────────────────

export type ActivityAction =
  // Inspections
  | "inspection.create"
  | "inspection.answer"
  // Archival to SIF/360°
  | "inspection.archive"
  | "inspection.archive_failed"
  // SIF case lookups
  | "sif.case_lookup"
  | "sif.case_lookup_not_found";

export interface ActivityEvent {
  /** auth.users.id of the saksbehandler */
  userId: string;
  /** Email snapshot — preserved even if the account is later deleted */
  userEmail: string;
  action: ActivityAction;
  /** Relevant inspection, if any */
  inspectionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write a saksbehandler activity log entry. Fire-and-forget.
 * Stored in activity_logs (separate from admin audit_logs).
 */
export async function writeActivityLog(event: ActivityEvent): Promise<void> {
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.from("activity_logs").insert({
      user_id: event.userId,
      user_email: event.userEmail,
      action: event.action,
      inspection_id: event.inspectionId ?? null,
      metadata: event.metadata ?? {},
    });
    if (error) {
      console.error("[activity] Failed to write activity log:", error.message, event.action);
    }
  } catch (err) {
    console.error("[activity] Unexpected error writing activity log:", err);
  }
}
