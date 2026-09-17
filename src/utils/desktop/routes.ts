const applicationRoutes: Record<string, string | undefined> = {
  "/": "main",
  "/projects": "projects",
  "/blog": "writing",
  "/more": "cv",
};

export function getRouteWindow(path: string) {
  const route = path.replace(/\/$/, "") || "/";
  const application = applicationRoutes[route];
  if (application) {
    return application;
  }
  if (route.startsWith("/blog/")) {
    return `article-${route.slice("/blog/".length)}`;
  }
}

export function getInitialWindow(path: string) {
  return getRouteWindow(path) ?? "main";
}
