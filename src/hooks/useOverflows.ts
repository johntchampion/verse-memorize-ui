import { useEffect, useState, type RefObject } from 'react'

/** Whether the element's content is taller than its box. Watches the element
    and its children rather than re-measuring per render, so a late web font
    reflowing the content past the cut-off is caught too. */
export function useOverflows(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): boolean {
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const child of el.children) observer.observe(child)
    return () => observer.disconnect()
  }, [ref, enabled])

  return overflows
}
