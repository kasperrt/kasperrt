import { safeWrap, safeWrapAsync } from "../wrap";

interface ArticleRequest {
  source: string;
  windowId: string;
  signal: AbortSignal;
}

async function fetchArticle({ source, windowId, signal }: ArticleRequest): Promise<Element | Error> {
  // Static pages live in directories; avoid the host's trailing-slash redirect.
  const url = `${source.replace(/\/$/, "")}/`;
  const [fetchError, response] = await safeWrapAsync<Error, Response>(() => fetch(url, { signal }));
  if (fetchError) {
    return new Error(`Could not fetch post ${source}`, { cause: fetchError });
  }
  if (!response.ok) {
    return new Error(`Could not load post ${source}: HTTP ${response.status}`);
  }
  const [bodyError, html] = await safeWrapAsync<Error, string>(() => response.text());
  if (bodyError) {
    return new Error(`Could not read post ${source}`, { cause: bodyError });
  }
  const [parseError, page] = safeWrap(() => new DOMParser().parseFromString(html, "text/html"));
  if (parseError) {
    return new Error(`Could not parse post ${source}`, { cause: parseError });
  }
  const article = page.querySelector(`[data-window="${CSS.escape(windowId)}"] .article-page`);
  if (!article) {
    return new Error(`The content for post ${source} was missing`);
  }
  return article;
}

function showArticleError(content: HTMLElement, windowId: string) {
  const message = document.createElement("p");
  message.className = "article-loading";
  message.textContent = "This post could not be loaded. ";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "desktop-button";
  retry.dataset.open = windowId;
  retry.textContent = "Try again";
  message.append(retry);
  content.replaceChildren(message);
}

export async function loadArticle(element: HTMLElement, signal: AbortSignal) {
  const source = element.dataset.articleSrc;
  const windowId = element.dataset.window;
  const content = element.querySelector<HTMLElement>(".workspace-content");
  if (!source || !windowId || !content || content.querySelector(".article-page") || element.dataset.articleLoading) {
    return;
  }
  element.dataset.articleLoading = "true";
  const article = await fetchArticle({ source, windowId, signal });
  delete element.dataset.articleLoading;
  if (signal.aborted) {
    return;
  }
  if (article instanceof Error) {
    console.error(article);
    showArticleError(content, windowId);
    return;
  }
  content.replaceChildren(article);
}
