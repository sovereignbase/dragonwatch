import type { DropCommit, RestoredDragStyle } from '../../.types/types.js'
import { raiseDragged } from '../raiseDragged/index.js'
import { restoreDraggedStyle } from '../restoreDraggedStyle/index.js'

function ignoreAnimationAbort(error: unknown): void {
  if (error instanceof DOMException && error.name === 'AbortError') return
  throw error
}

/**
 * Animates a dragged element to a target and commits the drop.
 *
 * @param dragged The element being dropped.
 * @param target The element that receives the drop.
 * @param commit Callback that performs the final DOM mutation.
 * @param animationDuration The duration of the drop animation, in milliseconds.
 * @param restoredStyle Inline style state to restore after the commit.
 */
export function dropDraggedOnTarget(
  dragged: HTMLElement,
  target: HTMLElement,
  commit: DropCommit,
  animationDuration: number,
  restoredStyle?: RestoredDragStyle
): void {
  const raisedStyle = raiseDragged(dragged)
  const nextRestoredStyle = restoredStyle ?? raisedStyle
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
  void animation.finished
    .finally(() => {
      void commit()
      delete dragged.dataset.x
      delete dragged.dataset.y
      void restoreDraggedStyle(dragged, {
        ...nextRestoredStyle,
        transform: '',
      })
    })
    .catch(ignoreAnimationAbort)
}
