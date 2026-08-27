/** Session-level progress: position in today's queue. */
export default function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label="Session progress"
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
