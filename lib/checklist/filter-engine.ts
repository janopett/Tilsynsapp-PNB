// ============================================================
// Checkpoint Filter Engine
// Simple rule: a checkpoint is included if:
//   1. The selected measure type is in checkpoint.applies_to
//   2. ALL required_tags are present in the effective tag set
//      (auto-inferred tags from measure type + user-selected tags)
// ============================================================

import type {
  CheckpointDefinition,
  MeasureTypeId,
  PropertyTag,
  CheckpointWithAnswer,
  InspectionAnswer,
  CheckpointCategory,
} from "@/types";
import { CHECKPOINT_DEFINITIONS } from "@/data/seed/checkpoint-definitions";

/**
 * Tags that are automatically inferred from the measure type.
 * These are never shown as manual checkboxes in the UI — the measure
 * type already carries enough information to determine them.
 *
 * soeknadspliktig     — all listed types are permit-required in practice
 * har_ansvarlige_foretak — larger/complex measures always require responsible parties
 * krever_tilgjengelighet — follows from building category (TEK17 § 12-1)
 * krever_lydkrav         — follows from multi-unit building type (TEK17 § 13-6)
 */
const AUTO_TAGS_BY_MEASURE_TYPE: Record<MeasureTypeId, PropertyTag[]> = {
  garasje_carport:   ["soeknadspliktig"],
  tilbygg:           ["soeknadspliktig", "har_ansvarlige_foretak"],
  paabygg:           ["soeknadspliktig", "har_ansvarlige_foretak"],
  enebolig:          ["soeknadspliktig", "har_ansvarlige_foretak"],
  tomannsbolig:      ["soeknadspliktig", "har_ansvarlige_foretak", "krever_lydkrav"],
  leilighetsbygg:    ["soeknadspliktig", "har_ansvarlige_foretak", "krever_tilgjengelighet", "krever_lydkrav"],
  fritidsbolig:      ["soeknadspliktig", "har_ansvarlige_foretak"],
  naeringsbygg:      ["soeknadspliktig", "har_ansvarlige_foretak", "krever_tilgjengelighet"],
  bruksendring:      ["soeknadspliktig", "har_ansvarlige_foretak"],
  fasadeendring:     ["soeknadspliktig"],
  terrasse_balkong:  ["soeknadspliktig"],
  stoettemur:        ["soeknadspliktig"],
  uthus_anneks:      [],
  naust:             ["soeknadspliktig"],
  riving:            ["soeknadspliktig"],
};

/**
 * Returns the auto-inferred tags for a given measure type.
 * Useful when the caller needs to know effective tags without running a full filter.
 */
export function getAutoTags(measureTypeId: MeasureTypeId): PropertyTag[] {
  return AUTO_TAGS_BY_MEASURE_TYPE[measureTypeId] ?? [];
}

/**
 * Filter the checkpoint library based on measure type and property tags.
 * Auto-inferred tags (derived from measure type) are merged with the
 * user-selected tags before filtering — callers only pass manual tags.
 */
export function filterCheckpoints(
  measureTypeId: MeasureTypeId,
  selectedTags: PropertyTag[],
  allCheckpoints: CheckpointDefinition[] = CHECKPOINT_DEFINITIONS
): CheckpointDefinition[] {
  const autoTags = getAutoTags(measureTypeId);
  const seen = new Set<PropertyTag>();
  const effectiveTags: PropertyTag[] = [];
  for (const tag of [...autoTags, ...selectedTags]) {
    if (!seen.has(tag)) { seen.add(tag); effectiveTags.push(tag); }
  }

  return allCheckpoints.filter((cp) => {
    // Rule 1: measure type must be in applies_to
    if (!cp.applies_to.includes(measureTypeId)) return false;

    // Rule 2: all required_tags must be in the effective tag set
    if (cp.required_tags.length > 0) {
      const allTagsMatch = cp.required_tags.every((tag) =>
        effectiveTags.includes(tag)
      );
      if (!allTagsMatch) return false;
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
  const answerMap = new Map(
    answers.map((a) => [a.checkpoint_definition_id, a])
  );

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
export function getCategoryLabel(
  category: CheckpointCategory,
  locale: "nb" | "en" = "nb"
): string {
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
