// ============================================================
// Checkpoint Filter Engine
// Checkpoints filtreres på befaringsomrade og tiltakstype
// fra SIF-kodetabeller. Tomme arrays på et sjekkpunkt betyr
// «gjelder alle verdier» (ingen filtrering).
// ============================================================

import type {
  CheckpointCategory,
  CheckpointDefinition,
  CheckpointWithAnswer,
  InspectionAnswer,
} from "@/types";

/**
 * Filter the checkpoint library based on selected befaringsomrade
 * and tiltakstype values from PNB codetables.
 *
 * Rules:
 *   - applies_to_omrade empty  → applies to all supervision areas
 *   - applies_to_omrade non-empty → at least one selected omrade must match
 *   - applies_to_type_codes empty → applies to all measure types
 *   - applies_to_type_codes non-empty → at least one selected type must match
 */
export function filterCheckpoints(
  checkpoints: CheckpointDefinition[],
  befaringsomrade: string[] = [],
  tiltakstype: string[] = []
): CheckpointDefinition[] {
  return checkpoints.filter((cp) => {
    const cpOmrade = cp.applies_to_omrade ?? [];
    if (cpOmrade.length > 0 && befaringsomrade.length > 0) {
      if (!befaringsomrade.some((v) => cpOmrade.includes(v))) return false;
    }

    const cpType = cp.applies_to_type_codes ?? [];
    if (cpType.length > 0 && tiltakstype.length > 0) {
      if (!tiltakstype.some((v) => cpType.includes(v))) return false;
    }

    return true;
  });
}

/**
 * Merge checkpoint definitions with their existing answers.
 */
export function mergeCheckpointsWithAnswers(
  checkpoints: CheckpointDefinition[],
  answers: InspectionAnswer[]
): CheckpointWithAnswer[] {
  const answerMap = new Map(answers.map((a) => [a.checkpoint_definition_id, a]));

  return checkpoints.map((def) => ({
    definition: def,
    answer: answerMap.get(def.id),
  }));
}

/**
 * Group checkpoints by category.
 */
export function groupByCategory(
  items: CheckpointWithAnswer[]
): Map<CheckpointCategory, CheckpointWithAnswer[]> {
  const groups = new Map<CheckpointCategory, CheckpointWithAnswer[]>();

  for (const item of items) {
    const cat = item.definition.category;
    if (!groups.has(cat)) {
      groups.set(cat, []);
    }
    groups.get(cat)!.push(item);
  }

  return groups;
}

/** Norwegian category labels (canonical — also used in PDF/JSON exports). */
export const CATEGORY_LABELS: Record<CheckpointCategory, string> = {
  formelle_forhold: "Formelle forhold",
  plassering: "Plassering",
  utnyttelse_stoerrelse: "Utnyttelse / Størrelse",
  konstruksjon: "Konstruksjon",
  brann: "Brann",
  fukt_overvann: "Fukt / Overvann",
  terreng: "Terreng",
  teknisk: "Teknisk",
  bruk_funksjon: "Bruk / Funksjon",
  dokumentasjon_ferdigattest: "Dokumentasjon / Ferdigattest",
};

/** English category labels. */
export const CATEGORY_LABELS_EN: Record<CheckpointCategory, string> = {
  formelle_forhold: "Formal requirements",
  plassering: "Placement",
  utnyttelse_stoerrelse: "Utilisation / Size",
  konstruksjon: "Construction",
  brann: "Fire safety",
  fukt_overvann: "Moisture / Stormwater",
  terreng: "Terrain",
  teknisk: "Technical",
  bruk_funksjon: "Use / Function",
  dokumentasjon_ferdigattest: "Documentation / Completion",
};

/** Return the localised category label for a given locale. */
export function getCategoryLabel(category: CheckpointCategory, locale: "nb" | "en" = "nb"): string {
  return (locale === "en" ? CATEGORY_LABELS_EN : CATEGORY_LABELS)[category];
}

export const CATEGORY_ORDER: CheckpointCategory[] = [
  "formelle_forhold",
  "plassering",
  "utnyttelse_stoerrelse",
  "konstruksjon",
  "brann",
  "fukt_overvann",
  "terreng",
  "teknisk",
  "bruk_funksjon",
  "dokumentasjon_ferdigattest",
];

/**
 * Calculate inspection summary statistics.
 */
export function calculateSummary(items: CheckpointWithAnswer[]) {
  const total = items.length;
  let ok = 0;
  let deviations = 0;
  let notChecked = 0;

  const deviationItems: CheckpointWithAnswer[] = [];

  for (const item of items) {
    const status = item.answer?.status ?? "not_checked";
    if (status === "ok") ok++;
    else if (status === "deviation") {
      deviations++;
      deviationItems.push(item);
    } else {
      notChecked++;
    }
  }

  return { total, ok, deviations, not_checked: notChecked, deviation_items: deviationItems };
}
