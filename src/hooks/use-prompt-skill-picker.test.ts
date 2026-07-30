import type { TuiPluginApi, TuiPromptRef } from "@opencode-ai/plugin/tui";
import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import type { PromptEditor } from "./use-prompt-input-observer";
import { usePromptSkillPicker } from "./use-prompt-skill-picker";

const mocks = vi.hoisted(() => ({
  showSkillDialog: vi.fn(),
}));

vi.mock("../components/skill-dialog", () => ({
  showSkillDialog: mocks.showSkillDialog,
}));

const triggerCases = [
  { position: "start", input: "#write a test", cursorOffset: 1 },
  { position: "middle", input: "write #a test", cursorOffset: 7 },
  { position: "end", input: "write a test#", cursorOffset: 13 },
] as const;

describe("usePromptSkillPicker", () => {
  it.each(triggerCases)(
    "given a prompt when # is typed at the $position then it opens the skill dialog",
    async ({ input, cursorOffset }) => {
      const editorState = {
        cursorOffset: 0,
        plainText: "",
        logicalCursor: { row: 0, col: 0, offset: 0 },
        onContentChange: undefined,
      };
      const editor = editorState as unknown as PromptEditor;
      const api = {
        renderer: { currentFocusedEditor: editor },
        ui: { dialog: { open: false } },
        client: {
          app: { skills: vi.fn().mockResolvedValue({ data: [] }) },
        },
      } as unknown as TuiPluginApi;
      const prompt = {
        focused: true,
        current: { input: "", parts: [] },
        focus: vi.fn(),
      } as unknown as TuiPromptRef;
      let dispose = () => {};
      const setPromptRef = createRoot((rootDispose) => {
        dispose = rootDispose;
        return usePromptSkillPicker(api, undefined);
      });

      try {
        setPromptRef(prompt);
        await Promise.resolve();

        editorState.plainText = input;
        editorState.logicalCursor = {
          row: 0,
          col: cursorOffset,
          offset: cursorOffset,
        };
        editor.onContentChange?.({} as never);

        await vi.waitFor(() => {
          expect(mocks.showSkillDialog).toHaveBeenCalledOnce();
        });
      } finally {
        dispose();
        mocks.showSkillDialog.mockClear();
      }
    },
  );
});
