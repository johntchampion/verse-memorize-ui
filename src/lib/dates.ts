/**
 * Day boundaries, mirroring the API's `lib/dates.ts`.
 *
 * Every "same day" question in the progression model — whether a correct run
 * is still alive, whether the one-tier-change-per-day cap is spent — is a
 * calendar-day question in the *user's* timezone, not the browser's. Comparing
 * against `new Date()` locally would disagree with the server for anyone whose
 * device zone differs from their profile zone.
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
