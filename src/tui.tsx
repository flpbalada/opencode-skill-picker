import type { TuiPluginModule } from "@opencode-ai/plugin/tui";
import { PromptWrapper } from "./components/prompt-wrapper";

export default {
  id: "opencode-skill-picker",
  tui: async (api) => {
    api.slots.register({
      slots: {
        home_prompt(_context, value) {
          const Slot = api.ui.Slot;
          return (
            <PromptWrapper
              api={api}
              ref={value.ref}
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
