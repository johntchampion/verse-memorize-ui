export type TypedOutcome = 'correct' | 'incorrect' | 'shown'
export type ReferenceOutcome = 'correct' | 'incorrect' | null

const ICONS: Record<TypedOutcome, string> = {
  correct: '✓',
  shown: '👀',
  incorrect: '↺',
}

function headline(
  result: TypedOutcome,
  refResult: ReferenceOutcome,
): string {
  if (result === 'correct') {
    return refResult === 'incorrect'
      ? 'Word for word — but that reference isn’t it.'
      : 'Word for word. Kept it.'
  }
  if (result === 'shown') return 'Shown — read it through. It comes back around.'
  return 'Not quite. Read it again:'
}

/** The verse as it should have been written, and how the attempt was judged. */
export default function TypedResult({
  result,
  refResult,
  fullText,
  reference,
  passed,
}: {
  result: TypedOutcome
  refResult: ReferenceOutcome
  fullText: string
  reference: string
  passed: boolean
}) {
  return (
    <div
      className={`result-card ${passed ? 'result-correct' : 'result-incorrect'}`}
      role='status'
    >
      <p className='result-headline'>
        <span aria-hidden='true'>{ICONS[result]}</span>
        {headline(result, refResult)}
      </p>
      <p className='result-verse'>{fullText}</p>
      {refResult !== null && (
        <p className='result-reference'>
          <span aria-hidden='true'>{refResult === 'correct' ? '✓' : '✗'}</span>
          {reference}
        </p>
      )}
    </div>
  )
}
