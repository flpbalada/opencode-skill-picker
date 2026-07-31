import type { TuiPromptRef } from "@opencode-ai/plugin/tui";
import type { PromptEditor } from "../hooks/use-prompt-input-observer";

export interface SkillInsertion {
  input: string;
  cursorOffset: number;
  replaceTrigger: boolean;
}

export function findSkillTrigger(
  input: string,
  cursorOffset: number,
): SkillInsertion | undefined {
  const triggerOffset = cursorOffset - 1;
  if (triggerOffset < 0 || input[triggerOffset] !== "#") return;
  return { input, cursorOffset, replaceTrigger: true };
}

export function updatePromptWithSkill(
  prompt: TuiPromptRef | undefined,
  editor: PromptEditor,
  skillName: string,
  insertion: SkillInsertion,
) {
  if (!prompt) return;
  if (editor.plainText !== insertion.input) return;

  if (insertion.replaceTrigger) {
    const currentTrigger = findSkillTrigger(
      editor.plainText,
      insertion.cursorOffset,
    );
    if (!currentTrigger) return;

    editor.cursorOffset = insertion.cursorOffset - 1;
    const start = editor.logicalCursor;
    editor.cursorOffset = insertion.cursorOffset;
    const end = editor.logicalCursor;
    editor.deleteRange(start.row, start.col, end.row, end.col);
  } else {
    editor.cursorOffset = insertion.cursorOffset;
  }
  editor.insertText(`#${skillName} `);
}
