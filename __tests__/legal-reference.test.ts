/**
 * @jest-environment node
 */
import { buildLegalUrl } from "@/lib/legal-reference";

describe("buildLegalUrl", () => {
  it("returns null for empty string", () => {
    expect(buildLegalUrl("")).toBeNull();
  });

  it("builds PBL URL with paragraph", () => {
    expect(buildLegalUrl("pbl § 21-4")).toBe(
      "https://lovdata.no/lov/2008-06-27-71/§21-4"
    );
  });

  it("is case-insensitive for law identifier", () => {
    expect(buildLegalUrl("PBL § 21-4")).toBe(
      "https://lovdata.no/lov/2008-06-27-71/§21-4"
    );
  });

  it("builds SAK10 URL with paragraph", () => {
    expect(buildLegalUrl("SAK10 § 14-8")).toBe(
      "https://lovdata.no/forskrift/2010-03-26-488/§14-8"
    );
  });

  it("builds TEK17 URL with paragraph", () => {
    expect(buildLegalUrl("TEK17 § 12-2")).toBe(
      "https://lovdata.no/forskrift/2017-06-19-840/§12-2"
    );
  });

  it("builds TEK10 URL with paragraph", () => {
    expect(buildLegalUrl("TEK10 § 8-4")).toBe(
      "https://lovdata.no/forskrift/2010-03-26-489/§8-4"
    );
  });

  it("builds BSL URL with paragraph", () => {
    expect(buildLegalUrl("BSL § 5")).toBe(
      "https://lovdata.no/lov/1965-06-18-4/§5"
    );
  });

  it("returns base law URL when no paragraph specified", () => {
    expect(buildLegalUrl("pbl uten paragraf")).toBe(
      "https://lovdata.no/lov/2008-06-27-71"
    );
  });

  it("returns null for unknown law reference", () => {
    expect(buildLegalUrl("arbeidsmiljøloven § 4-1")).toBeNull();
  });

  it("handles paragraph with letter suffix", () => {
    const url = buildLegalUrl("SAK10 § 15-3a");
    expect(url).toBe("https://lovdata.no/forskrift/2010-03-26-488/§15-3a");
  });

  it("handles extra whitespace in input", () => {
    const url = buildLegalUrl("  pbl  §  21-4  ");
    expect(url).toBe("https://lovdata.no/lov/2008-06-27-71/§21-4");
  });
});
