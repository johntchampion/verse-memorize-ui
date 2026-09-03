export default function NextButton({
  isLast,
  pending,
  disabled,
  onClick,
  style,
}: {
  isLast: boolean
  pending: boolean
  disabled?: boolean
  onClick: () => void
  style?: React.CSSProperties
}) {
  return (
    <button
      type='button'
      className='btn'
      style={style}
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={onClick}
    >
      {pending && <span className='btn-spinner' aria-hidden='true' />}
      {isLast ? 'Finish session →' : 'Next verse →'}
    </button>
  )
}
