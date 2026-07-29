import type { TuiPromptRef } from "@opencode-ai/plugin/tui";
import type { PromptEditor } from "../hooks/use-prompt-input-observer";

export interface SkillTrigger {
  input: string;
  cursorOffset: number;
}

export function findSkillTrigger(
  input: string,
  cursorOffset: number,
): SkillTrigger | undefined {
  const triggerOffset = cursorOffset - 1;
  if (triggerOffset < 0 || input[triggerOffset] !== "#") return;
  return { input, cursorOffset };
}

export function updatePromptWithSkill(
  prompt: TuiPromptRef | undefined,
  editor: PromptEditor,
  skillName: string,
  trigger: SkillTrigger,
) {
  if (!prompt) return;
  const currentTrigger = findSkillTrigger(
    prompt.current.input,
    trigger.cursorOffset,
  );
  if (!currentTrigger || currentTrigger.input !== trigger.input) return;

  editor.cursorOffset = trigger.cursorOffset - 1;
  const start = editor.logicalCursor;
  editor.cursorOffset = trigger.cursorOffset;
  const end = editor.logicalCursor;
  editor.deleteRange(start.row, start.col, end.row, end.col);
  editor.insertText(`#${skillName} `);
}
