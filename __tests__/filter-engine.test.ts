import {
  filterCheckpoints,
  mergeCheckpointsWithAnswers,
  groupByCategory,
  calculateSummary,
} from "@/lib/checklist/filter-engine";
import type { CheckpointDefinition, InspectionAnswer } from "@/types";

// Minimal fixture checkpoints using codetable-based filtering
const mockCheckpoints: CheckpointDefinition[] = [
  {
    id: "cp-1",
    title: "Sjekk 1 – alle områder",
    category: "plassering",
    description: "Gjelder alle befaringsområder",
    applies_to: [],
    required_tags: [],
    severity: "warning",
    applies_to_omrade: [],
    applies_to_type_codes: [],
  },
  {
    id: "cp-2",
    title: "Sjekk 2 – kun bæreevne",
    category: "konstruksjon",
    description: "Kun for Sikkerhet, bæreevne",
    applies_to: [],
    required_tags: [],
    severity: "critical",
    applies_to_omrade: ["Sikkerhet, bæreevne"],
    applies_to_type_codes: [],
  },
  {
    id: "cp-3",
    title: "Sjekk 3 – tiltakstype-spesifikk",
    category: "brann",
    description: "Kun for en bestemt tiltakstype",
    applies_to: [],
    required_tags: [],
    severity: "info",
    applies_to_omrade: [],
    applies_to_type_codes: ["Nytt utvendig anlegg for vann og avløp"],
  },
  {
    id: "cp-4",
    title: "Sjekk 4 – kombinert filter",
    category: "brann",
    description: "Krev begge",
    applies_to: [],
    required_tags: [],
    severity: "critical",
    applies_to_omrade: ["Sikkerhet, bæreevne"],
    applies_to_type_codes: ["Nytt utvendig anlegg for vann og avløp"],
  },
];

describe("filterCheckpoints", () => {
  it("viser alle sjekkpunkter når ingen filter er valgt", () => {
    const result = filterCheckpoints(mockCheckpoints, [], []);
    expect(result).toHaveLength(4);
  });

  it("inkluderer sjekkpunkter med tomt applies_to_omrade (gjelder alle)", () => {
    const result = filterCheckpoints(mockCheckpoints, ["Sikkerhet, bæreevne"], []);
    expect(result.map((c) => c.id)).toContain("cp-1");
  });

  it("inkluderer sjekkpunkter som matcher valgt befaringsomrade", () => {
    const result = filterCheckpoints(mockCheckpoints, ["Sikkerhet, bæreevne"], []);
    expect(result.map((c) => c.id)).toContain("cp-2");
  });

  it("ekskluderer sjekkpunkt som ikke matcher befaringsomrade", () => {
    const result = filterCheckpoints(mockCheckpoints, ["Energibruk"], []);
    expect(result.map((c) => c.id)).not.toContain("cp-2");
  });

  it("inkluderer sjekkpunkter som matcher valgt tiltakstype", () => {
    const result = filterCheckpoints(mockCheckpoints, [], ["Nytt utvendig anlegg for vann og avløp"]);
    expect(result.map((c) => c.id)).toContain("cp-3");
  });

  it("kombinert filter: krever match på begge", () => {
    const withBoth = filterCheckpoints(
      mockCheckpoints,
      ["Sikkerhet, bæreevne"],
      ["Nytt utvendig anlegg for vann og avløp"]
    );
    expect(withBoth.map((c) => c.id)).toContain("cp-4");

    const withOnlyOmrade = filterCheckpoints(mockCheckpoints, ["Sikkerhet, bæreevne"], []);
    // cp-4 har type_codes satt, men ingen tiltakstype er valgt → ingen filtrering på type → vises
    expect(withOnlyOmrade.map((c) => c.id)).toContain("cp-4");
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
    expect(groups.get("plassering")).toHaveLength(1);
    expect(groups.get("konstruksjon")).toHaveLength(1);
    expect(groups.get("brann")).toHaveLength(2);
  });
});

describe("calculateSummary", () => {
  const answers: InspectionAnswer[] = [
    {
      id: "a1",
      inspection_id: "i1",
      checkpoint_definition_id: "cp-1",
      status: "ok",
      comment: undefined,
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
