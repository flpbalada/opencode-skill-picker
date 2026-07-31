import type { PluginOptions } from "@opencode-ai/plugin";
import {
  createBindingLookup,
  type TuiPluginApi,
} from "@opencode-ai/plugin/tui";

type OpenSkillPicker = () => boolean;

const OPEN_COMMAND = "opencode-skill-picker.open";

export function registerSkillPickerCommand(
  api: TuiPluginApi,
  skillPickers: Iterable<OpenSkillPicker>,
  options?: PluginOptions,
) {
  const binding = getOpenBinding(options);
  const bindingLookup = createBindingLookup(
    binding === undefined ? undefined : { skill_picker_open: binding },
    { commandMap: { skill_picker_open: OPEN_COMMAND } },
  );
  const dispose = api.keymap.registerLayer({
    commands: [
      {
        name: OPEN_COMMAND,
        title: "Open skill picker",
        namespace: "palette",
        run: () => openActiveSkillPicker(skillPickers),
      },
    ],
    bindings: bindingLookup.bindings,
  });
  api.lifecycle.onDispose(dispose);
}

function getOpenBinding(
  options?: PluginOptions,
): string | readonly string[] | undefined {
  const keybinds = options?.keybinds;
  if (keybinds === undefined) return;
  if (!isRecord(keybinds)) throw invalidBindingError();

  const binding = keybinds.skill_picker_open;
  if (binding === undefined) return;
  if (isNonEmptyString(binding)) return binding;
  if (Array.isArray(binding) && binding.every(isNonEmptyString)) return binding;
  throw invalidBindingError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function invalidBindingError() {
  return new TypeError(
    "Invalid keybinds.skill_picker_open: expected a binding string or an array of binding strings",
  );
}

function openActiveSkillPicker(skillPickers: Iterable<OpenSkillPicker>) {
  for (const openSkillPicker of skillPickers) {
    if (openSkillPicker()) return true;
  }
  return false;
}
