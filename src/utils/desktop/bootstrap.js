// Inlined in <head> with its storage wrapper, before the first paint.
/** @param {typeof import("../wrap").safeWrap} safeWrap @param {string} storageKey */
export default function desktopBootstrap(safeWrap, storageKey) {
  const root = document.documentElement;
  const [storageError, savedColor] = safeWrap(() => localStorage.getItem(storageKey));
  if (storageError) {
    console.warn(new Error("Could not restore the desktop background.", { cause: storageError }));
  }
  if (savedColor && /^#[\da-f]{6}$/i.test(savedColor)) {
    root.dataset.backgroundColor = savedColor;
  }
  const channels = [
    [232, 187],
    [184, 168],
    [209, 222],
  ];
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
    return `rgb(${channels.map(([pink, purple]) => (pink + (purple - pink) * blend).toFixed(4)).join(" ")})`;
  }
  function continueCycle() {
    clearTimeout(timer);
    if (document.documentElement.dataset.backgroundColor) {
      return;
    }
    const now = new Date();
    const remaining = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    const style = document.documentElement.style;
    style.setProperty("--desktop-transition", `background-color ${remaining}ms linear`);
    style.setProperty("--desktop", color(Math.floor(minuteOfDay(now)) + 1));
    timer = setTimeout(continueCycle, remaining);
  }
  function resumeCycle() {
    cancelAnimationFrame(animation);
    clearTimeout(timer);
    const customColor = document.documentElement.dataset.backgroundColor;
    if (customColor) {
      document.documentElement.style.setProperty("--desktop-transition", "background-color 240ms linear");
      document.documentElement.style.setProperty("--desktop", customColor);
      return;
    }
    animation = requestAnimationFrame(() => {
      // Resolve the current color before setting the next transition target.
      getComputedStyle(document.documentElement).backgroundColor;
      continueCycle();
    });
  }
  root.classList.add("desktop-starting");
  root.style.setProperty("--desktop-transition", "none");
  root.style.setProperty("--desktop", root.dataset.backgroundColor ?? color(minuteOfDay(new Date())));
  resumeCycle();
  document.addEventListener("desktop:background-change", () => {
    clearTimeout(timer);
    cancelAnimationFrame(animation);
    const style = document.documentElement.style;
    style.setProperty("--desktop-transition", "background-color 240ms linear");
    style.setProperty("--desktop", document.documentElement.dataset.backgroundColor ?? color(minuteOfDay(new Date())));
    if (!document.documentElement.dataset.backgroundColor) {
      timer = setTimeout(resumeCycle, 250);
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) {
      return;
    }
    delete document.documentElement.dataset.backgroundColor;
    if (event.newValue && /^#[\da-f]{6}$/i.test(event.newValue)) {
      document.documentElement.dataset.backgroundColor = event.newValue;
    }
    document.dispatchEvent(new Event("desktop:background-change"));
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(timer);
      return;
    }
    resumeCycle();
  });
  window.addEventListener("pageshow", resumeCycle);
}
