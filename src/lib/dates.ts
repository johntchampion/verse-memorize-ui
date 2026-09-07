/**
 * Every "same day" question in the progression model is a calendar-day
 * question in the *user's* profile timezone, not the browser's.
 */

/** `YYYY-MM-DD` for "now" as seen in `timezone`. */
export function todayInTimezone(timezone: string, now = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    // Unknown timezone on the profile — fall back to UTC, same as the server.
    return now.toISOString().slice(0, 10);
  }
}
