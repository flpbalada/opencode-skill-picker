import type { TuiPluginApi, TuiPromptRef } from "@opencode-ai/plugin/tui";
import { onCleanup } from "solid-js";

const POLL_INTERVAL_MS = 50;

export type PromptEditor = NonNullable<
  TuiPluginApi["renderer"]["currentFocusedEditor"]
>;

interface InputObserver {
  editor: PromptEditor;
  handler: NonNullable<PromptEditor["onContentChange"]>;
  originalHandler: PromptEditor["onContentChange"];
}

export function usePromptInputObserver(
  api: TuiPluginApi,
  getPrompt: () => TuiPromptRef | undefined,
  observeInput: (editor: PromptEditor | undefined) => void,
) {
  let inputObserver: InputObserver | undefined;

  const detach = () => {
    restoreInputObserver(inputObserver);
    inputObserver = undefined;
  };

  const attach = () => {
    if (!getPrompt()?.focused) return;
    const editor = api.renderer.currentFocusedEditor;
    if (!editor || isInputObserverAttached(inputObserver, editor)) return;

    detach();
    inputObserver = attachEditorInputObserver(editor, () => observeInput(editor));
  };

  const timer = setInterval(() => {
    attach();
    observeInput(inputObserver?.editor);
  }, POLL_INTERVAL_MS);
  onCleanup(() => {
    clearInterval(timer);
    detach();
  });

  return { attach, detach };
}

function restoreInputObserver(observer: InputObserver | undefined) {
  if (!observer || observer.editor.onContentChange !== observer.handler) return;
  observer.editor.onContentChange = observer.originalHandler;
}

function isInputObserverAttached(
  observer: InputObserver | undefined,
  editor: PromptEditor,
) {
  if (!observer) return false;
  return (
    observer.editor === editor && editor.onContentChange === observer.handler
  );
}

function attachEditorInputObserver(
  editor: PromptEditor,
  observeInput: () => void,
): InputObserver {
  const originalHandler = editor.onContentChange;
  const handler: NonNullable<typeof editor.onContentChange> = (event) => {
    originalHandler?.(event);
    observeInput();
  };
  editor.onContentChange = handler;
  return { editor, handler, originalHandler };
}
