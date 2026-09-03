export default function WordTile({
  label,
  isSpent,
  isWrong,
  disabled,
  onTap,
}: {
  label: string
  isSpent: boolean
  isWrong: boolean
  disabled: boolean
  onTap: () => void
}) {
  const state = isSpent ? ' tile-used' : isWrong ? ' tile-wrong' : ''
  return (
    <button
      type='button'
      className={`tile tile-in${state}`}
      disabled={disabled}
      onClick={onTap}
    >
      {label}
    </button>
  )
}
