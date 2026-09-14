/**
 * Feeling values come in two shapes: a mood word ("hạnh phúc 😊") or an activity
 * phrase that already starts with "đang" ("đang du lịch ✈️"). Moods need "cảm thấy"
 * prefixed; activities read naturally on their own — prefixing both the same way
 * produced "đang cảm thấy đang du lịch".
 */
export function formatFeelingPhrase(feeling: string): string {
  const trimmed = feeling.trim();
  return trimmed.startsWith('đang ') ? trimmed : `đang cảm thấy ${trimmed}`;
}
