// ============================================================
// Audit logging for admin actions (ISO 27001 A.12.4.1)
// All writes go through the service role so RLS is bypassed.
// Failures are non-fatal — a logging error must never block the
// actual admin operation from completing.
// ============================================================

import { createServiceClient } from "@/lib/supabase/server";

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
 * Write an audit log entry. Fire-and-forget — errors are logged to console
 * but never thrown, so a logging failure never disrupts the admin operation.
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
