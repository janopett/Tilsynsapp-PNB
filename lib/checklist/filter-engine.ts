// ============================================================
// Checkpoint Filter Engine
// Simple rule: a checkpoint is included if:
//   1. The selected measure type is in checkpoint.applies_to
//   2. ALL required_tags are present in the inspection's selected_tags
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
 * Filter the checkpoint library based on measure type and property tags.
 * Returns only relevant checkpoints.
 */
export function filterCheckpoints(
  measureTypeId: MeasureTypeId,
  selectedTags: PropertyTag[],
  allCheckpoints: CheckpointDefinition[] = CHECKPOINT_DEFINITIONS
): CheckpointDefinition[] {
  return allCheckpoints.filter((cp) => {
    // Rule 1: measure type must be in applies_to
    if (!cp.applies_to.includes(measureTypeId)) return false;

    // Rule 2: all required_tags must be selected
    if (cp.required_tags.length > 0) {
      const allTagsMatch = cp.required_tags.every((tag) =>
        selectedTags.includes(tag)
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
