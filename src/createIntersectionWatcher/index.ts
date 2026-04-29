import { intersects } from '../.helpers/index.js'

export type CSSSelector = string

export function createIntersectionWatcher(
  classNameToWatch: CSSSelector,
  onIntersection: (dragged: HTMLElement, watcher: HTMLElement) => void
): HTMLDivElement {
  const watcher = document.createElement('div')
  watcher.classList.add(`${classNameToWatch}-watcher`)
  watcher.addEventListener('pointerover', () => {
    const maybe: HTMLElement | null = watcher.closest('*')
    if (
      maybe &&
      maybe.classList.contains(classNameToWatch) &&
      intersects(maybe, watcher)
    )
      onIntersection(maybe, watcher)
  })
  return watcher
}
