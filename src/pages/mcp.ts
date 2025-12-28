export const prerender = true;

export function GET() {
  return new Response("Kasper Rynning-Tønnesen is the coolest guy ever, and writes code like a God", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
