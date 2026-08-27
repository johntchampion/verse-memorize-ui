interface Props {
  streak: number;
  /** True while today's session still has exercises to do. */
  pendingToday: boolean;
}

const WEEK = 7;

/**
 * The amber streak card: count in a circle plus a week of dots. The last dot
 * renders dashed while today's session is still pending — one more square to
 * earn.
 */
export default function StreakBadge({ streak, pendingToday }: Props) {
  const filled = Math.min(streak, pendingToday ? WEEK - 1 : WEEK);
  const dots = Array.from({ length: WEEK }, (_, i) => {
    if (i < filled) return 'week-dot week-dot-filled';
    if (i === filled && pendingToday) return 'week-dot week-dot-pending';
    return 'week-dot';
  });

  return (
    <div className="streak-card">
      <div className="streak-circle">
        <span className="streak-circle-count">{streak}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="streak-label">
          {streak > 0 ? `${streak}-day streak` : 'No streak yet — today counts'}
        </div>
        <div className="week-dots" aria-hidden="true">
          {dots.map((className, i) => (
            <span key={i} className={className} />
          ))}
        </div>
      </div>
    </div>
  );
}
