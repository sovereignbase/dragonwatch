import type { RestoredDragStyle } from '../../.types/types.js'
import { restoreDraggedStyle } from '../restoreDraggedStyle/index.js'

function ignoreAnimationAbort(error: unknown): void {
  if (error instanceof DOMException && error.name === 'AbortError') return
  throw error
}

/**
 * Animates a dragged element back to its starting transform.
 *
 * @param dragged The element to return.
 * @param animationDuration The duration of the return animation, in milliseconds.
 * @param restoredStyle Inline style state to restore after the animation.
 */
export function returnDraggedToStart(
  dragged: HTMLElement,
  animationDuration: number,
  restoredStyle?: RestoredDragStyle
): void {
  const nextTransform = restoredStyle?.transform || 'none'
  const animation = dragged.animate(
    [
      { transform: dragged.style.transform || 'none' },
      { transform: nextTransform },
    ],
    { duration: animationDuration, easing: 'ease' }
  )
  dragged.style.transform = nextTransform
  delete dragged.dataset.x
  delete dragged.dataset.y
  void animation.finished
    .finally(() => {
      if (!restoredStyle) {
        dragged.style.transform = ''
        return
      }
      void restoreDraggedStyle(dragged, restoredStyle)
    })
    .catch(ignoreAnimationAbort)
}
