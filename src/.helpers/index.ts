export function intersects(a: HTMLElement, b: HTMLElement): boolean {
  const ar = a.getBoundingClientRect()
  const br = b.getBoundingClientRect()

  return !(
    ar.right < br.left ||
    ar.left > br.right ||
    ar.bottom < br.top ||
    ar.top > br.bottom
  )
}
