<script lang="ts">
import { onMount } from "svelte";
import ConsoleDom from "./ConsoleDom.svelte";
import ConsoleCrt from "./ConsoleCrt.svelte";

let useCrt = true;

function canUseWebgl(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

onMount(() => {
  useCrt = canUseWebgl();
});
</script>

{#if useCrt}
  <ConsoleCrt on:fail={() => (useCrt = false)} />
{:else}
  <ConsoleDom />
{/if}

