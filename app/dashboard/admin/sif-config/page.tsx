import { loadSifSettings, sanitizeForClient } from "@/lib/sif/settings";
import SifConfigForm from "./SifConfigForm";

/**
 * Server Component — fetches SIF settings during SSR so the form renders
 * immediately without a client-side loading spinner (improves LCP).
 * Auth is already guaranteed by the parent AdminLayout.
 */
export default async function SifConfigPage() {
  const settings = await loadSifSettings();
  const initialSettings = settings ? sanitizeForClient(settings) : null;
  return <SifConfigForm initialSettings={initialSettings} />;
}
