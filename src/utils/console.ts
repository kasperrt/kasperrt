import { safeWrapAsync } from "~/utils/wrap";

let mounted = false;

async function mountConsole() {
  if (mounted) {
    return;
  }

  mounted = true;

  const [err, res] = await safeWrapAsync(() => Promise.all([import("svelte"), import("../components/Console.svelte")]));

  if (err) {
    mounted = false;
    return;
  }

  const [{ mount }, { default: Console }] = res;
  mount(Console, { target: document.body });
}

export function console() {
  const compare = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
    "Enter",
  ];

  let c = [];

  async function check(e: KeyboardEvent) {
    if (e.key !== compare[c.length]) {
      c = [];
      return;
    }

    c.push(e.key);

    if (compare.length !== c.length) {
      return;
    }

    window.removeEventListener("keydown", check);
    await mountConsole();
  }

  window.addEventListener("keydown", check);
}
