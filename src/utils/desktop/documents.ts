import { isRecord } from "./state";
import { safeWrap } from "../wrap";
import type { initDesktop } from "./windows";
import { easterEggIdeas } from "../../data/desktop-files";
import { createWindow } from "./window-content";

interface TextFile {
  id: string;
  name: string;
  content: string;
}
const storageKey = "kasperrt-text-files";
function isTextFile(value: unknown): value is TextFile {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    /^file-[\da-f-]{36}$/.test(value.id) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    value.name.length <= 200 &&
    typeof value.content === "string"
  );
}
type Desktop = ReturnType<typeof initDesktop>;

function readFiles(): TextFile[] | Error {
  const [readError, stored] = safeWrap(() => localStorage.getItem(storageKey));
  if (readError) {
    return new Error("Could not read desktop files.", { cause: readError });
  }
  if (!stored) {
    return [{ ...easterEggIdeas }];
  }
  const [parseError, value] = safeWrap<Error, unknown>(() => JSON.parse(stored));
  if (parseError) {
    return new Error("Could not parse desktop files.", { cause: parseError });
  }
  if (!Array.isArray(value) || !value.every(isTextFile)) {
    return new Error("The saved desktop files are invalid.");
  }
  const files = value.map(({ id, name, content }) => ({ id, name, content }));
  if (!files.some((file) => file.id === easterEggIdeas.id)) {
    files.push({ ...easterEggIdeas });
  }
  return files;
}

function saveFile(file: TextFile) {
  const files = readFiles();
  if (files instanceof Error) {
    return new Error("Could not load existing files before saving.", { cause: files });
  }
  const updated = files.filter((saved) => saved.id !== file.id);
  updated.push(file);
  const [error] = safeWrap(() => localStorage.setItem(storageKey, JSON.stringify(updated)));
  if (error) {
    return new Error("Could not save the text file.", { cause: error });
  }
  return null;
}

export function initDocuments(signal: AbortSignal, desktop: Desktop) {
  const editorTemplate = document.querySelector<HTMLTemplateElement>("[data-text-file-editor-template]");
  const iconTemplate = document.querySelector<HTMLTemplateElement>("[data-text-file-icon-template]");
  const shortcuts = document.querySelector(".desktop-shortcuts");
  const form = document.querySelector<HTMLFormElement>("[data-new-file-form]");
  const nameInput = form?.querySelector<HTMLInputElement>("input");
  const errorMessage = form?.querySelector<HTMLElement>("[data-new-file-error]");
  if (!editorTemplate || !iconTemplate || !shortcuts || !form || !nameInput || !errorMessage) {
    return;
  }

  const renderFile = (file: TextFile) => {
    const element =
      document.querySelector<HTMLElement>(`[data-window="${file.id}"]`) ?? createWindow(file.id, file.name);
    if (element instanceof Error) {
      return new Error("Could not create the text file window.", { cause: element });
    }
    const icon =
      document.querySelector<HTMLElement>(`[data-desktop-icon="${file.id}"]`) ??
      iconTemplate.content.firstElementChild?.cloneNode(true);
    if (!(element instanceof HTMLElement) || !(icon instanceof HTMLElement)) {
      return new Error("Could not create the text file window.");
    }
    const editor = editorTemplate.content.firstElementChild?.cloneNode(true);
    const workspace = element.querySelector(".workspace-content");
    const title = element.querySelector<HTMLElement>(".window-title");
    const status = element.querySelector<HTMLElement>(".window-status > span");
    const iconLabel = icon.querySelector<HTMLElement>("span");
    if (!(editor instanceof HTMLTextAreaElement) || !workspace || !title || !status || !iconLabel) {
      return new Error("The text file window is missing its controls.");
    }
    workspace.replaceChildren(editor);
    element.dataset.saveable = "";
    element.classList.add("text-file-window");
    title.textContent = file.name;
    editor.setAttribute("aria-label", `${file.name} contents`);
    editor.value = file.content;
    status.textContent = "Saved";
    icon.dataset.desktopIcon = file.id;
    icon.dataset.open = file.id;
    iconLabel.textContent = file.name;
    icon.title = file.name;
    if (!element.isConnected) {
      document.body.append(element);
    }
    if (!icon.isConnected) {
      shortcuts.append(icon);
    }
    desktop.registerWindow(element);
    desktop.registerIcon(icon);
    editor.addEventListener(
      "input",
      () => {
        title.textContent = file.name;
        status.textContent = "Saved";
        if (editor.value !== file.content) {
          title.textContent = `${file.name} *`;
          status.textContent = "Unsaved changes";
        }
      },
      { signal },
    );
    element.addEventListener(
      "desktop:save-file",
      () => {
        const content = editor.value;
        const error = saveFile({ ...file, content });
        if (error) {
          console.warn(error);
          status.textContent = "Couldn't save. Your text is still here; try again.";
          return;
        }
        file.content = content;
        title.textContent = file.name;
        status.textContent = "Saved";
      },
      { signal },
    );
    return null;
  };

  const savedFiles = readFiles();
  if (savedFiles instanceof Error) {
    console.warn(savedFiles);
    errorMessage.textContent = "Couldn't restore saved files. Reload before creating a new file.";
    form.addEventListener("submit", (event) => event.preventDefault(), { signal });
    return;
  }
  for (const file of savedFiles) {
    const error = renderFile(file);
    if (error) {
      console.warn(error);
    }
  }
  document.addEventListener(
    "desktop:cleanup",
    () => {
      const [error] = safeWrap(() => localStorage.removeItem(storageKey));
      if (error) {
        console.warn(new Error("Could not remove desktop files", { cause: error }));
        return;
      }
      desktop.removeTextFiles();
      const renderError = renderFile({ ...easterEggIdeas });
      if (renderError) {
        console.warn(renderError);
      }
    },
    { signal },
  );
  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      if (!name) {
        errorMessage.textContent = "Give the file a name.";
        nameInput.focus();
        return;
      }
      const [idError, id] = safeWrap(() => crypto.randomUUID());
      if (idError) {
        console.warn(new Error("Could not create a file ID.", { cause: idError }));
        errorMessage.textContent = "Couldn't create the file. Try again.";
        return;
      }
      const file: TextFile = { id: `file-${id}`, name, content: "" };
      const saveError = saveFile(file);
      if (saveError) {
        console.warn(saveError);
        errorMessage.textContent = "Couldn't save a new file in this browser. Try again.";
        return;
      }
      const renderError = renderFile(file);
      if (renderError) {
        console.warn(renderError);
        errorMessage.textContent = "The file was saved, but couldn't be opened. Reload to try again.";
        return;
      }
      errorMessage.textContent = "";
      nameInput.value = "Untitled.txt";
      desktop.close("new-file");
      void desktop.open(file.id).then(() => {
        document.querySelector<HTMLTextAreaElement>(`[data-window="${file.id}"] [data-file-editor]`)?.focus();
      });
    },
    { signal },
  );
}
