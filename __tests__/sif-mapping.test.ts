/**
 * @jest-environment node
 */
import { buildDocumentTitle } from "@/config/sif-mapping";

describe("buildDocumentTitle", () => {
  it("replaces {{title}} placeholder", () => {
    expect(buildDocumentTitle("{{title}} - rapport", { caseTitle: "Tilsynssak" })).toBe(
      "Tilsynssak - rapport"
    );
  });

  it("replaces {{caseTitle}} as backward-compat alias for {{title}}", () => {
    expect(buildDocumentTitle("{{caseTitle}} - rapport", { caseTitle: "Tilsynssak" })).toBe(
      "Tilsynssak - rapport"
    );
  });

  it("formats date as DD.MM.YYYY", () => {
    const result = buildDocumentTitle("{{date}}", { date: "2025-03-15" });
    expect(result).toBe("15.03.2025");
  });

  it("replaces {{year}} with just the year", () => {
    const result = buildDocumentTitle("{{year}}", { date: "2025-03-15", year: "2025" });
    expect(result).toBe("2025");
  });

  it("replaces {{propertyAddress}}", () => {
    expect(buildDocumentTitle("{{propertyAddress}}", { propertyAddress: "Testgate 1" })).toBe(
      "Testgate 1"
    );
  });

  it("replaces {{caseNumber}}", () => {
    expect(buildDocumentTitle("{{caseNumber}}", { caseNumber: "25/123" })).toBe("25/123");
  });

  it("replaces {{inspectorName}}", () => {
    expect(buildDocumentTitle("{{inspectorName}}", { inspectorName: "Kari Saksbehandler" })).toBe(
      "Kari Saksbehandler"
    );
  });

  it("replaces {{gnrBnr}}", () => {
    expect(buildDocumentTitle("{{gnrBnr}}", { gnrBnr: "123/4" })).toBe("123/4");
  });

  it("replaces {{measureType}}", () => {
    expect(buildDocumentTitle("{{measureType}}", { measureType: "Enebolig" })).toBe("Enebolig");
  });

  it("replaces {{inspectionId}}", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(buildDocumentTitle("{{inspectionId}}", { inspectionId: id })).toBe(id);
  });

  it("replaces multiple placeholders in a full template", () => {
    const result = buildDocumentTitle("{{title}} - Tilsynsrapport - {{date}}", {
      caseTitle: "Testgate 1 tilsyn",
      date: "2025-06-11",
    });
    expect(result).toBe("Testgate 1 tilsyn - Tilsynsrapport - 11.06.2025");
  });

  it("leaves unknown placeholders empty string (not undefined)", () => {
    const result = buildDocumentTitle("{{applicantName}} rapport", {});
    expect(result).toBe("rapport");
  });

  it("trims leading/trailing whitespace from result", () => {
    const result = buildDocumentTitle("  {{title}}  ", { caseTitle: "Sak" });
    expect(result).toBe("Sak");
  });
});
