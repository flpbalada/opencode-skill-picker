import type { TuiPluginModule } from "@opencode-ai/plugin/tui";
import { PromptWrapper } from "./components/prompt-wrapper";
import { registerSkillPickerCommand } from "./register-skill-picker-command";

type OpenSkillPicker = () => boolean;

export default {
  id: "opencode-skill-picker",
  tui: async (api, options) => {
    const skillPickers = new Set<OpenSkillPicker>();
    const registerSkillPicker = (openSkillPicker: OpenSkillPicker) => {
      skillPickers.add(openSkillPicker);
      return () => {
        skillPickers.delete(openSkillPicker);
      };
    };
    registerSkillPickerCommand(api, skillPickers, options);

    api.slots.register({
      slots: {
        home_prompt(_context, value) {
          const Slot = api.ui.Slot;
          return (
            <PromptWrapper
              api={api}
              ref={value.ref}
              registerSkillPicker={registerSkillPicker}
              right={<Slot name="home_prompt_right" />}
            />
          );
        },
        session_prompt(_context, value) {
          const Slot = api.ui.Slot;
          return (
            <PromptWrapper
              api={api}
              sessionID={value.session_id}
              visible={value.visible}
              disabled={value.disabled}
              onSubmit={value.on_submit}
              ref={value.ref}
              registerSkillPicker={registerSkillPicker}
              right={
                <Slot
                  name="session_prompt_right"
                  session_id={value.session_id}
                />
              }
            />
          );
        },
      },
    });
  },
} satisfies TuiPluginModule & { id: string };
