<script lang="ts">
  import { onMount } from "svelte";
  import ConsoleDom from "./ConsoleDom.svelte";
  import ConsoleCrt from "./ConsoleCrt.svelte";

  import { safeWrap } from "~/utils/wrap";

  let useCrt = true;

  function canUseWebgl(): boolean {
    if (typeof window === "undefined") {
      return false;
    }
    const [error, canvas] = safeWrap(() => document.createElement("canvas"));
    if (error) return false;

    const [glError, ctx] = safeWrap(
      () => canvas.getContext("webgl2") || canvas.getContext("webgl")
    );
    return !glError && Boolean(ctx);
  }

  onMount(() => {
    useCrt = canUseWebgl();
  });
</script>

{#if useCrt}
  <ConsoleCrt onfail={() => (useCrt = false)} />
{:else}
  <ConsoleDom />
{/if}
