import type {
  TuiPluginApi,
  TuiPromptProps,
  TuiPromptRef,
} from "@opencode-ai/plugin/tui";
import { showSkillDialog, type Skill } from "../components/skill-dialog";
import {
  findSkillTrigger,
  type SkillInsertion,
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
    insertion: SkillInsertion,
  ) => {
    updatePromptWithSkill(prompt, editor, skill.name, insertion);
    closeDialogAndFocusPrompt();
  };

  const openSkillDialog = async (
    editor: PromptEditor,
    insertion: SkillInsertion,
  ) => {
    isLoading = true;
    try {
      const skills = await loadSkills(api);
      if (!prompt?.focused || api.renderer.currentFocusedEditor !== editor) return;
      if (editor.plainText !== insertion.input) return;
      if (
        insertion.replaceTrigger &&
        editor.logicalCursor.offset !== insertion.cursorOffset
      )
        return;
      if (api.ui.dialog.open) return;

      showSkillDialog(
        api,
        skills,
        (skill) => handleSkillSelect(skill, editor, insertion),
        () => prompt?.focus(),
      );
    } finally {
      isLoading = false;
    }
  };

  const handleInputChange = (editor: PromptEditor | undefined) => {
    if (!prompt || !editor) return;

    const trigger = findSkillTrigger(
      editor.plainText,
      editor.logicalCursor.offset,
    );
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

  const openSkillPicker = () => {
    if (!prompt?.focused) return false;
    if (isLoading || api.ui.dialog.open) return true;

    const editor = api.renderer.currentFocusedEditor;
    if (!editor) return true;

    openSkillDialog(editor, {
      input: editor.plainText,
      cursorOffset: editor.logicalCursor.offset,
      replaceTrigger: false,
    });
    return true;
  };

  const inputObserver = usePromptInputObserver(
    api,
    () => prompt,
    handleInputChange,
  );

  const handlePromptRef = (value: TuiPromptRef | undefined) => {
    if (!value) inputObserver.detach();
    prompt = value;
    forwardRef?.(value);
    queueMicrotask(inputObserver.attach);
  };

  return { handlePromptRef, openSkillPicker };
}

async function loadSkills(api: TuiPluginApi) {
  const result = await api.client.app.skills({}, { throwOnError: true });
  return result.data ?? [];
}
