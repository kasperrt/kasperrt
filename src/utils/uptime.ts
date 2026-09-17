const birthYear = 1993;
const birthMonth = 8;
const birthDay = 29;

/** Calendar uptime from 29 August 1993, in the operator's Oslo time zone. */
export function formatAliveDuration(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (name: string) => Number(parts.find((part) => part.type === name)?.value ?? 0);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const birthdayPassed = month > birthMonth || (month === birthMonth && day >= birthDay);
  let lastBirthdayYear = year;
  if (!birthdayPassed) {
    lastBirthdayYear -= 1;
  }
  const years = lastBirthdayYear - birthYear;
  const days = Math.floor(
    (Date.UTC(year, month - 1, day) - Date.UTC(lastBirthdayYear, birthMonth - 1, birthDay)) / 86400000,
  );
  const time = [value("hour"), value("minute"), value("second")].map((part) => String(part).padStart(2, "0")).join(":");
  return `${years}y ${days}d ${time}`;
}
