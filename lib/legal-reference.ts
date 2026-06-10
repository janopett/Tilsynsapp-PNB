// ============================================================
// Legal reference URL builder
// Maps Norwegian building law references to Lovdata URLs
// ============================================================

const LOVDATA_BASE = "https://lovdata.no";

// Law identifiers on Lovdata
const LAW_IDS: Record<string, string> = {
  pbl: "lov/2008-06-27-71", // Plan- og bygningsloven
  sak10: "forskrift/2010-03-26-488", // Byggesaksforskriften
  tek17: "forskrift/2017-06-19-840", // Teknisk forskrift 2017
  tek10: "forskrift/2010-03-26-489", // Teknisk forskrift 2010
  bsl: "lov/1965-06-18-4", // Bygningsloven (historic)
};

/**
 * Parse a legal reference string and return a Lovdata URL, or null if unknown.
 * Examples: "pbl § 21-4" → https://lovdata.no/lov/2008-06-27-71/§21-4
 *           "SAK10 § 14-8" → https://lovdata.no/forskrift/2010-03-26-488/§14-8
 */
export function buildLegalUrl(ref: string): string | null {
  if (!ref) return null;

  const normalized = ref.toLowerCase().replace(/\s+/g, " ").trim();

  for (const [key, lawId] of Object.entries(LAW_IDS)) {
    if (normalized.includes(key)) {
      const match = ref.match(/§\s*([\d][0-9a-z-]*)/i);
      if (match) {
        return `${LOVDATA_BASE}/${lawId}/§${match[1]}`;
      }
      // Reference to the law without a specific paragraph
      return `${LOVDATA_BASE}/${lawId}`;
    }
  }

  return null;
}
