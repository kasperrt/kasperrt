<script lang="ts">
const icons: string[] = ["-", "\\", "|", "/"];
let current = $state(0);

// Lol svelte is just React now I guess
$effect(() => {
  let interval = setInterval(() => {
    if (current >= icons.length - 1) {
      current = 0;
      return;
    }

    current += 1;
  }, 100);

  return () => {
    clearInterval(interval);
  };
});
</script>

<span>{icons[current]}</span>
