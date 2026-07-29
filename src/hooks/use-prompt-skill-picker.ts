import type {
  TuiPluginApi,
  TuiPromptProps,
  TuiPromptRef,
} from "@opencode-ai/plugin/tui";
import { showSkillDialog, type Skill } from "../components/skill-dialog";
import {
  findSkillTrigger,
  type SkillTrigger,
  updatePromptWithSkill,
} from "../utils/prompt-skill-trigger";
import {
  usePromptInputObserver,
  type PromptEditor,
} from "./use-prompt-input-observer";

export function usePromptSkillPicker(
  api: TuiPluginApi,
  forwardRef: TuiPromptProps["ref"],
) {
  let prompt: TuiPromptRef | undefined;
  let blockedTrigger: string | undefined;
  let isLoading = false;

  const closeDialogAndFocusPrompt = () => {
    api.ui.dialog.clear();
    prompt?.focus();
  };

  const handleSkillSelect = (
    skill: Skill,
    editor: PromptEditor,
    trigger: SkillTrigger,
  ) => {
    updatePromptWithSkill(prompt, editor, skill.name, trigger);
    closeDialogAndFocusPrompt();
  };

  const openSkillDialog = async (
    editor: PromptEditor,
    trigger: SkillTrigger,
  ) => {
    isLoading = true;
    try {
      const skills = await loadSkills(api);
      const currentTrigger = findSkillTrigger(
        prompt?.current.input ?? "",
        trigger.cursorOffset,
      );
      if (
        !currentTrigger ||
        currentTrigger.input !== trigger.input ||
        editor.cursorOffset !== trigger.cursorOffset
      )
        return;
      if (api.ui.dialog.open) return;

      showSkillDialog(
        api,
        skills,
        (skill) => handleSkillSelect(skill, editor, trigger),
        () => prompt?.focus(),
      );
    } finally {
      isLoading = false;
    }
  };

  const handleInputChange = (editor: PromptEditor | undefined) => {
    const input = prompt?.current.input;
    if (input === undefined || !editor) return;

    const trigger = findSkillTrigger(input, editor.cursorOffset);
    if (!trigger) {
      blockedTrigger = undefined;
      return;
    }

    const triggerKey = `${trigger.cursorOffset}:${trigger.input}`;
    const isBlocked =
      isLoading || api.ui.dialog.open || blockedTrigger === triggerKey;
    if (isBlocked) return;

    blockedTrigger = triggerKey;
    openSkillDialog(editor, trigger);
  };

  const inputObserver = usePromptInputObserver(
    api,
    () => prompt,
    handleInputChange,
  );

  return (value: TuiPromptRef | undefined) => {
    if (!value) inputObserver.detach();
    prompt = value;
    forwardRef?.(value);
    queueMicrotask(inputObserver.attach);
  };
}

async function loadSkills(api: TuiPluginApi) {
  const result = await api.client.app.skills({}, { throwOnError: true });
  return result.data ?? [];
}
