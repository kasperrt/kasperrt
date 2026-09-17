// Inlined in <head>: set the time-dependent color before the first paint.
(() => {
  const pink = [232, 184, 209];
  const purple = [187, 168, 222];
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let timer;
  let animation;
  function minuteOfDay(now) {
    const parts = clock.formatToParts(now);
    const value = (type) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    return value("hour") * 60 + value("minute") + (value("second") + now.getMilliseconds() / 1000) / 60;
  }
  function color(minute) {
    const blend = (1 - Math.cos((minute / 1440) * Math.PI * 2)) / 2;
    return `rgb(${pink.map((channel, index) => (channel + (purple[index] - channel) * blend).toFixed(4)).join(" ")})`;
  }
  function continueCycle() {
    clearTimeout(timer);
    const now = new Date();
    const remaining = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    const style = document.documentElement.style;
    style.setProperty("--desktop-transition", `background-color ${remaining}ms linear`);
    style.setProperty("--desktop", color(Math.floor(minuteOfDay(now)) + 1));
    timer = setTimeout(continueCycle, remaining);
  }
  function resumeCycle() {
    cancelAnimationFrame(animation);
    animation = requestAnimationFrame(() => {
      // Resolve the current color before setting the next transition target.
      getComputedStyle(document.documentElement).backgroundColor;
      continueCycle();
    });
  }
  const root = document.documentElement;
  root.classList.add("desktop-starting");
  root.style.setProperty("--desktop-transition", "none");
  root.style.setProperty("--desktop", color(minuteOfDay(new Date())));
  resumeCycle();
  document.addEventListener("astro:before-swap", (event) => {
    clearTimeout(timer);
    cancelAnimationFrame(animation);
    const incoming = event.newDocument.documentElement;
    incoming.classList.add("desktop-starting");
    incoming.style.setProperty("--desktop", getComputedStyle(document.documentElement).backgroundColor);
    incoming.style.setProperty("--desktop-transition", "none");
  });
  document.addEventListener("astro:after-swap", resumeCycle);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(timer);
      return;
    }
    resumeCycle();
  });
  window.addEventListener("pageshow", resumeCycle);
})();
