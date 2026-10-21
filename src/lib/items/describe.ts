import { formatDecimal } from "./numbers";
import type { ItemContent, ItemKey, ItemResponse } from "./schemas";

function labelPrefix(label: string): string {
  if (!label) return "";
  const trimmed = label.trim();
  if (/(=|:|=\$|\?)$/.test(trimmed)) return `${trimmed} `;
  return trimmed.startsWith("$") ? `${trimmed} = ` : `${trimmed}: `;
}

export function describeAnswer(content: ItemContent, key: ItemKey): string[] {
  if (content.type === "input" && key.type === "input") {
    return content.fields.map((field) => {
      const fieldKey = key.fields[field.id];
      const prefix = labelPrefix(field.label);
      if (!fieldKey) return prefix;
      if (fieldKey.kind === "fraction") return `${prefix}$\\frac{${fieldKey.numerator}}{${fieldKey.denominator}}$`;
      if (fieldKey.kind === "text") return `${prefix}${fieldKey.accept[0]}`;
      if (fieldKey.kind === "select") {
        return `${prefix}${field.kind === "select" ? (field.options.find((option) => option.id === fieldKey.correct)?.text ?? "") : ""}`;
      }
      const unit = fieldKey.unit ?? (field.kind === "number" ? field.suffix : undefined);
      return `${prefix}${formatDecimal(fieldKey.value)}${unit ? ` ${unit}` : ""}`;
    });
  }
  if (content.type === "choice" && key.type === "choice") {
    return [content.options.find((option) => option.id === key.correct)?.text ?? ""];
  }
  if (content.type === "multi_choice" && key.type === "multi_choice") {
    return content.options.filter((option) => key.correct.includes(option.id)).map((option) => option.text);
  }
  if (content.type === "order" && key.type === "order") {
    return key.correct.map((id, index) => `${index + 1}. ${content.steps.find((step) => step.id === id)?.text ?? ""}`);
  }
  return [];
}

export function describeResponse(content: ItemContent, response: ItemResponse): string[] {
  if (response.type === "skip") return ["Non lo so"];
  if (content.type === "input" && response.type === "input") {
    return content.fields.map((field) => {
      const given = response.fields[field.id];
      const prefix = labelPrefix(field.label);
      if (!given) return `${prefix}—`;
      if (given.kind === "fraction") {
        const ok = /^-?\d+$/.test(given.numerator.trim()) && /^-?\d+$/.test(given.denominator.trim());
        return ok ? `${prefix}$\\frac{${given.numerator.trim()}}{${given.denominator.trim()}}$` : `${prefix}${given.numerator || "?"} / ${given.denominator || "?"}`;
      }
      if (given.kind === "text") return `${prefix}${given.value.trim() || "—"}`;
      if (given.kind === "select") {
        return `${prefix}${field.kind === "select" ? (field.options.find((option) => option.id === given.option)?.text ?? "—") : "—"}`;
      }
      const unit = given.unit ?? (field.kind === "number" && !field.units ? field.suffix : undefined);
      return `${prefix}${given.value.trim() || "—"}${unit ? ` ${unit}` : field.kind === "number" && field.units ? " (senza unità)" : ""}`;
    });
  }
  if (content.type === "choice" && response.type === "choice") {
    return [content.options.find((option) => option.id === response.option)?.text ?? "—"];
  }
  if (content.type === "multi_choice" && response.type === "multi_choice") {
    const chosen = content.options.filter((option) => response.options.includes(option.id)).map((option) => option.text);
    return chosen.length > 0 ? chosen : ["—"];
  }
  if (content.type === "order" && response.type === "order") {
    return response.order.map((id, index) => `${index + 1}. ${content.steps.find((step) => step.id === id)?.text ?? ""}`);
  }
  return ["—"];
}
