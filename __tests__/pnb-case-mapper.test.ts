/**
 * @jest-environment node
 */
import { mapMilestones, mapPnbCase } from "@/lib/sif/pnb-case-mapper";
import type { SifCaseResult } from "@/lib/sif/types";

const minimalCase: SifCaseResult = {
  Recno: 101,
  CaseNumber: "24/1234",
  Title: "Tilsynssak Testgate 1",
  Successful: true,
};

describe("mapMilestones", () => {
  it("returns empty array for undefined input", () => {
    expect(mapMilestones(undefined)).toEqual([]);
  });

  it("maps MilestoneDate to date field", () => {
    const result = mapMilestones([{ MilestoneDate: "2025-03-01", Title: "Start" }]);
    expect(result[0].date).toBe("2025-03-01");
    expect(result[0].title).toBe("Start");
  });

  it("falls back through date fields in order", () => {
    const result = mapMilestones([{ DueDate: "2025-04-01" }]);
    expect(result[0].date).toBe("2025-04-01");
  });

  it("maps status from MilestoneStatus", () => {
    const result = mapMilestones([{ MilestoneStatus: "Nådd" }]);
    expect(result[0].status).toBe("Nådd");
  });

  it("falls back to StatusDescription then Status for status field", () => {
    const result = mapMilestones([{ StatusDescription: "Ferdig" }]);
    expect(result[0].status).toBe("Ferdig");
  });
});

describe("mapPnbCase", () => {
  it("maps minimal case fields", () => {
    const result = mapPnbCase(minimalCase);
    expect(result.recno).toBe(101);
    expect(result.caseNumber).toBe("24/1234");
    expect(result.title).toBe("Tilsynssak Testgate 1");
    expect(result.contacts).toEqual([]);
    expect(result.estates).toEqual([]);
    expect(result.stages).toEqual([]);
    expect(result.milestones).toEqual([]);
    expect(result.progressPlanDates).toEqual([]);
  });

  it("prepends baseUrl to relative URL", () => {
    const result = mapPnbCase({ ...minimalCase, URL: "/Cases/123" }, "https://example.com");
    expect(result.url).toBe("https://example.com/Cases/123");
  });

  it("keeps absolute URL as-is", () => {
    const result = mapPnbCase({ ...minimalCase, URL: "https://example.com/Cases/123" });
    expect(result.url).toBe("https://example.com/Cases/123");
  });

  it("maps contacts with role and email", () => {
    const result = mapPnbCase({
      ...minimalCase,
      Contacts: [
        {
          ContactName: "Ola Nordmann",
          Role: "SA",
          RoleDescription: "Saksbehandler",
          Email: "ola@kommune.no",
        },
      ],
    });
    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0].name).toBe("Ola Nordmann");
    expect(result.contacts[0].roleDescription).toBe("Saksbehandler");
    expect(result.contacts[0].email).toBe("ola@kommune.no");
  });

  it("maps estates and joins address parts", () => {
    const result = mapPnbCase({
      ...minimalCase,
      CaseEstates: [
        {
          EstateNumber: "123/4",
          Address: { StreetAddress: "Testgate 1", ZipCode: "0001", ZipPlace: "Oslo" },
        },
      ],
    });
    expect(result.estates[0].estateNumber).toBe("123/4");
    expect(result.estates[0].address).toBe("Testgate 1 0001 Oslo");
  });

  it("maps stages with milestones", () => {
    const result = mapPnbCase({
      ...minimalCase,
      Stages: [
        {
          Recno: 1,
          Title: "Søknadsbehandling",
          StageStatus: { Description: "Aktiv" },
          DeadlineDate: "2025-12-01",
          Milestones: [{ MilestoneDate: "2025-11-01", Title: "Befaring" }],
        },
      ],
    });
    expect(result.stages[0].title).toBe("Søknadsbehandling");
    expect(result.stages[0].stageStatus).toBe("Aktiv");
    expect(result.stages[0].deadlineDate).toBe("2025-12-01");
    expect(result.stages[0].milestones[0].title).toBe("Befaring");
  });

  it("extracts progressPlanDates from active phases", () => {
    const result = mapPnbCase({
      ...minimalCase,
      ProgressPlan: {
        ActivePhases: [{ DeadlineDate: "2025-06-30", DueDate: "2025-07-15" }],
      },
    });
    expect(result.progressPlanDates).toContain("2025-06-30");
    expect(result.progressPlanDates).toContain("2025-07-15");
  });
});
