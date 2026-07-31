import type {
  TuiPluginApi,
  TuiPromptProps,
} from "@opencode-ai/plugin/tui";
import { onCleanup } from "solid-js";
import { usePromptSkillPicker } from "../hooks/use-prompt-skill-picker";

interface PromptWrapperProps extends TuiPromptProps {
  api: TuiPluginApi;
  registerSkillPicker: (openSkillPicker: () => boolean) => () => void;
}

export function PromptWrapper(props: PromptWrapperProps) {
  const { handlePromptRef, openSkillPicker } = usePromptSkillPicker(
    props.api,
    props.ref,
  );
  onCleanup(props.registerSkillPicker(openSkillPicker));
  const Prompt = props.api.ui.Prompt;

  return (
    <Prompt
      sessionID={props.sessionID}
      visible={props.visible}
      disabled={props.disabled}
      onSubmit={props.onSubmit}
      ref={handlePromptRef}
      hint={props.hint}
      right={props.right}
      showPlaceholder={props.showPlaceholder}
      placeholders={props.placeholders}
    />
  );
}
