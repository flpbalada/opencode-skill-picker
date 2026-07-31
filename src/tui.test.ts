import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import {
  registerCommaBindings,
  registerDefaultKeys,
  registerLeader,
} from "@opentui/keymap/addons";
import {
  createTestKeymap,
  type TestKeyModifierOptions,
} from "@opentui/keymap/testing";
import { describe, expect, it, vi } from "vitest";
import { registerSkillPickerCommand } from "./register-skill-picker-command";

describe("registerSkillPickerCommand", () => {
  it("registers an unbound open command and disposes it with the plugin", () => {
    const dispose = vi.fn();
    const registerLayer = vi.fn().mockReturnValue(dispose);
    const onDispose = vi.fn();
    const api = {
      keymap: { registerLayer },
      lifecycle: { onDispose },
    } as unknown as TuiPluginApi;

    registerSkillPickerCommand(api, []);

    const layer = registerLayer.mock.calls[0]?.[0];
    expect(layer.bindings).toEqual([]);
    expect(layer.commands).toHaveLength(1);
    expect(layer.commands[0].name).toBe("opencode-skill-picker.open");
    expect(layer.commands[0].namespace).toBe("palette");
    expect(onDispose).toHaveBeenCalledWith(dispose);
  });

  it("rejects malformed binding values", () => {
    expect(() =>
      registerWithOptions({ keybinds: { skill_picker_open: ["ctrl+k", 2] } }),
    ).toThrowError(
      "Invalid keybinds.skill_picker_open: expected a binding string or an array of binding strings",
    );
  });

  it("leaves keys unhandled when no binding is configured", () => {
    const harness = createDispatchHarness();

    try {
      const event = harness.press("k", { ctrl: true });

      expect(event.defaultPrevented).toBe(false);
      expect(event.propagationStopped).toBe(false);
      expect(harness.skillPickers[0]).not.toHaveBeenCalled();
    } finally {
      harness.cleanup();
    }
  });

  it("dispatches ctrl+k through the existing picker command flow", () => {
    const inactiveSkillPicker = vi.fn().mockReturnValue(false);
    const activeSkillPicker = vi.fn().mockReturnValue(true);
    const duplicateSkillPicker = vi.fn().mockReturnValue(true);
    const harness = createDispatchHarness(
      { keybinds: { skill_picker_open: "ctrl+k" } },
      [inactiveSkillPicker, activeSkillPicker, duplicateSkillPicker],
    );

    try {
      const event = harness.press("k", { ctrl: true });

      expect(event.defaultPrevented).toBe(true);
      expect(inactiveSkillPicker).toHaveBeenCalledOnce();
      expect(activeSkillPicker).toHaveBeenCalledOnce();
      expect(duplicateSkillPicker).not.toHaveBeenCalled();
    } finally {
      harness.cleanup();
    }
  });

  it("resolves <leader>k from the host leader without changing plugin config", () => {
    const options = { keybinds: { skill_picker_open: "<leader>k" } };
    const spaceLeader = createDispatchHarness(options, undefined, "space");

    try {
      spaceLeader.press("space");
      spaceLeader.press("k");
      expect(spaceLeader.skillPickers[0]).toHaveBeenCalledOnce();
    } finally {
      spaceLeader.cleanup();
    }

    const backslashLeader = createDispatchHarness(options, undefined, "backslash");

    try {
      const oldLeaderEvent = backslashLeader.press("space");
      backslashLeader.press("k");
      expect(oldLeaderEvent.defaultPrevented).toBe(false);
      expect(backslashLeader.skillPickers[0]).not.toHaveBeenCalled();

      backslashLeader.press("backslash");
      backslashLeader.press("k");
      expect(backslashLeader.skillPickers[0]).toHaveBeenCalledOnce();
    } finally {
      backslashLeader.cleanup();
    }
  });

  it("dispatches every array binding, including native comma expansion", () => {
    const harness = createDispatchHarness({
      keybinds: { skill_picker_open: ["ctrl+j,alt+j", "ctrl+l"] },
    });

    try {
      harness.press("j", { ctrl: true });
      harness.press("j", { meta: true });
      harness.press("l", { ctrl: true });

      expect(harness.skillPickers[0]).toHaveBeenCalledTimes(3);
    } finally {
      harness.cleanup();
    }
  });
});

function registerWithOptions(options: Record<string, unknown>) {
  const registerLayer = vi.fn().mockReturnValue(vi.fn());
  const api = {
    keymap: { registerLayer },
    lifecycle: { onDispose: vi.fn() },
  } as unknown as TuiPluginApi;

  registerSkillPickerCommand(api, [], options);

  return { layer: registerLayer.mock.calls[0]?.[0] };
}

function createDispatchHarness(
  options?: Record<string, unknown>,
  skillPickers = [vi.fn().mockReturnValue(true)],
  leader?: string,
) {
  const harness = createTestKeymap();
  const disposers = [
    registerDefaultKeys(harness.keymap),
    registerCommaBindings(harness.keymap),
  ];
  if (leader !== undefined) {
    disposers.push(registerLeader(harness.keymap, { trigger: leader }));
  }

  const pluginDisposers: Array<() => void> = [];
  const api = {
    keymap: harness.keymap,
    lifecycle: {
      onDispose(dispose: () => void) {
        pluginDisposers.push(dispose);
      },
    },
  } as unknown as TuiPluginApi;
  registerSkillPickerCommand(api, skillPickers, options);

  return {
    skillPickers,
    press(name: string, modifiers?: TestKeyModifierOptions) {
      return harness.host.press(name, modifiers);
    },
    cleanup() {
      for (const dispose of pluginDisposers.reverse()) dispose();
      for (const dispose of disposers.reverse()) dispose();
      harness.cleanup();
    },
  };
}
