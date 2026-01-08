<script lang="ts">
import { onMount } from "svelte";

const birthDate = new Date(1993, 7, 29, 0, 0, 0);
let display = "";

function formatAliveDuration(now: Date) {
  const currentBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const hasHadBirthday = now >= currentBirthday;
  let years = now.getFullYear() - birthDate.getFullYear();
  if (!hasHadBirthday) {
    years -= 1;
  }

  let lastBirthdayYear = now.getFullYear();
  if (!hasHadBirthday) {
    lastBirthdayYear -= 1;
  }
  const lastBirthday = new Date(lastBirthdayYear, birthDate.getMonth(), birthDate.getDate());
  const diffMs = Math.max(0, now.getTime() - lastBirthday.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");

  return `${years}y ${days}d ${time}`;
}

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
