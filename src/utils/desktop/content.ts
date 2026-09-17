import { safeWrap, safeWrapAsync } from "../wrap";

export async function fetchWindow(id: string, signal: AbortSignal): Promise<HTMLElement | Error> {
  const [fetchError, response] = await safeWrapAsync(() => fetch(`/windows/${encodeURIComponent(id)}/`, { signal }));
  if (fetchError) {
    return new Error(`Could not fetch window ${id}`, { cause: fetchError });
  }
  if (!response.ok) {
    return new Error(`Could not load window ${id}: HTTP ${response.status}`);
  }
  const [bodyError, html] = await safeWrapAsync(() => response.text());
  if (bodyError) {
    return new Error(`Could not read window ${id}`, { cause: bodyError });
  }
  const [parseError, page] = safeWrap(() => new DOMParser().parseFromString(html, "text/html"));
  if (parseError) {
    return new Error(`Could not parse window ${id}`, { cause: parseError });
  }
  const element = page.querySelector<HTMLElement>(`[data-window="${CSS.escape(id)}"]`);
  if (!element) {
    return new Error(`Window ${id} was missing from its response`);
  }
  return element;
}
