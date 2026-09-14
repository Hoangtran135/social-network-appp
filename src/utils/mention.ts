/** Detects an in-progress "@query" right before the cursor, e.g. typing "@min" mid-sentence. */
export function detectMentionTrigger(text: string, cursorPos: number): { anchorIndex: number; query: string } | null {
  const upToCursor = text.slice(0, cursorPos);
  const match = upToCursor.match(/(?:^|\s)@([\p{L}0-9]*)$/u);
  if (!match) return null;
  const query = match[1];
  const anchorIndex = cursorPos - query.length - 1; // index of the '@' itself
  return { anchorIndex, query };
}

/** Replaces the in-progress "@query" with "@Full Name " and returns the new cursor position. */
export function insertMention(text: string, anchorIndex: number, cursorPos: number, name: string) {
  const before = text.slice(0, anchorIndex);
  const after = text.slice(cursorPos);
  const inserted = `@${name} `;
  return { text: before + inserted + after, cursorPos: (before + inserted).length };
}
