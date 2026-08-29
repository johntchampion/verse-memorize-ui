/**
 * The translation a verse was served in, shown beside its reference. The code
 * comes straight off the API response that carried the text, so it always
 * describes the words actually on screen — not the account preference, which
 * can differ for a response fetched before a change.
 */
export default function TranslationTag({ code }: { code: string }) {
  return (
    <span className='translation-tag' aria-label={`${code} translation`}>
      {code}
    </span>
  )
}
