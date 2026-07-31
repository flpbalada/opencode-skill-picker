import type { TuiPluginApi, TuiPromptRef } from "@opencode-ai/plugin/tui";
import { createRoot } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Skill } from "../components/skill-dialog";
import type { PromptEditor } from "./use-prompt-input-observer";
import { usePromptSkillPicker } from "./use-prompt-skill-picker";

const mocks = vi.hoisted(() => ({
  showSkillDialog: vi.fn(),
}));

vi.mock("../components/skill-dialog", () => ({
  showSkillDialog: mocks.showSkillDialog,
}));

const typedTriggerCases = [
  { position: "start", input: "#write a test", cursorOffset: 1 },
  { position: "middle", input: "write #a test", cursorOffset: 7 },
  { position: "end", input: "write a test#", cursorOffset: 13 },
] as const;

const insertionCases = [
  {
    position: "start",
    input: "write a test",
    cursorOffset: 0,
    expected: "#review write a test",
  },
  {
    position: "middle",
    input: "write a test",
    cursorOffset: 6,
    expected: "write #review a test",
  },
  {
    position: "end",
    input: "write a test",
    cursorOffset: 12,
    expected: "write a test#review ",
  },
] as const;

describe("usePromptSkillPicker", () => {
  beforeEach(() => {
    mocks.showSkillDialog.mockReset();
  });

  it.each(typedTriggerCases)(
    "opens the skill dialog when # is typed at the $position",
    async ({ input, cursorOffset }) => {
      const picker = await createPicker();

      try {
        picker.changeInput(input, cursorOffset);

        await vi.waitFor(() => {
          expect(mocks.showSkillDialog).toHaveBeenCalledOnce();
        });
      } finally {
        picker.dispose();
      }
    },
  );

  it.each(insertionCases)(
    "inserts the selected skill at the captured $position cursor",
    async ({ input, cursorOffset, expected }) => {
      const picker = await createPicker({ input, cursorOffset });

      try {
        expect(picker.openSkillPicker()).toBe(true);
        await selectSkill({ name: "review" });

        expect(picker.text()).toBe(expected);
      } finally {
        picker.dispose();
      }
    },
  );

  it("replaces a typed # and preserves surrounding text", async () => {
    const picker = await createPicker();

    try {
      picker.changeInput("before#after", 7);
      await selectSkill({ name: "review" });

      expect(picker.text()).toBe("before#review after");
    } finally {
      picker.dispose();
    }
  });

  it("does nothing when no prompt is active", async () => {
    const picker = await createPicker({ focused: false });

    try {
      expect(picker.openSkillPicker()).toBe(false);
      expect(picker.loadSkills).not.toHaveBeenCalled();
      expect(mocks.showSkillDialog).not.toHaveBeenCalled();
    } finally {
      picker.dispose();
    }
  });

  it("does not start a second skill load for a concurrent request", async () => {
    let resolveSkills: (value: { data: Skill[] }) => void = () => {};
    const skills = new Promise<{ data: Skill[] }>((resolve) => {
      resolveSkills = resolve;
    });
    const picker = await createPicker({ skills });

    try {
      expect(picker.openSkillPicker()).toBe(true);
      expect(picker.openSkillPicker()).toBe(true);
      expect(picker.loadSkills).toHaveBeenCalledOnce();

      resolveSkills({ data: [] });
      await vi.waitFor(() => {
        expect(mocks.showSkillDialog).toHaveBeenCalledOnce();
      });
    } finally {
      picker.dispose();
    }
  });

  it("does not open for a typed # when the cursor moves while skills load", async () => {
    let resolveSkills: (value: { data: Skill[] }) => void = () => {};
    const skills = new Promise<{ data: Skill[] }>((resolve) => {
      resolveSkills = resolve;
    });
    const picker = await createPicker({ skills });

    try {
      picker.changeInput("#draft", 1);
      picker.setInput("#draft", 6);
      resolveSkills({ data: [] });
      await skills;

      expect(mocks.showSkillDialog).not.toHaveBeenCalled();
    } finally {
      picker.dispose();
    }
  });

  it("does not load skills or replace an existing dialog", async () => {
    const picker = await createPicker({ dialogOpen: true });

    try {
      expect(picker.openSkillPicker()).toBe(true);
      expect(picker.loadSkills).not.toHaveBeenCalled();
      expect(mocks.showSkillDialog).not.toHaveBeenCalled();
    } finally {
      picker.dispose();
    }
  });

  it("does not insert into editor content changed while the dialog is open", async () => {
    const picker = await createPicker({ input: "draft", cursorOffset: 2 });

    try {
      picker.openSkillPicker();
      await vi.waitFor(() => {
        expect(mocks.showSkillDialog).toHaveBeenCalledOnce();
      });
      picker.setInput("new draft", 9);
      selectCurrentSkill({ name: "review" });

      expect(picker.text()).toBe("new draft");
    } finally {
      picker.dispose();
    }
  });
});

interface PickerOptions {
  input?: string;
  cursorOffset?: number;
  focused?: boolean;
  dialogOpen?: boolean;
  skills?: Promise<{ data: Skill[] }>;
}

async function createPicker(options: PickerOptions = {}) {
  let input = options.input ?? "";
  let cursorOffset = options.cursorOffset ?? 0;
  const editorState = {
    get plainText() {
      return input;
    },
    get logicalCursor() {
      return { row: 0, col: cursorOffset, offset: cursorOffset };
    },
    get cursorOffset() {
      return cursorOffset;
    },
    set cursorOffset(value: number) {
      cursorOffset = value;
    },
    onContentChange: undefined,
    deleteRange(_startRow: number, startCol: number, _endRow: number, endCol: number) {
      input = input.slice(0, startCol) + input.slice(endCol);
      cursorOffset = startCol;
    },
    insertText(value: string) {
      input = input.slice(0, cursorOffset) + value + input.slice(cursorOffset);
      cursorOffset += value.length;
    },
  };
  const editor = editorState as unknown as PromptEditor;
  const loadSkills = vi
    .fn()
    .mockReturnValue(options.skills ?? Promise.resolve({ data: [] }));
  const api = {
    renderer: { currentFocusedEditor: editor },
    ui: {
      dialog: {
        open: options.dialogOpen ?? false,
        clear: vi.fn(),
      },
    },
    client: { app: { skills: loadSkills } },
  } as unknown as TuiPluginApi;
  const prompt = {
    focused: options.focused ?? true,
    current: { input, parts: [] },
    focus: vi.fn(),
  } as unknown as TuiPromptRef;
  let dispose = () => {};
  const picker = createRoot((rootDispose) => {
    dispose = rootDispose;
    return usePromptSkillPicker(api, undefined);
  });
  picker.handlePromptRef(prompt);
  await Promise.resolve();

  const setInput = (value: string, offset: number) => {
    input = value;
    cursorOffset = offset;
  };

  return {
    ...picker,
    dispose,
    loadSkills,
    text: () => input,
    setInput,
    changeInput(value: string, offset: number) {
      setInput(value, offset);
      editor.onContentChange?.({} as never);
    },
  };
}

async function selectSkill(skill: Skill) {
  await vi.waitFor(() => {
    expect(mocks.showSkillDialog).toHaveBeenCalledOnce();
  });
  selectCurrentSkill(skill);
}

function selectCurrentSkill(skill: Skill) {
  const onSelect = mocks.showSkillDialog.mock.calls[0]?.[2];
  expect(onSelect).toBeTypeOf("function");
  onSelect(skill);
}
