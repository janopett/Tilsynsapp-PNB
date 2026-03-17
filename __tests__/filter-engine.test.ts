import {
  filterCheckpoints,
  mergeCheckpointsWithAnswers,
  groupByCategory,
  calculateSummary,
} from "@/lib/checklist/filter-engine";
import type {
  CheckpointDefinition,
  MeasureTypeId,
  PropertyTag,
  InspectionAnswer,
} from "@/types";

// Minimal fixture checkpoints
const mockCheckpoints: CheckpointDefinition[] = [
  {
    id: "cp-1",
    title: "Sjekk 1",
    category: "plassering",
    description: "Test checkpoint 1",
    applies_to: ["garasje_carport", "tilbygg"],
    required_tags: [],
    severity: "warning",
  },
  {
    id: "cp-2",
    title: "Sjekk 2 – nær nabogrense",
    category: "plassering",
    description: "Only when near neighbor boundary",
    applies_to: ["garasje_carport"],
    required_tags: ["naer_nabogrense"],
    severity: "critical",
  },
  {
    id: "cp-3",
    title: "Sjekk 3 – enebolig only",
    category: "konstruksjon",
    description: "Only for enebolig",
    applies_to: ["enebolig"],
    required_tags: [],
    severity: "info",
  },
  {
    id: "cp-4",
    title: "Sjekk 4 – multiple tags required",
    category: "brann",
    description: "Requires both vaatrom and brannskille",
    applies_to: ["garasje_carport", "tilbygg", "enebolig"],
    required_tags: ["inneholder_vaatrom", "har_brannskille"],
    severity: "critical",
  },
];

describe("filterCheckpoints", () => {
  it("returns checkpoints matching measure type with no required tags", () => {
    const result = filterCheckpoints("garasje_carport", [], mockCheckpoints);
    expect(result.map((c) => c.id)).toEqual(["cp-1"]);
  });

  it("includes checkpoint when required tag is present", () => {
    const result = filterCheckpoints(
      "garasje_carport",
      ["naer_nabogrense"],
      mockCheckpoints
    );
    expect(result.map((c) => c.id)).toContain("cp-2");
  });

  it("excludes checkpoint when required tag is missing", () => {
    const result = filterCheckpoints("garasje_carport", [], mockCheckpoints);
    expect(result.map((c) => c.id)).not.toContain("cp-2");
  });

  it("excludes checkpoint for wrong measure type", () => {
    const result = filterCheckpoints("riving", [], mockCheckpoints);
    expect(result).toHaveLength(0);
  });

  it("returns enebolig checkpoints without tags", () => {
    const result = filterCheckpoints("enebolig", [], mockCheckpoints);
    expect(result.map((c) => c.id)).toContain("cp-3");
    expect(result.map((c) => c.id)).not.toContain("cp-1");
  });

  it("requires ALL tags to be present (not just some)", () => {
    // Only one of the two required tags
    const result = filterCheckpoints(
      "garasje_carport",
      ["inneholder_vaatrom"],
      mockCheckpoints
    );
    expect(result.map((c) => c.id)).not.toContain("cp-4");
  });

  it("includes checkpoint when ALL required tags are present", () => {
    const result = filterCheckpoints(
      "garasje_carport",
      ["inneholder_vaatrom", "har_brannskille"],
      mockCheckpoints
    );
    expect(result.map((c) => c.id)).toContain("cp-4");
  });
});

describe("mergeCheckpointsWithAnswers", () => {
  const answers: InspectionAnswer[] = [
    {
      id: "ans-1",
      inspection_id: "insp-1",
      checkpoint_definition_id: "cp-1",
      status: "ok",
      comment: "Looks good",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it("merges answer into matching checkpoint", () => {
    const merged = mergeCheckpointsWithAnswers(
      [mockCheckpoints[0], mockCheckpoints[1]],
      answers
    );
    expect(merged[0].answer?.status).toBe("ok");
    expect(merged[1].answer).toBeUndefined();
  });

  it("returns checkpoints with undefined answer when no match", () => {
    const merged = mergeCheckpointsWithAnswers([mockCheckpoints[2]], answers);
    expect(merged[0].answer).toBeUndefined();
  });
});

describe("groupByCategory", () => {
  it("groups items by category", () => {
    const items = mergeCheckpointsWithAnswers(mockCheckpoints, []);
    const groups = groupByCategory(items);
    expect(groups.get("plassering")).toHaveLength(2);
    expect(groups.get("konstruksjon")).toHaveLength(1);
    expect(groups.get("brann")).toHaveLength(1);
  });
});

describe("calculateSummary", () => {
  const answers: InspectionAnswer[] = [
    {
      id: "a1",
      inspection_id: "i1",
      checkpoint_definition_id: "cp-1",
      status: "ok",
      comment: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "a2",
      inspection_id: "i1",
      checkpoint_definition_id: "cp-2",
      status: "deviation",
      comment: "Problem found",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it("calculates correct totals", () => {
    const items = mergeCheckpointsWithAnswers(mockCheckpoints, answers);
    const summary = calculateSummary(items);
    expect(summary.total).toBe(4);
    expect(summary.ok).toBe(1);
    expect(summary.deviations).toBe(1);
    expect(summary.not_checked).toBe(2);
  });

  it("includes deviation items in deviation_items list", () => {
    const items = mergeCheckpointsWithAnswers(mockCheckpoints, answers);
    const summary = calculateSummary(items);
    expect(summary.deviation_items).toHaveLength(1);
    expect(summary.deviation_items[0].definition.id).toBe("cp-2");
  });

  it("counts all as not_checked when no answers", () => {
    const items = mergeCheckpointsWithAnswers(mockCheckpoints, []);
    const summary = calculateSummary(items);
    expect(summary.total).toBe(4);
    expect(summary.ok).toBe(0);
    expect(summary.deviations).toBe(0);
    expect(summary.not_checked).toBe(4);
  });
});
