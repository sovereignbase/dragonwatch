import type { DropCommit } from '../../.types/types.js'

export function dropDraggedOnTarget(
  dragged: HTMLElement,
  target: HTMLElement,
  commit: DropCommit,
  animationDuration: number
): void {
  const x = Number(dragged.dataset.x ?? 0)
  const y = Number(dragged.dataset.y ?? 0)
  const from = dragged.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const next = `translate(${x + to.left - from.left}px, ${
    y + to.top - from.top
  }px)`
  const animation = dragged.animate(
    [{ transform: dragged.style.transform || 'none' }, { transform: next }],
    { duration: animationDuration, easing: 'ease' }
  )
  dragged.style.transform = next
  void animation.finished.finally(() => {
    void commit()
    delete dragged.dataset.x
    delete dragged.dataset.y
    dragged.style.transform = ''
  })
}
