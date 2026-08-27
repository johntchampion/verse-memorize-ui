export default function StreakBadge({ streak }: { streak: number }) {
  return (
    <div className="streak-badge">
      <span className="streak-count">{streak}</span>
      <span className="muted">day streak</span>
    </div>
  );
}
