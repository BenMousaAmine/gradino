const TIME_ZONE = "Europe/Rome";

export function formatDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat("it-IT", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, date)));
  return `${weekday} ${String(date).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

export function shortDay(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}/${month}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}
