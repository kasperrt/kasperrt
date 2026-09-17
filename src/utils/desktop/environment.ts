import { currentBackgroundColor, normalizeBackgroundColor, saveBackgroundColor } from "./background";

export function initEnvironmentFile(signal: AbortSignal) {
  const element = document.querySelector<HTMLElement>('[data-window="env"]');
  const form = element?.querySelector<HTMLFormElement>("[data-background-form]");
  const hex = element?.querySelector<HTMLElement>("[data-background-hex]");
  const picker = element?.querySelector<HTMLInputElement>("[data-background-picker]");
  const status = element?.querySelector<HTMLElement>(".window-status > span");
  const title = element?.querySelector<HTMLElement>(".window-title");
  if (!element || !form || !hex || !picker || !status || !title) {
    return;
  }
  let dirty = false;
  status.setAttribute("role", "status");
  const syncColor = () => {
    if (dirty || document.activeElement === picker) {
      return;
    }
    const color = document.documentElement.dataset.backgroundColor ?? currentBackgroundColor();
    hex.textContent = color;
    picker.value = color;
  };
  syncColor();
  const timer = window.setInterval(syncColor, 1000);
  signal.addEventListener("abort", () => clearInterval(timer), { once: true });
  document.addEventListener("desktop:background-change", syncColor, { signal });
  const reset = () => {
    dirty = false;
    title.textContent = ".env";
    status.textContent = ".env";
    syncColor();
  };
  document.addEventListener("desktop:cleanup", reset, { signal });
  document.addEventListener("desktop:environment-reset", reset, { signal });
  picker.addEventListener(
    "input",
    () => {
      dirty = true;
      hex.textContent = picker.value;
      title.textContent = ".env *";
      status.textContent = "Unsaved changes";
    },
    { signal },
  );
  element.addEventListener("desktop:save-file", () => form.requestSubmit(), { signal });
  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const color = normalizeBackgroundColor(picker.value);
      if (!color) {
        status.textContent = "Choose a valid background color.";
        return;
      }
      const error = saveBackgroundColor(color);
      if (error) {
        console.warn(error);
        status.textContent = "Couldn't save. Try again.";
        return;
      }
      dirty = false;
      hex.textContent = color;
      title.textContent = ".env";
      status.textContent = "Saved";
    },
    { signal },
  );
}
