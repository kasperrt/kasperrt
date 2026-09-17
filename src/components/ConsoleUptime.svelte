<script lang="ts">
import { onMount } from "svelte";

import { formatAliveDuration } from "~/utils/uptime";

let display = "";

function updateDisplay() {
  display = formatAliveDuration(new Date());
}

onMount(() => {
  updateDisplay();
  const interval = setInterval(updateDisplay, 1000);

  return () => {
    clearInterval(interval);
  };
});
</script>

<span>{display}</span>
