const TIME_ZONE = "Europe/Rome";

export function dayInRome(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

function romeOffsetMinutes(date: Date): number {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "longOffset" })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

export function startOfDayInRome(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const utcMidnight = new Date(Date.UTC(year, month - 1, date));
  return new Date(utcMidnight.getTime() - romeOffsetMinutes(utcMidnight) * 60_000).toISOString();
}
