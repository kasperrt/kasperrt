/** Report failed static assets without allowing a successful production build. */
export function buildErrorResponse(error: Error) {
  console.error(error);
  process.exitCode = 1;
  return new Response("Could not generate this asset.", { status: 500 });
}
