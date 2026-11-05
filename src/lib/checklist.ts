export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskParsedDescription {
  notes: string;
  checklist: TaskChecklistItem[];
}

export function parseTaskDescription(raw?: string | null): TaskParsedDescription {
  if (!raw || !raw.trim()) {
    return { notes: "", checklist: [] };
  }

  const trimmed = raw.trim();

  // Try parsing JSON format
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        const notes = typeof parsed.notes === "string" ? parsed.notes : "";
        const rawChecklist = Array.isArray(parsed.checklist) ? parsed.checklist : [];
        const checklist: TaskChecklistItem[] = rawChecklist
          .filter((item: unknown) => item && typeof item === "object")
          .map((item: { id?: unknown; text?: unknown; completed?: unknown }, index: number): TaskChecklistItem => ({
            id: typeof item.id === "string" && item.id ? item.id : `item-${Date.now()}-${index}`,
            text: typeof item.text === "string" ? item.text : "",
            completed: Boolean(item.completed),
          }))
          .filter((item: TaskChecklistItem) => item.text.trim().length > 0);

        return { notes, checklist };
      }
    } catch {
      // Fall through if not valid JSON
    }
  }

  // Try parsing markdown checklist lines (e.g. "- [ ] item" or "- [x] item")
  const lines = trimmed.split("\n");
  const checklist: TaskChecklistItem[] = [];
  const notesLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
    if (match) {
      const isCompleted = match[1].toLowerCase() === "x";
      const text = match[2].trim();
      if (text) {
        checklist.push({
          id: `md-${Date.now()}-${i}`,
          text,
          completed: isCompleted,
        });
      }
    } else {
      notesLines.push(line);
    }
  }

  if (checklist.length > 0) {
    return {
      notes: notesLines.join("\n").trim(),
      checklist,
    };
  }

  // Plain text fallback
  return { notes: trimmed, checklist: [] };
}

export function serializeTaskDescription(
  notes: string,
  checklist: TaskChecklistItem[]
): string | null {
  const cleanNotes = notes.trim();
  const validChecklist = checklist.filter((item: TaskChecklistItem) => item.text.trim().length > 0);

  if (validChecklist.length === 0 && !cleanNotes) {
    return null;
  }

  if (validChecklist.length === 0) {
    return cleanNotes;
  }

  return JSON.stringify({
    notes: cleanNotes,
    checklist: validChecklist,
  });
}
